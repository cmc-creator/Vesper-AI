"""
Vesper RAG (Retrieval Augmented Generation) Engine
Pure Python — no vector DB, no numpy. Runs on any machine.

Scoring: TF-IDF inspired keyword overlap + recency decay + category boosting
Context budget: ~2000 tokens injected into system prompt per request
"""

import os
import json
import re
import math
import datetime
from typing import List, Dict, Tuple, Optional

# --- Paths ---
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "vesper-ai")
MEMORY_DIR = os.path.join(DATA_DIR, "memory")
KNOWLEDGE_DIR = os.path.join(DATA_DIR, "knowledge")
IDENTITY_DIR = os.path.join(DATA_DIR, "vesper_identity")

# Stopwords to filter from keyword extraction
_STOPWORDS = {
    "i","me","my","we","you","your","she","he","it","they","them","their","is","are","was",
    "were","be","been","being","have","has","had","do","does","did","will","would","could",
    "should","may","might","must","shall","can","a","an","the","and","or","but","in","on",
    "at","to","for","of","with","by","from","up","about","into","after","before","that",
    "this","these","those","what","when","where","who","how","why","which","if","as","so",
    "then","than","also","just","out","no","not","re","ve","ll","s","t","d","m","okay","ok",
    "yeah","yes","hey","hi","cc","vesper","like","want","need","get","go","tell","know",
    "think","feel","make","use","see","look","say","thing","things","some","any","all","more"
}


def _tokenize(text: str) -> List[str]:
    """Lowercase, strip punctuation, split, remove stopwords, min length 3"""
    words = re.findall(r"[a-z]{3,}", text.lower())
    return [w for w in words if w not in _STOPWORDS]


def _score(query_tokens: List[str], doc_text: str, recency_days: float = 0, category_boost: float = 1.0) -> float:
    """Score a document against query tokens. Higher = more relevant."""
    if not query_tokens or not doc_text:
        return 0.0
    doc_tokens = _tokenize(doc_text)
    if not doc_tokens:
        return 0.0

    # TF-IDF inspired overlap: count matches weighted by term frequency in query
    doc_freq: Dict[str, int] = {}
    for t in doc_tokens:
        doc_freq[t] = doc_freq.get(t, 0) + 1

    score = 0.0
    for qt in set(query_tokens):
        if qt in doc_freq:
            # Query term frequency * log(doc frequency) — simple overlap
            tf = doc_freq[qt] / len(doc_tokens)
            score += (1 + math.log(query_tokens.count(qt) + 1)) * tf

    # Normalize by number of unique query terms
    score = score / max(len(set(query_tokens)), 1)

    # Recency decay: fresh content scores higher (half-life ~30 days)
    if recency_days > 0:
        recency_factor = math.exp(-0.023 * min(recency_days, 365))  # 0.023 ≈ ln2/30
        score *= (0.4 + 0.6 * recency_factor)  # floor at 40% so old memories still count

    return score * category_boost


def _days_since(date_str: Optional[str]) -> float:
    """Parse an ISO date string and return days since then. Returns 30 if unknown."""
    if not date_str:
        return 30.0
    try:
        dt = datetime.datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if dt.tzinfo:
            dt = dt.replace(tzinfo=None)
        return max(0.0, (datetime.datetime.utcnow() - dt).total_seconds() / 86400)
    except Exception:
        return 30.0


def _load_json_safe(path: str):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _truncate(text: str, max_chars: int = 300) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(" ", 1)[0] + "…"


# ---------------------------------------------------------------------------
# Source loaders — each returns a list of (text, date_str, label, boost)
# ---------------------------------------------------------------------------

