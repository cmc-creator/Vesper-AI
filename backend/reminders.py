"""
Reminders tool for Vesper — set, list, snooze, and delete timed reminders.

Backed by the existing Task table (reminder=True, due_date set, status="inbox").
No schema migration needed.

Actions:
  set     — create a new reminder with a natural-language or ISO time
  list    — list all pending (unfired) reminders
  delete  — cancel/delete a reminder
  snooze  — push due_date forward by N minutes
  check   — check for overdue reminders (used internally by core loop)

Time parsing handles:
  - "in 30 minutes"  / "in 2 hours"
  - "tomorrow at 9am"  / "tomorrow at 9:30"
  - "tonight at 8pm"
  - "Monday at 3pm"  / "next Monday at 10am"
  - "2025-07-15 14:00" (ISO)
  - "9am" / "3:30pm" (today, unless already past)
"""

import re
import datetime
from typing import Optional


# ── Time parser ─────────────────────────────────────────────────────────────

_WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def _parse_time(raw: str) -> Optional[datetime.datetime]:
    """Parse a human-readable time string into a UTC datetime.
    
    Input times are treated as local (US/Pacific) - approximated by returning
    UTC with no offset since Railway runs UTC and timezone info isn't available.
    """
    raw = raw.strip().lower()
    now = datetime.datetime.utcnow()

    # --- "in X minutes/hours/days" ---
    m = re.match(r'in\s+(\d+)\s+(minute|hour|day|week)s?', raw)
    if m:
        amount = int(m.group(1))
        unit = m.group(2)
        if unit == "minute":
            return now + datetime.timedelta(minutes=amount)
        elif unit == "hour":
            return now + datetime.timedelta(hours=amount)
        elif unit == "day":
            return now + datetime.timedelta(days=amount)
        elif unit == "week":
            return now + datetime.timedelta(weeks=amount)

    # --- Parse a clock time from string like "9am", "3:30pm", "14:00" ---
    def _extract_clock(s: str) -> Optional[tuple]:
        """Return (hour, minute) 24h or None."""
        # HH:MM am/pm
        m2 = re.search(r'(\d{1,2}):(\d{2})\s*(am|pm)?', s)
        if m2:
            h, mi = int(m2.group(1)), int(m2.group(2))
            ampm = m2.group(3)
            if ampm == "pm" and h < 12:
                h += 12
            elif ampm == "am" and h == 12:
                h = 0
            return h, mi
        # H am/pm
        m2 = re.search(r'(\d{1,2})\s*(am|pm)', s)
        if m2:
            h = int(m2.group(1))
            ampm = m2.group(2)
            if ampm == "pm" and h < 12:
                h += 12
            elif ampm == "am" and h == 12:
                h = 0
            return h, 0
        return None

    # --- "tomorrow at X" ---
    if "tomorrow" in raw:
        clock = _extract_clock(raw)
        h, mi = clock if clock else (9, 0)
        tomorrow = now.replace(hour=h, minute=mi, second=0, microsecond=0) + datetime.timedelta(days=1)
        return tomorrow

    # --- "tonight at X" / "today at X" ---
    if "tonight" in raw or "today" in raw:
        clock = _extract_clock(raw)
        if clock:
            h, mi = clock
        else:
            h, mi = (20, 0) if "tonight" in raw else (now.hour, now.minute + 30)
        candidate = now.replace(hour=h, minute=mi, second=0, microsecond=0)
        if candidate <= now:
            candidate += datetime.timedelta(days=1)
        return candidate

    # --- "next Monday at X" / "Monday at X" ---
    for i, day in enumerate(_WEEKDAYS):
        if day in raw:
            clock = _extract_clock(raw)
            h, mi = clock if clock else (9, 0)
            days_ahead = (i - now.weekday()) % 7
            if "next" in raw and days_ahead == 0:
                days_ahead = 7
            if days_ahead == 0:
                days_ahead = 7  # always push to next occurrence
            target = now + datetime.timedelta(days=days_ahead)
            return target.replace(hour=h, minute=mi, second=0, microsecond=0)

    # --- ISO datetime / date ---
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M", "%Y-%m-%d"):
        try:
            dt = datetime.datetime.strptime(raw, fmt)
            return dt
        except ValueError:
            pass

    # --- Bare clock time (e.g. "9am", "3:30pm") — schedule for today or tomorrow ---
    clock = _extract_clock(raw)
    if clock:
        h, mi = clock
        candidate = now.replace(hour=h, minute=mi, second=0, microsecond=0)
        if candidate <= now:
            candidate += datetime.timedelta(days=1)
        return candidate

    return None


def _fmt_dt(dt: Optional[datetime.datetime]) -> str:
    if not dt:
        return "(no time)"
    return dt.strftime("%A, %b %-d at %-I:%M %p UTC") if hasattr(dt, "strftime") else str(dt)


# ── Tool function ────────────────────────────────────────────────────────────

