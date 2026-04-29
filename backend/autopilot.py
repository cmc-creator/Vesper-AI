"""
autopilot.py — Vesper's Autonomous Income Engine

Runs scheduled jobs using APScheduler to generate income without user input.
All jobs call existing tools from tools_creative.py via the AI router.

Built-in job types:
  weekly_pipeline   — Full auto income pipeline (AI picks niche → creates product → Gumroad publish → social promo)
  daily_article     — Keyword research → writes SEO article → saves to Creative Suite
  weekly_keywords   — Deep keyword research for your niche, saves a report
  social_drip       — Generates 3 social posts from latest content
"""
import os
import json
import asyncio
import threading
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    HAS_APSCHEDULER = True
except ImportError:
    HAS_APSCHEDULER = False
    print("[AUTOPILOT] APScheduler not installed — autopilot disabled. Add apscheduler to requirements.txt", flush=True)

DATA_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "vesper-ai"))
_JOBS_FILE = os.path.join(DATA_DIR, "autopilot_jobs.json")
_LOG_FILE  = os.path.join(DATA_DIR, "autopilot_log.json")
_MAX_LOG   = 100

# ── Built-in job definitions ──────────────────────────────────────────────────
BUILTIN_JOBS = [
    {
        "id": "weekly_pipeline",
        "name": "Weekly Income Pipeline",
        "description": "Vesper picks a trending niche, creates a digital product, publishes it to Gumroad, and promotes it on social media — fully autonomous.",
        "schedule_label": "Every Monday at 8:00 AM UTC",
        "cron": {"day_of_week": "mon", "hour": 8, "minute": 0},
        "enabled": False,
        "type": "weekly_pipeline",
        "niche": "",
        "last_run": None,
        "last_status": None,
        "last_output": None,
    },
    {
        "id": "daily_article",
        "name": "Daily SEO Article",
        "description": "Vesper finds a trending keyword in your niche and writes a full SEO-optimised article, saved automatically to your Creative Suite.",
        "schedule_label": "Every day at 7:30 AM UTC",
        "cron": {"hour": 7, "minute": 30},
        "enabled": False,
        "type": "daily_article",
        "niche": "AI productivity",
        "last_run": None,
        "last_status": None,
        "last_output": None,
    },
    {
        "id": "weekly_keywords",
        "name": "Weekly Keyword Research",
        "description": "Deep keyword research for your niche every Sunday — keyword list saved as a knowledge report for the week ahead.",
        "schedule_label": "Every Sunday at 9:00 AM UTC",
        "cron": {"day_of_week": "sun", "hour": 9, "minute": 0},
        "enabled": False,
        "type": "weekly_keywords",
        "niche": "AI productivity",
        "last_run": None,
        "last_status": None,
        "last_output": None,
    },
    {
        "id": "social_drip",
        "name": "Daily Social Drip",
        "description": "Generates 3 high-engagement social media posts every morning from your niche, ready to copy and post.",
        "schedule_label": "Every day at 9:00 AM UTC",
        "cron": {"hour": 9, "minute": 0},
        "enabled": False,
        "type": "social_drip",
        "niche": "digital products and passive income",
        "last_run": None,
        "last_status": None,
        "last_output": None,
    },
]


# ── Storage helpers ───────────────────────────────────────────────────────────

def _load_jobs() -> list:
    try:
        if os.path.exists(_JOBS_FILE):
            with open(_JOBS_FILE, encoding="utf-8") as f:
                saved = json.load(f)
            # Merge: keep all built-ins present, add custom jobs
            builtin_ids = [j["id"] for j in BUILTIN_JOBS]
            saved_map = {j["id"]: j for j in saved}
            merged = []
            for bj in BUILTIN_JOBS:
                if bj["id"] in saved_map:
                    # Prefer saved state (has last_run etc.) but keep description/schedule from builtin
                    m = dict(bj)
                    m.update({k: v for k, v in saved_map[bj["id"]].items()
                              if k not in ("name", "description", "schedule_label", "cron", "type")})
                    merged.append(m)
                else:
                    merged.append(dict(bj))
            # Append custom jobs not in builtins
            for j in saved:
                if j["id"] not in builtin_ids:
                    merged.append(j)
            return merged
    except Exception as e:
        print(f"[AUTOPILOT] Error loading jobs: {e}", flush=True)
    return [dict(j) for j in BUILTIN_JOBS]


