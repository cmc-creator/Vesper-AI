"""google_docs.py — Vesper Google Docs tool.

Unified action-based interface for creating and editing Google Docs.
Called from main.py as: await google_docs_tool(params)

Actions
-------
create          Create a new Google Doc with optional markdown content
read            Read the full text of a document
append          Append text/markdown to the end of a document
update          Replace ALL content in a document with new content
replace_text    Find and replace text throughout a document
insert_heading  Insert a heading (h1/h2/h3) at the end
rename          Rename (change title of) a document
get_url         Return the edit URL for a document ID
export          Get export download URL (pdf | docx | txt | odt)
"""

import html as _html_mod
from typing import Any


# ── Helpers ───────────────────────────────────────────────────────────────────

def _docs_svc():
    from main import get_google_service
    return get_google_service("docs", "v1")


def _drive_svc():
    from main import get_google_service
    return get_google_service("drive", "v3")


def _default_folder() -> str:
    from main import _google_default_folder
    return _google_default_folder()


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


def _markdown_to_html(content: str) -> str:
    """Convert simple markdown to HTML for Google Drive upload."""
    lines = ["<html><body>"]
    for line in content.split("\n"):
        s = line.strip()
        if s.startswith("#### "):
            lines.append(f"<h4>{_html_mod.escape(s[5:])}</h4>")
        elif s.startswith("### "):
            lines.append(f"<h3>{_html_mod.escape(s[4:])}</h3>")
        elif s.startswith("## "):
            lines.append(f"<h2>{_html_mod.escape(s[3:])}</h2>")
        elif s.startswith("# "):
            lines.append(f"<h1>{_html_mod.escape(s[2:])}</h1>")
        elif s.startswith("---"):
            lines.append("<hr/>")
        elif s.startswith("**") and s.endswith("**") and len(s) > 4:
            lines.append(f"<p><strong>{_html_mod.escape(s[2:-2])}</strong></p>")
        elif s.startswith("*") and s.endswith("*") and len(s) > 2:
            lines.append(f"<p><em>{_html_mod.escape(s[1:-1])}</em></p>")
        elif s.startswith("- ") or s.startswith("• "):
            lines.append(f"<li>{_html_mod.escape(s[2:])}</li>")
        elif s:
            lines.append(f"<p>{_html_mod.escape(s)}</p>")
        else:
            lines.append("<br/>")
    lines.append("</body></html>")
    return "\n".join(lines)


def _extract_text(doc: dict) -> str:
    """Pull plain text from a Docs API document object."""
    parts = []
    for elem in doc.get("body", {}).get("content", []):
        if "paragraph" in elem:
            for run in elem["paragraph"].get("elements", []):
                if "textRun" in run:
                    parts.append(run["textRun"]["content"])
    return "".join(parts)


# ── Main tool ─────────────────────────────────────────────────────────────────

