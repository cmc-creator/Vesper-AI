"""gmail.py — Vesper Gmail tool.

Unified action-based interface for reading, searching, and managing Gmail.
Sending is already handled by send_email / send_email_resend / send_email_brevo.

Called from main.py as: await gmail_tool(params)

Actions
-------
list            List recent inbox messages (unread or all)
search          Search Gmail with a query string (same syntax as Gmail search box)
read            Read the full text of a specific message by ID
send            Send an email via Gmail API (uses authenticated Google account)
reply           Reply to an existing thread
mark_read       Mark a message as read
mark_unread     Mark a message as unread
trash           Move a message to trash
list_labels     List all Gmail labels/folders
search_sender   Shortcut: find all emails from a specific sender
"""

import base64
import email as _email_lib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


# ── Helpers ───────────────────────────────────────────────────────────────────

def _gmail_svc():
    from main import get_google_service
    return get_google_service("gmail", "v1")


def _check_google():
    try:
        from main import get_google_credentials
        get_google_credentials()
        return None
    except Exception as e:
        return (
            "Google Workspace is not connected. "
            "Set up GOOGLE_SERVICE_ACCOUNT_FILE or authenticate via /api/google/auth. "
            f"Detail: {e}"
        )


def _build_message(to: str, subject: str, body: str, html: bool = False,
                   cc: str = "", reply_to_id: str = "", thread_id: str = "") -> dict:
    """Build a Gmail API message dict."""
    if html:
        msg = MIMEMultipart("alternative")
        msg.attach(MIMEText(body, "html"))
    else:
        msg = MIMEText(body, "plain")
    msg["to"] = to
    msg["subject"] = subject
    if cc:
        msg["cc"] = cc

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    result: dict = {"raw": raw}
    if thread_id:
        result["threadId"] = thread_id
    if reply_to_id:
        result["inReplyTo"] = reply_to_id
    return result


def _parse_headers(headers: list) -> dict:
    """Return a flat dict of useful header values."""
    wanted = {"from", "to", "subject", "date", "cc", "reply-to", "message-id"}
    return {
        h["name"].lower(): h["value"]
        for h in headers
        if h["name"].lower() in wanted
    }


def _extract_body(payload: dict, prefer_plain: bool = True) -> str:
    """Recursively extract body text from a Gmail message payload."""
    mime = payload.get("mimeType", "")
    parts = payload.get("parts", [])

    if mime in ("text/plain", "text/html") and not parts:
        data = payload.get("body", {}).get("data", "")
        if data:
            decoded = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
            if mime == "text/html" and prefer_plain:
                # Very basic HTML strip
                import re
                decoded = re.sub(r"<[^>]+>", "", decoded)
                decoded = decoded.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            return decoded.strip()

    if mime == "multipart/alternative" and parts:
        # Prefer text/plain, fall back to text/html
        for part in parts:
            if prefer_plain and part.get("mimeType") == "text/plain":
                return _extract_body(part, prefer_plain)
        for part in parts:
            return _extract_body(part, prefer_plain)

    if parts:
        texts = []
        for part in parts:
            t = _extract_body(part, prefer_plain)
            if t:
                texts.append(t)
        return "\n\n".join(texts)

    return ""


def _summarize_message(msg: dict) -> dict:
    """Return a compact summary of a Gmail message."""
    headers = _parse_headers(msg.get("payload", {}).get("headers", []))
    return {
        "id": msg["id"],
        "thread_id": msg.get("threadId", ""),
        "from": headers.get("from", ""),
        "to": headers.get("to", ""),
        "subject": headers.get("subject", "(no subject)"),
        "date": headers.get("date", ""),
        "snippet": msg.get("snippet", ""),
        "unread": "UNREAD" in msg.get("labelIds", []),
    }


# ── Main tool ─────────────────────────────────────────────────────────────────