def _save_jobs(jobs: list):
    try:
        Path(_JOBS_FILE).parent.mkdir(parents=True, exist_ok=True)
        with open(_JOBS_FILE, "w", encoding="utf-8") as f:
            json.dump(jobs, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[AUTOPILOT] Failed to save jobs: {e}", flush=True)


def _load_log() -> list:
    try:
        if os.path.exists(_LOG_FILE):
            with open(_LOG_FILE, encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return []


def _append_log(entry: dict):
    try:
        log = _load_log()
        log.insert(0, entry)
        log = log[:_MAX_LOG]
        Path(_LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
        with open(_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(log, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[AUTOPILOT] Failed to append log: {e}", flush=True)


# ── Engine ────────────────────────────────────────────────────────────────────

class AutopilotEngine:
    def __init__(self):
        self._scheduler: Optional[object] = None
        self._ai_router = None
        self._TaskType = None
        self._lock = threading.Lock()
        self._running_jobs: set = set()

    def set_ai_router(self, ai_router, TaskType):
        self._ai_router = ai_router
        self._TaskType = TaskType

    def start(self):
        if not HAS_APSCHEDULER:
            print("[AUTOPILOT] APScheduler unavailable — skipping scheduler startup", flush=True)
            return
        if self._scheduler is not None:
            return
        try:
            self._scheduler = BackgroundScheduler(timezone="UTC")
            self._scheduler.start()
            self._reschedule_all()
            enabled = sum(1 for j in _load_jobs() if j.get("enabled"))
            print(f"[AUTOPILOT] Scheduler started — {enabled} active job(s)", flush=True)
        except Exception as e:
            print(f"[AUTOPILOT] Failed to start scheduler: {e}", flush=True)

    def stop(self):
        if self._scheduler:
            try:
                self._scheduler.shutdown(wait=False)
            except Exception:
                pass
            self._scheduler = None

    def _reschedule_all(self):
        if not self._scheduler:
            return
        try:
            self._scheduler.remove_all_jobs()
        except Exception:
            pass
        jobs = _load_jobs()
        for job in jobs:
            if job.get("enabled"):
                self._schedule_job(job)

    def _schedule_job(self, job: dict):
        if not self._scheduler:
            return
        cron = job.get("cron", {})
        try:
            trigger = CronTrigger(**cron, timezone="UTC")
            self._scheduler.add_job(
                self._run_job_sync,
                trigger=trigger,
                id=job["id"],
                args=[job["id"]],
                replace_existing=True,
                misfire_grace_time=3600,
            )
        except Exception as e:
            print(f"[AUTOPILOT] Failed to schedule job '{job['id']}': {e}", flush=True)

    def _run_job_sync(self, job_id: str):
        """Sync wrapper for async job runner — called by APScheduler's thread pool."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(self._run_job(job_id))
        finally:
            loop.close()
            asyncio.set_event_loop(None)

    async def _run_job(self, job_id: str):
        with self._lock:
            if job_id in self._running_jobs:
                print(f"[AUTOPILOT] Job '{job_id}' already running — skipping", flush=True)
                return
            self._running_jobs.add(job_id)

        jobs = _load_jobs()
        job = next((j for j in jobs if j["id"] == job_id), None)
        if not job:
            self._running_jobs.discard(job_id)
            return

        job_type = job.get("type", job_id)
        started = datetime.now(timezone.utc).isoformat()
        print(f"[AUTOPILOT] ▶ Starting job: {job.get('name', job_id)} ({job_type})", flush=True)

        result = {"success": False, "output": "Job did not execute"}
        try:
            result = await self._execute_job_type(job_type, job)
        except Exception as e:
            result = {"success": False, "output": f"Unhandled error: {e}", "traceback": traceback.format_exc()}
        finally:
            self._running_jobs.discard(job_id)

        ended = datetime.now(timezone.utc).isoformat()

        # Update job record
        with self._lock:
            jobs = _load_jobs()
            for j in jobs:
                if j["id"] == job_id:
                    j["last_run"] = ended
                    j["last_status"] = "ok" if result.get("success") else "error"
                    j["last_output"] = str(result.get("output", ""))[:400]
                    break
            _save_jobs(jobs)

        # Append to run log
        _append_log({
            "job_id": job_id,
            "job_name": job.get("name", job_id),
            "job_type": job_type,
            "started": started,
            "ended": ended,
            "success": result.get("success", False),
            "output": str(result.get("output", ""))[:600],
        })

        status = "✓ OK" if result.get("success") else "✗ ERROR"
        print(f"[AUTOPILOT] {status} Job '{job_id}' finished", flush=True)

    # ── Job executors ──────────────────────────────────────────────────────────

    async def _execute_job_type(self, job_type: str, job: dict) -> dict:
        if not self._ai_router:
            return {
                "success": False,
                "output": "No AI provider available. Add an API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY) to .env to enable autopilot.",
            }

        dispatch = {
            "weekly_pipeline": self._job_weekly_pipeline,
            "daily_article":   self._job_daily_article,
            "weekly_keywords": self._job_weekly_keywords,
            "social_drip":     self._job_social_drip,
        }
        handler = dispatch.get(job_type)
        if handler:
            return await handler(job)
        return {"success": False, "output": f"Unknown job type: {job_type}"}

    async def _job_weekly_pipeline(self, job: dict) -> dict:
        try:
            from tools_creative import auto_income_pipeline
        except ImportError:
            try:
                from backend.tools_creative import auto_income_pipeline
            except ImportError as e:
                return {"success": False, "output": f"Cannot import tools_creative: {e}"}

        niche = job.get("niche", "")
        result = await auto_income_pipeline(
            {"action": "run", "niche": niche, "sell": True, "promote": True, "notify": False},
            ai_router=self._ai_router,
            TaskType=self._TaskType,
        )
        steps = result.get("steps_completed", [])
        errors = result.get("errors", [])
        gumroad_url = result.get("gumroad_url", "")

        output_parts = steps if steps else ["Pipeline ran (no steps recorded)"]
        if gumroad_url:
            output_parts.append(f"🛒 Gumroad listing: {gumroad_url}")
        if errors:
            output_parts.append(f"⚠ Errors: {'; '.join(str(e) for e in errors)}")

        output = "\n".join(output_parts)
        return {"success": len(errors) == 0, "output": output}

    async def _job_daily_article(self, job: dict) -> dict:
        try:
            from tools_creative import keyword_research, write_seo_article
        except ImportError:
            try:
                from backend.tools_creative import keyword_research, write_seo_article
            except ImportError as e:
                return {"success": False, "output": f"Cannot import tools_creative: {e}"}

        niche = job.get("niche", "AI productivity")

        # Step 1: find the best keyword
        kw_result = await keyword_research(
            {"niche": niche, "count": 5},
            ai_router=self._ai_router,
            TaskType=self._TaskType,
        )
        keywords = kw_result.get("keywords", [])
        if keywords:
            first = keywords[0]
            primary_kw = first["keyword"] if isinstance(first, dict) else str(first)
        else:
            primary_kw = niche

        # Step 2: write the article
        article_result = await write_seo_article(
            {"keyword": primary_kw, "word_count": 1200, "tone": "expert", "save": True},
            ai_router=self._ai_router,
            TaskType=self._TaskType,
        )
        title = article_result.get("title", primary_kw)
        word_count = article_result.get("word_count", 0)
        output = f"Written: \"{title}\" — {word_count} words · keyword: {primary_kw}"
        return {"success": True, "output": output}

    async def _job_weekly_keywords(self, job: dict) -> dict:
        try:
            from tools_creative import keyword_research
        except ImportError:
            try:
                from backend.tools_creative import keyword_research
            except ImportError as e:
                return {"success": False, "output": f"Cannot import tools_creative: {e}"}

        niche = job.get("niche", "AI productivity")
        result = await keyword_research(
            {"niche": niche, "count": 20, "include_difficulty": True},
            ai_router=self._ai_router,
            TaskType=self._TaskType,
        )
        keywords = result.get("keywords", [])
        top3 = keywords[:3]
        top3_str = ", ".join(
            k["keyword"] if isinstance(k, dict) else str(k) for k in top3
        ) if top3 else "(none)"
        output = f"Found {len(keywords)} keywords for '{niche}' · Top: {top3_str}"
        return {"success": True, "output": output}

    async def _job_social_drip(self, job: dict) -> dict:
        niche = job.get("niche", "digital products and passive income")

        # Try social_scheduler tool first
        try:
            from tools_creative import social_scheduler
            result = await social_scheduler(
                {"topic": niche, "count": 3, "platforms": ["twitter", "linkedin"], "action": "generate"},
                ai_router=self._ai_router,
                TaskType=self._TaskType,
            )
            posts = result.get("posts", [])
            if posts:
                output = f"Generated {len(posts)} social posts for '{niche}'"
                return {"success": True, "output": output, "posts": posts}
        except Exception:
            pass

        # Fallback: generate directly via AI
        try:
            gen = await self._ai_router.chat(
                messages=[{
                    "role": "user",
                    "content": (
                        f"Generate 3 high-engagement social media posts about: {niche}. "
                        "Make them compelling, value-packed, and action-oriented. "
                        "Format as: 1. [post] 2. [post] 3. [post]"
                    ),
                }],
                task_type=self._TaskType,
            )
            content = gen.get("content", "") if isinstance(gen, dict) else str(gen)
            output = f"Generated 3 social posts for '{niche}': {content[:200]}..."
            return {"success": True, "output": output}
        except Exception as e:
            return {"success": False, "output": f"Social drip error: {e}"}

    # ── Public API ─────────────────────────────────────────────────────────────

    def list_jobs(self) -> list:
        return _load_jobs()

    def get_job(self, job_id: str) -> Optional[dict]:
        return next((j for j in _load_jobs() if j["id"] == job_id), None)

    def update_job(self, job_id: str, updates: dict) -> dict:
        # Disallow overwriting fixed fields
        for key in ("id", "type", "cron"):
            updates.pop(key, None)
        with self._lock:
            jobs = _load_jobs()
            job = next((j for j in jobs if j["id"] == job_id), None)
            if not job:
                return {"error": f"Job '{job_id}' not found"}
            job.update(updates)
            _save_jobs(jobs)
            self._reschedule_all()
        return job

    def delete_job(self, job_id: str) -> dict:
        builtin_ids = {j["id"] for j in BUILTIN_JOBS}
        if job_id in builtin_ids:
            return {"error": "Cannot delete built-in jobs — disable them instead."}
        with self._lock:
            jobs = _load_jobs()
            before = len(jobs)
            jobs = [j for j in jobs if j["id"] != job_id]
            if len(jobs) == before:
                return {"error": f"Job '{job_id}' not found"}
            _save_jobs(jobs)
            if self._scheduler:
                try:
                    self._scheduler.remove_job(job_id)
                except Exception:
                    pass
        return {"success": True}

    def run_now(self, job_id: str) -> dict:
        """Kick off a job immediately in a background thread. Returns immediately."""
        job = self.get_job(job_id)
        if not job:
            return {"error": f"Job '{job_id}' not found"}
        if job_id in self._running_jobs:
            return {"error": f"Job '{job_id}' is already running"}
        threading.Thread(
            target=self._run_job_sync,
            args=[job_id],
            daemon=True,
            name=f"AutopilotRun-{job_id}",
        ).start()
        return {"success": True, "message": f"Job '{job.get('name', job_id)}' started in the background"}

    def get_log(self, limit: int = 50) -> list:
        return _load_log()[:limit]

    def is_job_running(self, job_id: str) -> bool:
        return job_id in self._running_jobs

    def status(self) -> dict:
        jobs = _load_jobs()
        enabled = [j for j in jobs if j.get("enabled")]
        return {
            "scheduler_running": self._scheduler is not None and HAS_APSCHEDULER,
            "has_apscheduler": HAS_APSCHEDULER,
            "total_jobs": len(jobs),
            "enabled_jobs": len(enabled),
            "running_now": list(self._running_jobs),
        }


# ── Global singleton ──────────────────────────────────────────────────────────
engine = AutopilotEngine()