async def reminders_tool(params: dict, **kwargs) -> dict:
    action = params.get("action", "list").lower()

    # Import DB lazily so this module can be loaded before main.py finishes init
    try:
        from memory_db import db as memory_db, Task
    except ImportError:
        try:
            import sys, os
            sys.path.insert(0, os.path.dirname(__file__))
            from memory_db import db as memory_db, Task
        except Exception as e:
            return {"error": f"Could not import memory_db: {e}"}

    if action == "set":
        text = params.get("text", params.get("reminder", "")).strip()
        when_raw = params.get("when", params.get("time", "")).strip()
        if not text:
            return {"error": "text is required — what should Vesper remind you about?"}
        if not when_raw:
            return {"error": "when is required — e.g. 'in 30 minutes', 'tomorrow at 9am'"}

        due = _parse_time(when_raw)
        if due is None:
            return {"error": f"Couldn't parse time '{when_raw}'. Try 'in 30 minutes', 'tomorrow at 9am', or '2025-07-15 14:00'"}

        session = memory_db.get_session()
        try:
            task = Task(
                title=text,
                description=f"Reminder set for: {when_raw}",
                status="inbox",
                priority="medium",
                due_date=due,
                reminder=True,
                tags=["reminder"],
                meta_data={"original_when": when_raw},
            )
            session.add(task)
            session.commit()
            session.refresh(task)
            return {
                "id": task.id,
                "text": text,
                "due": due.isoformat(),
                "preview": f"⏰ Reminder set: **{text}**\n📅 Due: {_fmt_dt(due)}",
            }
        except Exception as e:
            session.rollback()
            return {"error": f"Failed to save reminder: {e}"}
        finally:
            session.close()

    elif action == "list":
        include_done = params.get("include_done", False)
        session = memory_db.get_session()
        try:
            q = session.query(Task).filter(Task.reminder == True)
            if not include_done:
                q = q.filter(Task.status != "done")
            tasks = q.order_by(Task.due_date.asc().nullslast()).all()
            now = datetime.datetime.utcnow()
            lines = [f"⏰ **{len(tasks)} reminder(s)**\n"]
            result_list = []
            for t in tasks:
                due_str = _fmt_dt(t.due_date)
                overdue = t.due_date and t.due_date < now and t.status != "done"
                marker = "🔴 OVERDUE — " if overdue else ""
                lines.append(f"• **[{t.id}]** {marker}{t.title}")
                lines.append(f"  Due: {due_str} | Status: {t.status}")
                result_list.append({
                    "id": t.id,
                    "text": t.title,
                    "due": t.due_date.isoformat() if t.due_date else None,
                    "status": t.status,
                    "overdue": overdue,
                })
            return {"reminders": result_list, "count": len(tasks), "preview": "\n".join(lines) or "No pending reminders."}
        except Exception as e:
            return {"error": f"Failed to list reminders: {e}"}
        finally:
            session.close()

    elif action == "delete":
        reminder_id = params.get("id", params.get("reminder_id"))
        if not reminder_id:
            return {"error": "id is required to delete a reminder"}
        session = memory_db.get_session()
        try:
            task = session.query(Task).filter(Task.id == int(reminder_id), Task.reminder == True).first()
            if not task:
                return {"error": f"Reminder {reminder_id} not found"}
            text = task.title
            task.status = "done"
            session.commit()
            return {"success": True, "preview": f"🗑️ Reminder '{text}' cancelled"}
        except Exception as e:
            session.rollback()
            return {"error": f"Failed to delete reminder: {e}"}
        finally:
            session.close()

    elif action == "snooze":
        reminder_id = params.get("id", params.get("reminder_id"))
        minutes = int(params.get("minutes", 30))
        if not reminder_id:
            return {"error": "id is required to snooze a reminder"}
        session = memory_db.get_session()
        try:
            task = session.query(Task).filter(Task.id == int(reminder_id), Task.reminder == True).first()
            if not task:
                return {"error": f"Reminder {reminder_id} not found"}
            if task.due_date:
                task.due_date = task.due_date + datetime.timedelta(minutes=minutes)
            else:
                task.due_date = datetime.datetime.utcnow() + datetime.timedelta(minutes=minutes)
            task.status = "inbox"  # re-activate if it was fired
            session.commit()
            return {
                "success": True,
                "new_due": task.due_date.isoformat(),
                "preview": f"💤 Snoozed '{task.title}' by {minutes} minutes — new time: {_fmt_dt(task.due_date)}",
            }
        except Exception as e:
            session.rollback()
            return {"error": f"Failed to snooze reminder: {e}"}
        finally:
            session.close()

    elif action == "check":
        """Return reminders that are due (used by _vesper_core_loop)."""
        session = memory_db.get_session()
        try:
            now = datetime.datetime.utcnow()
            due_tasks = (
                session.query(Task)
                .filter(
                    Task.reminder == True,
                    Task.status == "inbox",
                    Task.due_date <= now,
                )
                .all()
            )
            fired = []
            for t in due_tasks:
                t.status = "done"
                fired.append({"id": t.id, "text": t.title, "due": t.due_date.isoformat() if t.due_date else None})
            if fired:
                session.commit()
            return {"fired": fired, "count": len(fired)}
        except Exception as e:
            session.rollback()
            return {"error": str(e), "fired": []}
        finally:
            session.close()

    else:
        return {"error": f"Unknown action '{action}'. Use: set | list | delete | snooze | check"}