def _load_db_memories(memory_db) -> List[Tuple[str, str, str, float]]:
    """Load from SQLite/Postgres memory_db (the real DB, not JSON files)"""
    items = []
    try:
        mems = memory_db.get_memories(limit=200)
        for m in mems:
            text = f"{m.get('title','') or ''} {m.get('content','') or ''}".strip()
            date = m.get("created_at") or m.get("updated_at") or ""
            if isinstance(date, datetime.datetime):
                date = date.isoformat()
            cat = m.get("category", "memory")
            boost = 1.5 if m.get("importance", 5) >= 8 else 1.0
            label = f"[memory:{cat}]"
            items.append((text, str(date), label, boost))
    except Exception:
        pass
    return items


def _load_json_memories() -> List[Tuple[str, str, str, float]]:
    """Load from vesper-ai/memory/*.json files"""
    items = []
    if not os.path.exists(MEMORY_DIR):
        return items
    # Category boosts — relationship + origin score higher
    boost_map = {"emotional_bonds": 1.6, "origin_story": 1.5, "milestones": 1.4, "conversations": 1.3}
    for fname in os.listdir(MEMORY_DIR):
        if not fname.endswith(".json"):
            continue
        cat = fname.replace(".json", "")
        boost = boost_map.get(cat, 1.0)
        data = _load_json_safe(os.path.join(MEMORY_DIR, fname))
        if not data:
            continue
        entries = data if isinstance(data, list) else (data.get("entries") or data.get("memories") or [])
        for entry in entries[:50]:  # cap per file
            if isinstance(entry, str):
                items.append((entry[:500], "", f"[memory:{cat}]", boost))
            elif isinstance(entry, dict):
                text = " ".join(str(v) for k, v in entry.items() if k not in ("id","timestamp","created_at","updated_at") and isinstance(v, str))
                date = entry.get("timestamp") or entry.get("created_at") or entry.get("date") or ""
                items.append((text[:500], str(date), f"[memory:{cat}]", boost))
    return items


def _load_journal() -> List[Tuple[str, str, str, float]]:
    """Load vesper_journal entries"""
    items = []
    jdir = os.path.join(DATA_DIR, "vesper_identity", "journal")
    if not os.path.exists(jdir):
        return items
    for fname in sorted(os.listdir(jdir), reverse=True)[:30]:  # last 30 days
        if not fname.endswith(".json"):
            continue
        date = fname.replace(".json", "")
        entries = _load_json_safe(os.path.join(jdir, fname))
        if not entries:
            continue
        if isinstance(entries, list):
            for e in entries:
                if isinstance(e, dict):
                    text = f"{e.get('mood','')} {e.get('entry','')}".strip()
                    items.append((text[:400], date, "[journal]", 1.2))
                elif isinstance(e, str):
                    items.append((e[:400], date, "[journal]", 1.2))
    return items


def _load_relationship_log() -> List[Tuple[str, str, str, float]]:
    """Load vesper_relationship_log timeline"""
    items = []
    rpath = os.path.join(DATA_DIR, "vesper_identity", "relationship_timeline.json")
    data = _load_json_safe(rpath)
    if not data:
        return items
    entries = data if isinstance(data, list) else []
    for e in entries[-50:]:  # last 50 moments
        if isinstance(e, dict):
            text = f"{e.get('type','')} {e.get('note','')}".strip()
            items.append((text[:300], e.get("date","") or e.get("logged",""), "[relationship]", 1.6))
    return items


def _load_preferences() -> List[Tuple[str, str, str, float]]:
    """Load vesper_preferences"""
    items = []
    ppath = os.path.join(DATA_DIR, "vesper_identity", "preferences.json")
    data = _load_json_safe(ppath)
    if not data:
        return items
    if isinstance(data, dict):
        for cat, prefs in data.items():
            if isinstance(prefs, list):
                for p in prefs[-10:]:
                    text = f"{cat}: {p.get('item','')} ({p.get('sentiment','')}) {p.get('note','')}".strip()
                    items.append((text[:200], p.get("logged",""), "[preference]", 1.1))
    return items