async def gmail_tool(params: dict, **kwargs) -> dict:
    """Unified Gmail tool. See module docstring for actions."""

    action = params.get("action", "").lower().strip()
    if not action:
        return {"error": "Provide 'action': list | search | read | send | reply | mark_read | mark_unread | trash | list_labels | search_sender"}

    err = _check_google()
    if err:
        return {"error": err}

    user = "me"  # Always 'me' for authenticated user

    # ── LIST ──────────────────────────────────────────────────────────────────
    if action == "list":
        max_results = int(params.get("max_results", 20))
        unread_only = bool(params.get("unread_only", False))
        label       = params.get("label", "INBOX")
        try:
            svc = _gmail_svc()
            q = "is:unread" if unread_only else ""
            result = svc.users().messages().list(
                userId=user, maxResults=max_results,
                labelIds=[label], q=q
            ).execute()
            messages_meta = result.get("messages", [])
            if not messages_meta:
                return {"success": True, "messages": [], "count": 0, "preview": "[Gmail] No messages found"}

            messages = []
            for m in messages_meta[:max_results]:
                full = svc.users().messages().get(userId=user, id=m["id"], format="metadata",
                                                   metadataHeaders=["From", "Subject", "Date"]).execute()
                messages.append(_summarize_message(full))

            return {
                "success": True,
                "messages": messages,
                "count": len(messages),
                "preview": f"[Gmail] {len(messages)} message(s) from {label}",
            }
        except Exception as e:
            return {"error": f"list failed: {e}"}

    # ── SEARCH ────────────────────────────────────────────────────────────────
    if action == "search":
        query       = params.get("query", "")
        max_results = int(params.get("max_results", 20))
        if not query:
            return {"error": "Provide 'query' (Gmail search syntax, e.g. 'from:alice subject:invoice')"}
        try:
            svc = _gmail_svc()
            result = svc.users().messages().list(
                userId=user, q=query, maxResults=max_results
            ).execute()
            messages_meta = result.get("messages", [])
            if not messages_meta:
                return {"success": True, "messages": [], "count": 0, "query": query, "preview": f"[Gmail] No results for '{query}'"}

            messages = []
            for m in messages_meta:
                full = svc.users().messages().get(userId=user, id=m["id"], format="metadata",
                                                   metadataHeaders=["From", "To", "Subject", "Date"]).execute()
                messages.append(_summarize_message(full))

            return {
                "success": True,
                "query": query,
                "messages": messages,
                "count": len(messages),
                "preview": f"[Gmail] {len(messages)} result(s) for '{query}'",
            }
        except Exception as e:
            return {"error": f"search failed: {e}"}

    # ── READ ──────────────────────────────────────────────────────────────────
    if action == "read":
        msg_id = params.get("message_id", "") or params.get("id", "")
        if not msg_id:
            return {"error": "Provide 'message_id'"}
        try:
            svc = _gmail_svc()
            msg = svc.users().messages().get(userId=user, id=msg_id, format="full").execute()
            headers = _parse_headers(msg.get("payload", {}).get("headers", []))
            body = _extract_body(msg.get("payload", {}))
            # Limit body to 8000 chars to avoid context overload
            if len(body) > 8000:
                body = body[:8000] + "\n\n[... message truncated ...]"
            return {
                "success": True,
                "id": msg_id,
                "thread_id": msg.get("threadId", ""),
                "from": headers.get("from", ""),
                "to": headers.get("to", ""),
                "subject": headers.get("subject", ""),
                "date": headers.get("date", ""),
                "body": body,
                "unread": "UNREAD" in msg.get("labelIds", []),
                "preview": f"[Gmail] Read '{headers.get('subject', '')}' from {headers.get('from', '')}",
            }
        except Exception as e:
            return {"error": f"read failed: {e}"}

    # ── SEND ──────────────────────────────────────────────────────────────────
    if action == "send":
        to      = params.get("to", "")
        subject = params.get("subject", "")
        body    = params.get("body", "") or params.get("text", "")
        html    = bool(params.get("html", False))
        cc      = params.get("cc", "")
        if not to or not subject or not body:
            return {"error": "Provide 'to', 'subject', and 'body'"}
        try:
            svc = _gmail_svc()
            msg = _build_message(to, subject, body, html=html, cc=cc)
            sent = svc.users().messages().send(userId=user, body=msg).execute()
            return {
                "success": True,
                "message_id": sent.get("id", ""),
                "thread_id": sent.get("threadId", ""),
                "to": to,
                "subject": subject,
                "preview": f"[Gmail] Sent '{subject}' to {to}",
            }
        except Exception as e:
            return {"error": f"send failed: {e}"}

    # ── REPLY ─────────────────────────────────────────────────────────────────
    if action == "reply":
        msg_id  = params.get("message_id", "") or params.get("id", "")
        body    = params.get("body", "") or params.get("text", "")
        html    = bool(params.get("html", False))
        if not msg_id or not body:
            return {"error": "Provide 'message_id' and 'body'"}
        try:
            svc = _gmail_svc()
            original = svc.users().messages().get(userId=user, id=msg_id, format="metadata",
                                                    metadataHeaders=["From", "Subject", "Message-ID"]).execute()
            headers = _parse_headers(original.get("payload", {}).get("headers", []))
            thread_id = original.get("threadId", "")
            reply_to = headers.get("from", "")
            subject = headers.get("subject", "")
            if not subject.lower().startswith("re:"):
                subject = "Re: " + subject

            msg = _build_message(reply_to, subject, body, html=html, thread_id=thread_id)
            sent = svc.users().messages().send(userId=user, body=msg).execute()
            return {
                "success": True,
                "message_id": sent.get("id", ""),
                "thread_id": thread_id,
                "replied_to": reply_to,
                "subject": subject,
                "preview": f"[Gmail] Replied '{subject}' to {reply_to}",
            }
        except Exception as e:
            return {"error": f"reply failed: {e}"}

    # ── MARK READ ─────────────────────────────────────────────────────────────
    if action == "mark_read":
        msg_id = params.get("message_id", "") or params.get("id", "")
        if not msg_id:
            return {"error": "Provide 'message_id'"}
        try:
            svc = _gmail_svc()
            svc.users().messages().modify(
                userId=user, id=msg_id,
                body={"removeLabelIds": ["UNREAD"]}
            ).execute()
            return {"success": True, "message_id": msg_id, "preview": f"[Gmail] Marked {msg_id} as read"}
        except Exception as e:
            return {"error": f"mark_read failed: {e}"}

    # ── MARK UNREAD ───────────────────────────────────────────────────────────
    if action == "mark_unread":
        msg_id = params.get("message_id", "") or params.get("id", "")
        if not msg_id:
            return {"error": "Provide 'message_id'"}
        try:
            svc = _gmail_svc()
            svc.users().messages().modify(
                userId=user, id=msg_id,
                body={"addLabelIds": ["UNREAD"]}
            ).execute()
            return {"success": True, "message_id": msg_id, "preview": f"[Gmail] Marked {msg_id} as unread"}
        except Exception as e:
            return {"error": f"mark_unread failed: {e}"}

    # ── TRASH ─────────────────────────────────────────────────────────────────
    if action == "trash":
        msg_id = params.get("message_id", "") or params.get("id", "")
        if not msg_id:
            return {"error": "Provide 'message_id'"}
        try:
            svc = _gmail_svc()
            svc.users().messages().trash(userId=user, id=msg_id).execute()
            return {"success": True, "message_id": msg_id, "preview": f"[Gmail] Moved {msg_id} to trash"}
        except Exception as e:
            return {"error": f"trash failed: {e}"}

    # ── LIST LABELS ───────────────────────────────────────────────────────────
    if action == "list_labels":
        try:
            svc = _gmail_svc()
            result = svc.users().labels().list(userId=user).execute()
            labels = [
                {"id": lbl["id"], "name": lbl["name"], "type": lbl.get("type", "")}
                for lbl in result.get("labels", [])
            ]
            return {
                "success": True,
                "labels": labels,
                "count": len(labels),
                "preview": f"[Gmail] {len(labels)} label(s): {', '.join(l['name'] for l in labels[:10])}",
            }
        except Exception as e:
            return {"error": f"list_labels failed: {e}"}

    # ── SEARCH SENDER ─────────────────────────────────────────────────────────
    if action == "search_sender":
        sender      = params.get("sender", "") or params.get("from", "")
        max_results = int(params.get("max_results", 20))
        if not sender:
            return {"error": "Provide 'sender' email address"}
        # Delegate to search
        return await gmail_tool({**params, "action": "search", "query": f"from:{sender}", "max_results": max_results})

    return {
        "error": (
            f"Unknown action '{action}'. "
            "Use: list | search | read | send | reply | mark_read | mark_unread | trash | list_labels | search_sender"
        )
    }