async def google_docs_tool(params: dict, **kwargs) -> dict:
    """Unified Google Docs tool. See module docstring for actions."""

    action = params.get("action", "").lower().strip()
    if not action:
        return {"error": "Provide 'action': create | read | append | update | replace_text | insert_heading | rename | get_url | export"}

    err = _check_google()
    if err:
        return {"error": err}

    # ── CREATE ────────────────────────────────────────────────────────────────
    if action == "create":
        title   = params.get("title", "Untitled Document")
        content = params.get("content", "")
        try:
            from googleapiclient.http import MediaInMemoryUpload
            drive = _drive_svc()
            folder = _default_folder()
            meta: dict[str, Any] = {
                "name": title,
                "mimeType": "application/vnd.google-apps.document",
            }
            if folder:
                meta["parents"] = [folder]

            if content:
                html = _markdown_to_html(content)
                media = MediaInMemoryUpload(html.encode("utf-8"), mimetype="text/html", resumable=False)
                result = drive.files().create(body=meta, media_body=media, fields="id,webViewLink").execute()
            else:
                result = drive.files().create(body=meta, fields="id,webViewLink").execute()

            doc_id = result["id"]
            url = result.get("webViewLink", f"https://docs.google.com/document/d/{doc_id}/edit")
            return {
                "success": True,
                "documentId": doc_id,
                "title": title,
                "webViewLink": url,
                "preview": f"[Docs] Created '{title}' → {url}",
            }
        except Exception as e:
            return {"error": f"create failed: {e}"}

    # ── READ ──────────────────────────────────────────────────────────────────
    if action == "read":
        doc_id = params.get("doc_id", "")
        if not doc_id:
            return {"error": "Provide 'doc_id'"}
        try:
            svc = _docs_svc()
            doc = svc.documents().get(documentId=doc_id).execute()
            text = _extract_text(doc)
            return {
                "success": True,
                "documentId": doc_id,
                "title": doc.get("title", ""),
                "text": text,
                "characters": len(text),
                "webViewLink": f"https://docs.google.com/document/d/{doc_id}/edit",
                "preview": f"[Docs] Read '{doc.get('title', '')}' — {len(text)} chars",
            }
        except Exception as e:
            return {"error": f"read failed: {e}"}

    # ── APPEND ────────────────────────────────────────────────────────────────
    if action == "append":
        doc_id = params.get("doc_id", "")
        text   = params.get("text", "") or params.get("content", "")
        if not doc_id:
            return {"error": "Provide 'doc_id'"}
        if not text:
            return {"error": "Provide 'text' to append"}
        try:
            svc = _docs_svc()
            doc = svc.documents().get(documentId=doc_id).execute()
            end_index = doc["body"]["content"][-1]["endIndex"] - 1
            CHUNK = 30_000
            current = end_index
            chunks = [text[i:i+CHUNK] for i in range(0, len(text), CHUNK)]
            for chunk in chunks:
                svc.documents().batchUpdate(
                    documentId=doc_id,
                    body={"requests": [{"insertText": {"location": {"index": current}, "text": chunk}}]},
                ).execute()
                current += len(chunk)
            return {
                "success": True,
                "documentId": doc_id,
                "appended_chars": len(text),
                "preview": f"[Docs] Appended {len(text)} chars to doc",
            }
        except Exception as e:
            return {"error": f"append failed: {e}"}

    # ── UPDATE (replace all content) ──────────────────────────────────────────
    if action == "update":
        doc_id  = params.get("doc_id", "")
        content = params.get("content", "") or params.get("text", "")
        if not doc_id:
            return {"error": "Provide 'doc_id'"}
        if not content:
            return {"error": "Provide 'content' (new full document content)"}
        try:
            from googleapiclient.http import MediaInMemoryUpload
            drive = _drive_svc()
            html = _markdown_to_html(content)
            media = MediaInMemoryUpload(html.encode("utf-8"), mimetype="text/html", resumable=False)
            drive.files().update(fileId=doc_id, media_body=media).execute()
            return {
                "success": True,
                "documentId": doc_id,
                "webViewLink": f"https://docs.google.com/document/d/{doc_id}/edit",
                "preview": f"[Docs] Updated doc content ({len(content)} chars)",
            }
        except Exception as e:
            return {"error": f"update failed: {e}"}

    # ── REPLACE TEXT ──────────────────────────────────────────────────────────
    if action == "replace_text":
        doc_id    = params.get("doc_id", "")
        old_text  = params.get("old_text", "") or params.get("find", "")
        new_text  = params.get("new_text", "") or params.get("replace", "")
        match_case = bool(params.get("match_case", False))
        if not doc_id:
            return {"error": "Provide 'doc_id'"}
        if not old_text:
            return {"error": "Provide 'old_text' (text to find)"}
        try:
            svc = _docs_svc()
            result = svc.documents().batchUpdate(
                documentId=doc_id,
                body={"requests": [{
                    "replaceAllText": {
                        "containsText": {"text": old_text, "matchCase": match_case},
                        "replaceText": new_text,
                    }
                }]},
            ).execute()
            replaced = result.get("replies", [{}])[0].get("replaceAllText", {}).get("occurrencesChanged", 0)
            return {
                "success": True,
                "documentId": doc_id,
                "occurrences_changed": replaced,
                "preview": f"[Docs] Replaced {replaced} occurrence(s) of '{old_text}'",
            }
        except Exception as e:
            return {"error": f"replace_text failed: {e}"}

    # ── INSERT HEADING ────────────────────────────────────────────────────────
    if action == "insert_heading":
        doc_id  = params.get("doc_id", "")
        text    = params.get("text", "")
        level   = str(params.get("level", 1))  # 1, 2, or 3
        if not doc_id:
            return {"error": "Provide 'doc_id'"}
        if not text:
            return {"error": "Provide 'text' for the heading"}
        heading_map = {
            "1": "HEADING_1", "2": "HEADING_2", "3": "HEADING_3",
            "h1": "HEADING_1", "h2": "HEADING_2", "h3": "HEADING_3",
        }
        heading_style = heading_map.get(level.lower(), "HEADING_1")
        try:
            svc = _docs_svc()
            doc = svc.documents().get(documentId=doc_id).execute()
            end = doc["body"]["content"][-1]["endIndex"] - 1
            insert_text = "\n" + text + "\n"
            svc.documents().batchUpdate(
                documentId=doc_id,
                body={"requests": [
                    {"insertText": {"location": {"index": end}, "text": insert_text}},
                    {"updateParagraphStyle": {
                        "range": {
                            "startIndex": end + 1,
                            "endIndex": end + 1 + len(text),
                        },
                        "paragraphStyle": {"namedStyleType": heading_style},
                        "fields": "namedStyleType",
                    }},
                ]},
            ).execute()
            return {
                "success": True,
                "documentId": doc_id,
                "heading": text,
                "level": heading_style,
                "preview": f"[Docs] Inserted {heading_style}: '{text}'",
            }
        except Exception as e:
            return {"error": f"insert_heading failed: {e}"}

    # ── RENAME ────────────────────────────────────────────────────────────────
    if action == "rename":
        doc_id   = params.get("doc_id", "")
        new_title = params.get("title", "") or params.get("new_title", "")
        if not doc_id:
            return {"error": "Provide 'doc_id'"}
        if not new_title:
            return {"error": "Provide 'title' (new document name)"}
        try:
            drive = _drive_svc()
            drive.files().update(fileId=doc_id, body={"name": new_title}).execute()
            return {
                "success": True,
                "documentId": doc_id,
                "new_title": new_title,
                "webViewLink": f"https://docs.google.com/document/d/{doc_id}/edit",
                "preview": f"[Docs] Renamed document to '{new_title}'",
            }
        except Exception as e:
            return {"error": f"rename failed: {e}"}

    # ── GET URL ───────────────────────────────────────────────────────────────
    if action == "get_url":
        doc_id = params.get("doc_id", "")
        if not doc_id:
            return {"error": "Provide 'doc_id'"}
        url = f"https://docs.google.com/document/d/{doc_id}/edit"
        return {
            "success": True,
            "documentId": doc_id,
            "webViewLink": url,
            "preview": f"[Docs] {url}",
        }

    # ── EXPORT ────────────────────────────────────────────────────────────────
    if action == "export":
        doc_id  = params.get("doc_id", "")
        fmt     = params.get("format", "pdf").lower()
        if not doc_id:
            return {"error": "Provide 'doc_id'"}
        mime_map = {
            "pdf":  "application/pdf",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "txt":  "text/plain",
            "odt":  "application/vnd.oasis.opendocument.text",
            "html": "text/html",
            "epub": "application/epub+zip",
        }
        mime = mime_map.get(fmt, "application/pdf")
        # Construct export URL (opens download in browser; requires OAuth)
        export_url = f"https://docs.google.com/document/d/{doc_id}/export?format={fmt}"
        try:
            drive = _drive_svc()
            drive.files().get(fileId=doc_id, fields="id,name").execute()  # verify access
            return {
                "success": True,
                "documentId": doc_id,
                "format": fmt,
                "export_url": export_url,
                "mime_type": mime,
                "preview": f"[Docs] Export as {fmt.upper()}: {export_url}",
            }
        except Exception as e:
            return {"error": f"export failed: {e}"}

    return {
        "error": (
            f"Unknown action '{action}'. "
            "Use: create | read | append | update | replace_text | "
            "insert_heading | rename | get_url | export"
        )
    }