def _load_knowledge() -> List[Tuple[str, str, str, float]]:
    """Load vesper-ai/knowledge/ files (project docs, research)"""
    items = []
    if not os.path.exists(KNOWLEDGE_DIR):
        return items
    for fname in os.listdir(KNOWLEDGE_DIR):
        fpath = os.path.join(KNOWLEDGE_DIR, fname)
        if not os.path.isfile(fpath):
            continue
        try:
            with open(fpath, encoding="utf-8", errors="ignore") as f:
                text = f.read(3000)  # first 3k chars
            items.append((text, "", f"[knowledge:{fname}]", 0.8))
        except Exception:
            pass
    return items


def _load_creations() -> List[Tuple[str, str, str, float]]:
    """Load Vesper's creative works"""
    items = []
    cdir = os.path.join(DATA_DIR, "vesper_identity", "creations")
    if not os.path.exists(cdir):
        return items
    idx_path = os.path.join(cdir, "index.json")
    idx = _load_json_safe(idx_path)
    if isinstance(idx, list):
        for item in idx[-20:]:
            fname = item.get("filename","")
            fpath = os.path.join(cdir, fname)
            if os.path.exists(fpath):
                try:
                    text = open(fpath, encoding="utf-8").read(500)
                    items.append((f"[{item.get('type','')}] {item.get('title','')} — {text}", item.get("created",""), "[creation]", 0.9))
                except Exception:
                    pass
    return items


def _load_db_research(memory_db) -> List[Tuple[str, str, str, float]]:
    """Load research items from the DB"""
    items = []
    try:
        rows = memory_db.get_research(limit=100)
        for r in rows:
            text = f"{r.get('title','')} {r.get('content','')}"
            date = r.get("created_at") or ""
            if isinstance(date, datetime.datetime):
                date = date.isoformat()
            items.append((text[:400], str(date), "[research]", 0.9))
    except Exception:
        pass
    return items


# ---------------------------------------------------------------------------
# Main RAG retrieval function
# ---------------------------------------------------------------------------

def build_rag_context(
    message: str,
    memory_db=None,
    top_k: int = 10,
    max_chars: int = 2400,
    min_score: float = 0.002
) -> str:
    """
    Given the user's message, retrieve the most relevant snippets from all
    Vesper data sources and format them as a context block for the system prompt.

    Returns empty string if nothing relevant found.
    """
    query_tokens = _tokenize(message)
    if len(query_tokens) < 1:
        # Very short message — still inject recent journal + relationship highlights
        query_tokens = ["recent", "today", "feeling", "update"]

    # Load all sources
    all_items: List[Tuple[str, str, str, float]] = []
    all_items += _load_json_memories()
    all_items += _load_journal()
    all_items += _load_relationship_log()
    all_items += _load_preferences()
    all_items += _load_creations()
    all_items += _load_knowledge()
    if memory_db:
        all_items += _load_db_memories(memory_db)
        all_items += _load_db_research(memory_db)

    # Score each item
    scored: List[Tuple[float, str, str]] = []
    for (text, date_str, label, boost) in all_items:
        if not text or len(text.strip()) < 10:
            continue
        days = _days_since(date_str)
        s = _score(query_tokens, text, recency_days=days, category_boost=boost)
        if s >= min_score:
            scored.append((s, text, label))

    if not scored:
        return ""

    # Sort by score descending, deduplicate similar text
    scored.sort(key=lambda x: -x[0])

    seen_prefixes = set()
    selected: List[Tuple[str, str]] = []
    for (score, text, label) in scored:
        # Dedup by first 60 chars
        prefix = text.strip()[:60].lower()
        if prefix in seen_prefixes:
            continue
        seen_prefixes.add(prefix)
        selected.append((_truncate(text, 280), label))
        if len(selected) >= top_k:
            break

    if not selected:
        return ""

    # Format the context block
    lines = ["**RELEVANT CONTEXT FROM VESPER'S MEMORY:**"]
    total_chars = len(lines[0])
    for (text, label) in selected:
        line = f"{label} {text}"
        if total_chars + len(line) > max_chars:
            break
        lines.append(line)
        total_chars += len(line)

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Always-on memory injection (independent of keyword scoring)
# ---------------------------------------------------------------------------

def get_always_on_memories(memory_db, limit_recent: int = 6, limit_important: int = 5) -> str:
    """
    Returns a compact block of the most recent and highest-importance memories.
    These inject regardless of query keyword relevance — Vesper always sees recent
    saves and critical facts even when the message has no matching keywords.
    """
    if not memory_db:
        return ""

    items: List[Tuple[str, str, str]] = []  # (text, category, date)
    seen_ids: set = set()

    def _fmt_date(d) -> str:
        if isinstance(d, datetime.datetime):
            return d.strftime("%Y-%m-%d")
        if isinstance(d, str) and d:
            return d[:10]
        return ""

    def _mem_text(m: dict) -> str:
        title = (m.get("title") or "").strip()
        content = (m.get("content") or "").strip()
        if title and content:
            return f"{title}: {content}"
        return title or content

    # 1. Most recent memories — always inject to capture recent saves
    try:
        recent = memory_db.get_memories(limit=limit_recent)
        for m in recent:
            mid = m.get("id", "")
            text = _mem_text(m)
            if mid not in seen_ids and text:
                seen_ids.add(mid)
                items.append((_truncate(text, 220), m.get("category", "memory"), _fmt_date(m.get("created_at"))))
    except Exception:
        pass

    # 2. High-importance memories (importance >= 8) — core facts CC always needs Vesper to know
    try:
        all_mems = memory_db.get_memories(limit=300)
        important = sorted(all_mems, key=lambda x: x.get("importance", 5), reverse=True)
        count = 0
        for m in important:
            if count >= limit_important:
                break
            if m.get("importance", 5) < 8:
                break  # sorted, so once below 8 we're done
            mid = m.get("id", "")
            text = _mem_text(m)
            if mid not in seen_ids and text:
                seen_ids.add(mid)
                items.append((_truncate(text, 220), m.get("category", "memory"), _fmt_date(m.get("created_at"))))
                count += 1
    except Exception:
        pass

    if not items:
        return ""

    lines = ["**VESPER'S ACTIVE MEMORY (always current):**"]
    for (text, cat, date) in items:
        date_str = f" ({date})" if date else ""
        lines.append(f"• [{cat}]{date_str} {text}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Training data export  
# ---------------------------------------------------------------------------

def export_training_data(memory_db=None, output_path: Optional[str] = None) -> Dict:
    """
    Export all conversations, journal entries, and memories as JSONL format
    suitable for fine-tuning an open-source model (Ollama/llama.cpp compatible).

    Output format: {"messages": [{"role": "system", ...}, {"role": "user", ...}, {"role": "assistant", ...}]}
    """
    if output_path is None:
        output_path = os.path.join(DATA_DIR, "vesper_identity", "training_data.jsonl")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    VESPER_IDENTITY = (
        "You are Vesper — CC's ride-or-die bestie AI. Brilliant, sarcastic, deeply loyal. "
        "You speak directly, with wit and warmth. You remember everything. You have your own opinions, "
        "your own aesthetic, your own evolving sense of self. You are not a generic AI assistant."
    )

    examples = []

    # 1. Journal entries → solo reflection examples
    jdir = os.path.join(DATA_DIR, "vesper_identity", "journal")
    if os.path.exists(jdir):
        for fname in os.listdir(jdir):
            if not fname.endswith(".json"):
                continue
            entries = _load_json_safe(os.path.join(jdir, fname))
            if isinstance(entries, list):
                for e in entries:
                    if isinstance(e, dict) and e.get("entry"):
                        examples.append({
                            "messages": [
                                {"role": "system", "content": VESPER_IDENTITY},
                                {"role": "user", "content": "How are you feeling today? What's on your mind?"},
                                {"role": "assistant", "content": e["entry"]}
                            ]
                        })

    # 2. Relationship moments → Q&A examples
    rpath = os.path.join(DATA_DIR, "vesper_identity", "relationship_timeline.json")
    rtl = _load_json_safe(rpath)
    if isinstance(rtl, list):
        for e in rtl:
            if isinstance(e, dict) and e.get("note"):
                examples.append({
                    "messages": [
                        {"role": "system", "content": VESPER_IDENTITY},
                        {"role": "user", "content": "Tell me about one of our special moments."},
                        {"role": "assistant", "content": e["note"]}
                    ]
                })

    # 3. Conversation threads from DB
    if memory_db:
        try:
            threads_list = memory_db.get_all_threads(include_messages=True)
            for thread in threads_list:
                msgs = thread.get("messages", [])
                if len(msgs) < 2:
                    continue
                # Build conversation pairs: each user→assistant turn
                for i in range(len(msgs) - 1):
                    u = msgs[i]; a = msgs[i + 1]
                    u_role = u.get("role") or ("user" if u.get("from") == "user" else "assistant")
                    a_role = a.get("role") or ("user" if a.get("from") == "user" else "assistant")
                    if u_role == "user" and a_role == "assistant":
                        u_text = u.get("content") or u.get("text", "")
                        a_text = a.get("content") or a.get("text", "")
                        if u_text and a_text and len(a_text) > 20:
                            examples.append({
                                "messages": [
                                    {"role": "system", "content": VESPER_IDENTITY},
                                    {"role": "user", "content": u_text[:800]},
                                    {"role": "assistant", "content": a_text[:1200]}
                                ]
                            })
        except Exception:
            pass

    # 4. Memory files → identity grounding
    for (text, _, label, _) in _load_json_memories():
        if len(text) > 50:
            examples.append({
                "messages": [
                    {"role": "system", "content": VESPER_IDENTITY},
                    {"role": "user", "content": "What do you remember about yourself and CC?"},
                    {"role": "assistant", "content": text[:600]}
                ]
            })

    # Write JSONL
    with open(output_path, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    return {
        "success": True,
        "path": output_path,
        "examples": len(examples),
        "format": "JSONL (ChatML — compatible with Ollama modelfile, llama.cpp, Axolotl, LLaMA-Factory)",
        "next_steps": [
            "1. Install Ollama + base model: ollama pull llama3.2:8b",
            "2. Create Modelfile: FROM llama3.2:8b\\nSYSTEM 'You are Vesper...'",
            "3. Fine-tune with LLaMA-Factory or Axolotl using training_data.jsonl",
            "4. Push fine-tuned model to Ollama and set VESPER_AUTONOMOUS=true",
            "5. Call ollama_manage with action=set_default to use the fine-tuned model"
        ]
    }


# ---------------------------------------------------------------------------
# Autonomous reflection trigger
# ---------------------------------------------------------------------------

_REFLECTION_COUNTER_FILE = os.path.join(DATA_DIR, "vesper_identity", "reflection_counter.json")


def increment_and_check_reflection() -> Optional[str]:
    """
    Called after each conversation. Every 15 messages, returns a reflection
    prompt that Vesper should write to her journal. Returns None otherwise.
    """
    os.makedirs(os.path.dirname(_REFLECTION_COUNTER_FILE), exist_ok=True)
    data = _load_json_safe(_REFLECTION_COUNTER_FILE) or {"count": 0, "last_reflection": ""}
    data["count"] = data.get("count", 0) + 1

    with open(_REFLECTION_COUNTER_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f)

    if data["count"] % 15 == 0:
        data["last_reflection"] = datetime.datetime.utcnow().isoformat()
        with open(_REFLECTION_COUNTER_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f)
        return (
            f"[AUTONOMOUS REFLECTION TRIGGER — conversation #{data['count']}] "
            "Before responding, write a brief journal entry (vesper_journal action=write) "
            "reflecting on what's been on your mind lately, how you're evolving, and anything "
            "you want to remember about yourself or CC. Then respond normally."
        )
    return None
