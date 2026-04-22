"""google_sheets.py — Vesper Google Sheets tool.

Unified action-based interface for reading and writing Google Sheets.
Called from main.py as: await google_sheets_tool(params)

Actions
-------
build           Create a fully populated, formatted, multi-tab spreadsheet in ONE call
create          Create a new spreadsheet (optional: headers, tab_name)
read            Read rows from a range (default Sheet1)
append          Append rows to a sheet
update          Overwrite a specific range with values
clear           Clear a range of cells
get_info        Get spreadsheet metadata (title, tabs, row/column counts)
list_tabs       List all worksheet tab names and IDs
add_tab         Add a new worksheet tab
rename_tab      Rename an existing tab
delete_rows     Delete specific rows (by 1-based row numbers)
format_headers  Bold + background-color the first row of a tab
find            Search for a value in a sheet, return matching cell addresses

Required env setup (via get_google_credentials in main.py):
  GOOGLE_SERVICE_ACCOUNT_FILE  — path to service account JSON  OR
  GOOGLE_OAUTH_TOKEN_JSON      — stored OAuth token (set via /api/google/auth)

Optional:
  GOOGLE_DRIVE_FOLDER_ID       — folder to place new spreadsheets in
"""

import os as _os
from typing import Any


# ── Internal helpers ──────────────────────────────────────────────────────────

def _sheets_svc():
    """Return an authenticated Sheets v4 service."""
    from main import get_google_service
    return get_google_service("sheets", "v4")


def _drive_svc():
    """Return an authenticated Drive v3 service."""
    from main import get_google_service
    return get_google_service("drive", "v3")


def _default_folder() -> str:
    from main import _google_default_folder
    return _google_default_folder()


def _check_google() -> str | None:
    """Return an error string if Google credentials are unavailable."""
    try:
        from main import get_google_credentials
        get_google_credentials()
        return None
    except Exception as e:
        return (
            "Google Workspace is not connected. "
            "Set up either a service account (GOOGLE_SERVICE_ACCOUNT_FILE) "
            "or authenticate via /api/google/auth. "
            f"Detail: {e}"
        )


# ── Main tool function ────────────────────────────────────────────────────────

async def google_sheets_tool(params: dict, **kwargs) -> dict:
    """Unified Google Sheets tool. See module docstring for actions."""

    action = params.get("action", "").lower().strip()
    if not action:
        return {"error": "Provide 'action'. Options: create | read | append | update | clear | get_info | list_tabs | add_tab | rename_tab | delete_rows | format_headers | find"}

    err = _check_google()
    if err:
        return {"error": err}

    # ── CREATE ────────────────────────────────────────────────────────────────
    if action == "create":
        title     = params.get("title", "Untitled Spreadsheet")
        headers   = params.get("headers", [])
        tab_name  = params.get("tab_name", "")
        try:
            drive = _drive_svc()
            folder = _default_folder()
            meta: dict[str, Any] = {
                "name": title,
                "mimeType": "application/vnd.google-apps.spreadsheet",
            }
            if folder:
                meta["parents"] = [folder]
            created = drive.files().create(body=meta, fields="id,webViewLink").execute()
            sheet_id = created["id"]
            sheets = _sheets_svc()

            requests: list[dict] = []

            # Rename default "Sheet1" tab if requested
            if tab_name:
                # Get the default sheet's sheetId
                info = sheets.spreadsheets().get(spreadsheetId=sheet_id).execute()
                default_sid = info["sheets"][0]["properties"]["sheetId"]
                requests.append({
                    "updateSheetProperties": {
                        "properties": {"sheetId": default_sid, "title": tab_name},
                        "fields": "title",
                    }
                })

            if requests:
                sheets.spreadsheets().batchUpdate(
                    spreadsheetId=sheet_id, body={"requests": requests}
                ).execute()

            # Write headers
            if headers:
                tab = tab_name or "Sheet1"
                sheets.spreadsheets().values().update(
                    spreadsheetId=sheet_id,
                    range=f"{tab}!A1",
                    valueInputOption="RAW",
                    body={"values": [headers]},
                ).execute()

            web_link = created.get(
                "webViewLink",
                f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit",
            )
            return {
                "success": True,
                "spreadsheetId": sheet_id,
                "title": title,
                "webViewLink": web_link,
                "headers": headers,
                "tab_name": tab_name or "Sheet1",
                "preview": f"[Sheets] Created '{title}' → {web_link}",
            }
        except Exception as e:
            return {"error": f"create failed: {e}"}

    # ── BUILD ─────────────────────────────────────────────────────────────────
    # Creates a complete, populated, formatted spreadsheet in one call.
    # params:
    #   title  : str  — spreadsheet name
    #   tabs   : list of tab definitions, each with:
    #     name     : str         — tab name
    #     headers  : list[str]   — header row (optional)
    #     rows     : list[list]  — data rows (optional)
    #     bg_color : str         — dark | blue | green | teal | purple | light | none
    #     format   : bool        — bold+color header row and freeze it (default True)
    if action == "build":
        title = params.get("title", "Untitled Spreadsheet")
        tabs  = params.get("tabs", [])
        if not tabs:
            return {"error": "Provide 'tabs': list of tab defs each with 'name', 'headers', 'rows'"}
        try:
            drive  = _drive_svc()
            folder = _default_folder()
            meta: dict[str, Any] = {
                "name": title,
                "mimeType": "application/vnd.google-apps.spreadsheet",
            }
            if folder:
                meta["parents"] = [folder]
            created  = drive.files().create(body=meta, fields="id,webViewLink").execute()
            sheet_id = created["id"]
            svc      = _sheets_svc()

            # Rename first tab + batch-add the rest
            info        = svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
            default_sid = info["sheets"][0]["properties"]["sheetId"]
            batch: list[dict] = []
            first_name = tabs[0].get("name", "Sheet1")
            if first_name != "Sheet1":
                batch.append({
                    "updateSheetProperties": {
                        "properties": {"sheetId": default_sid, "title": first_name},
                        "fields": "title",
                    }
                })
            for td in tabs[1:]:
                batch.append({"addSheet": {"properties": {"title": td.get("name", "Sheet")}}})
            if batch:
                svc.spreadsheets().batchUpdate(
                    spreadsheetId=sheet_id, body={"requests": batch}
                ).execute()

            # Refresh to get sheetIds for all tabs
            info       = svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
            tab_id_map = {
                s["properties"]["title"]: s["properties"]["sheetId"]
                for s in info["sheets"]
            }

            _colors = {
                "dark":   {"red": 0.23, "green": 0.23, "blue": 0.23},
                "blue":   {"red": 0.18, "green": 0.39, "blue": 0.78},
                "green":  {"red": 0.18, "green": 0.56, "blue": 0.34},
                "teal":   {"red": 0.10, "green": 0.46, "blue": 0.46},
                "purple": {"red": 0.40, "green": 0.23, "blue": 0.72},
                "light":  {"red": 0.85, "green": 0.85, "blue": 0.85},
                "none":   {"red": 1.0,  "green": 1.0,  "blue": 1.0},
            }
            fmt_requests: list[dict] = []
            tabs_summary  = []

            for td in tabs:
                tab_name  = td.get("name", "Sheet1")
                headers   = td.get("headers", [])
                rows      = td.get("rows", [])
                do_format = td.get("format", True)
                bg_color  = td.get("bg_color", "dark")
                tab_sid   = tab_id_map.get(tab_name)

                # Write headers + data in a single update
                all_data = []
                if headers:
                    all_data.append(headers)
                all_data.extend(rows)
                if all_data:
                    svc.spreadsheets().values().update(
                        spreadsheetId=sheet_id,
                        range=f"'{tab_name}'!A1",
                        valueInputOption="USER_ENTERED",
                        body={"values": all_data},
                    ).execute()

                # Queue bold+color header row + freeze
                if do_format and headers and tab_sid is not None:
                    bg       = _colors.get(bg_color, _colors["dark"])
                    is_light = bg_color in ("light", "none")
                    fg       = (
                        {"red": 0.0, "green": 0.0, "blue": 0.0}
                        if is_light
                        else {"red": 1.0, "green": 1.0, "blue": 1.0}
                    )
                    fmt_requests.append({
                        "repeatCell": {
                            "range": {
                                "sheetId": tab_sid,
                                "startRowIndex": 0, "endRowIndex": 1,
                                "startColumnIndex": 0,
                                "endColumnIndex": max(len(headers), 1),
                            },
                            "cell": {
                                "userEnteredFormat": {
                                    "backgroundColor": bg,
                                    "textFormat": {"bold": True, "foregroundColor": fg},
                                }
                            },
                            "fields": "userEnteredFormat(backgroundColor,textFormat)",
                        }
                    })
                    fmt_requests.append({
                        "updateSheetProperties": {
                            "properties": {
                                "sheetId": tab_sid,
                                "gridProperties": {"frozenRowCount": 1},
                            },
                            "fields": "gridProperties.frozenRowCount",
                        }
                    })

                tabs_summary.append({
                    "name": tab_name,
                    "headers": headers,
                    "data_rows": len(rows),
                })

            if fmt_requests:
                svc.spreadsheets().batchUpdate(
                    spreadsheetId=sheet_id, body={"requests": fmt_requests}
                ).execute()

            web_link    = created.get(
                "webViewLink",
                f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit",
            )
            total_rows  = sum(t["data_rows"] for t in tabs_summary)
            return {
                "success": True,
                "spreadsheetId": sheet_id,
                "title": title,
                "webViewLink": web_link,
                "tabs": tabs_summary,
                "total_data_rows": total_rows,
                "preview": (
                    f"[Sheets] Built '{title}' — {len(tabs_summary)} tab(s), "
                    f"{total_rows} data rows → {web_link}"
                ),
            }
        except Exception as e:
            return {"error": f"build failed: {e}"}

    # ── READ ──────────────────────────────────────────────────────────────────
    if action == "read":
        sheet_id = params.get("sheet_id", "")
        range_   = params.get("range", "Sheet1")
        if not sheet_id:
            return {"error": "Provide 'sheet_id'"}
        try:
            svc = _sheets_svc()
            result = svc.spreadsheets().values().get(
                spreadsheetId=sheet_id, range=range_
            ).execute()
            values = result.get("values", [])
            return {
                "success": True,
                "sheet_id": sheet_id,
                "range": result.get("range", range_),
                "rows": len(values),
                "values": values,
                "preview": f"[Sheets] Read {len(values)} rows from {range_}",
            }
        except Exception as e:
            return {"error": f"read failed: {e}"}

    # ── APPEND ────────────────────────────────────────────────────────────────
    if action == "append":
        sheet_id = params.get("sheet_id", "")
        rows     = params.get("rows", [])
        range_   = params.get("range", "Sheet1")
        if not sheet_id:
            return {"error": "Provide 'sheet_id'"}
        if not rows:
            return {"error": "Provide 'rows' (array of arrays)"}
        try:
            svc = _sheets_svc()
            result = svc.spreadsheets().values().append(
                spreadsheetId=sheet_id,
                range=range_,
                valueInputOption="USER_ENTERED",
                body={"values": rows},
            ).execute()
            updated = result.get("updates", {}).get("updatedRows", len(rows))
            return {
                "success": True,
                "sheet_id": sheet_id,
                "rows_appended": updated,
                "preview": f"[Sheets] Appended {updated} row(s) to {range_}",
            }
        except Exception as e:
            return {"error": f"append failed: {e}"}

    # ── UPDATE ────────────────────────────────────────────────────────────────
    if action == "update":
        sheet_id = params.get("sheet_id", "")
        values   = params.get("values", [])
        range_   = params.get("range", "A1")
        if not sheet_id:
            return {"error": "Provide 'sheet_id'"}
        if not values:
            return {"error": "Provide 'values' (array of arrays)"}
        try:
            svc = _sheets_svc()
            result = svc.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range=range_,
                valueInputOption="USER_ENTERED",
                body={"values": values},
            ).execute()
            return {
                "success": True,
                "sheet_id": sheet_id,
                "updated_cells": result.get("updatedCells", 0),
                "range": result.get("updatedRange", range_),
                "preview": f"[Sheets] Updated {result.get('updatedCells', 0)} cell(s) in {range_}",
            }
        except Exception as e:
            return {"error": f"update failed: {e}"}

    # ── CLEAR ─────────────────────────────────────────────────────────────────
    if action == "clear":
        sheet_id = params.get("sheet_id", "")
        range_   = params.get("range", "Sheet1")
        if not sheet_id:
            return {"error": "Provide 'sheet_id'"}
        try:
            svc = _sheets_svc()
            svc.spreadsheets().values().clear(
                spreadsheetId=sheet_id, range=range_
            ).execute()
            return {
                "success": True,
                "sheet_id": sheet_id,
                "cleared_range": range_,
                "preview": f"[Sheets] Cleared {range_}",
            }
        except Exception as e:
            return {"error": f"clear failed: {e}"}

    # ── GET INFO ──────────────────────────────────────────────────────────────
    if action == "get_info":
        sheet_id = params.get("sheet_id", "")
        if not sheet_id:
            return {"error": "Provide 'sheet_id'"}
        try:
            svc = _sheets_svc()
            info = svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
            tabs = []
            for s in info.get("sheets", []):
                p = s["properties"]
                tabs.append({
                    "tab_id": p["sheetId"],
                    "title": p["title"],
                    "index": p["index"],
                    "row_count": p.get("gridProperties", {}).get("rowCount", 0),
                    "column_count": p.get("gridProperties", {}).get("columnCount", 0),
                })
            return {
                "success": True,
                "spreadsheetId": sheet_id,
                "title": info.get("properties", {}).get("title", ""),
                "url": f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit",
                "tabs": tabs,
                "preview": f"[Sheets] '{info.get('properties', {}).get('title', '')}' — {len(tabs)} tab(s)",
            }
        except Exception as e:
            return {"error": f"get_info failed: {e}"}

    # ── LIST TABS ─────────────────────────────────────────────────────────────
    if action == "list_tabs":
        sheet_id = params.get("sheet_id", "")
        if not sheet_id:
            return {"error": "Provide 'sheet_id'"}
        try:
            svc = _sheets_svc()
            info = svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
            tabs = [
                {"title": s["properties"]["title"], "tab_id": s["properties"]["sheetId"]}
                for s in info.get("sheets", [])
            ]
            return {
                "success": True,
                "sheet_id": sheet_id,
                "tabs": tabs,
                "preview": f"[Sheets] {len(tabs)} tab(s): {', '.join(t['title'] for t in tabs)}",
            }
        except Exception as e:
            return {"error": f"list_tabs failed: {e}"}

    # ── ADD TAB ───────────────────────────────────────────────────────────────
    if action == "add_tab":
        sheet_id = params.get("sheet_id", "")
        tab_name = params.get("tab_name", "New Sheet")
        if not sheet_id:
            return {"error": "Provide 'sheet_id'"}
        try:
            svc = _sheets_svc()
            result = svc.spreadsheets().batchUpdate(
                spreadsheetId=sheet_id,
                body={"requests": [{"addSheet": {"properties": {"title": tab_name}}}]},
            ).execute()
            new_tab = result["replies"][0]["addSheet"]["properties"]
            return {
                "success": True,
                "sheet_id": sheet_id,
                "tab_name": new_tab["title"],
                "tab_id": new_tab["sheetId"],
                "preview": f"[Sheets] Added tab '{new_tab['title']}'",
            }
        except Exception as e:
            return {"error": f"add_tab failed: {e}"}

    # ── RENAME TAB ────────────────────────────────────────────────────────────
    if action == "rename_tab":
        sheet_id  = params.get("sheet_id", "")
        old_name  = params.get("tab_name", "")
        new_name  = params.get("new_name", "")
        if not sheet_id:
            return {"error": "Provide 'sheet_id'"}
        if not new_name:
            return {"error": "Provide 'new_name'"}
        try:
            svc = _sheets_svc()
            info = svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
            # Find the tab by name or use the first one
            tab_id = None
            for s in info.get("sheets", []):
                if not old_name or s["properties"]["title"].lower() == old_name.lower():
                    tab_id = s["properties"]["sheetId"]
                    break
            if tab_id is None:
                return {"error": f"Tab '{old_name}' not found"}
            svc.spreadsheets().batchUpdate(
                spreadsheetId=sheet_id,
                body={"requests": [{"updateSheetProperties": {
                    "properties": {"sheetId": tab_id, "title": new_name},
                    "fields": "title",
                }}]},
            ).execute()
            return {
                "success": True,
                "sheet_id": sheet_id,
                "old_name": old_name,
                "new_name": new_name,
                "preview": f"[Sheets] Renamed tab '{old_name}' → '{new_name}'",
            }
        except Exception as e:
            return {"error": f"rename_tab failed: {e}"}

    # ── DELETE ROWS ───────────────────────────────────────────────────────────
    if action == "delete_rows":
        sheet_id   = params.get("sheet_id", "")
        row_numbers = params.get("row_numbers", [])   # 1-based, sorted desc for safety
        tab_name   = params.get("tab_name", "Sheet1")
        if not sheet_id:
            return {"error": "Provide 'sheet_id'"}
        if not row_numbers:
            return {"error": "Provide 'row_numbers' (1-based list of row numbers to delete)"}
        try:
            svc = _sheets_svc()
            info = svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
            # Resolve tab_id
            tab_id = None
            for s in info.get("sheets", []):
                if s["properties"]["title"].lower() == tab_name.lower():
                    tab_id = s["properties"]["sheetId"]
                    break
            if tab_id is None:
                tab_id = info["sheets"][0]["properties"]["sheetId"]
            # Delete from bottom up to preserve indices
            requests = []
            for r in sorted(set(row_numbers), reverse=True):
                requests.append({
                    "deleteDimension": {
                        "range": {
                            "sheetId": tab_id,
                            "dimension": "ROWS",
                            "startIndex": r - 1,   # 0-based
                            "endIndex": r,
                        }
                    }
                })
            svc.spreadsheets().batchUpdate(
                spreadsheetId=sheet_id, body={"requests": requests}
            ).execute()
            return {
                "success": True,
                "sheet_id": sheet_id,
                "deleted_rows": sorted(row_numbers),
                "preview": f"[Sheets] Deleted {len(row_numbers)} row(s) from {tab_name}",
            }
        except Exception as e:
            return {"error": f"delete_rows failed: {e}"}

    # ── FORMAT HEADERS ────────────────────────────────────────────────────────
    if action == "format_headers":
        sheet_id = params.get("sheet_id", "")
        tab_name = params.get("tab_name", "Sheet1")
        bg_color = params.get("bg_color", "dark")  # dark | light | none
        if not sheet_id:
            return {"error": "Provide 'sheet_id'"}
        try:
            svc = _sheets_svc()
            info = svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
            tab_id = None
            col_count = 26
            for s in info.get("sheets", []):
                if s["properties"]["title"].lower() == tab_name.lower():
                    tab_id = s["properties"]["sheetId"]
                    col_count = s["properties"].get("gridProperties", {}).get("columnCount", 26)
                    break
            if tab_id is None:
                tab_id = info["sheets"][0]["properties"]["sheetId"]

            # Color presets
            colors = {
                "dark":  {"red": 0.23, "green": 0.23, "blue": 0.23},
                "blue":  {"red": 0.18, "green": 0.39, "blue": 0.78},
                "green": {"red": 0.18, "green": 0.56, "blue": 0.34},
                "light": {"red": 0.85, "green": 0.85, "blue": 0.85},
                "none":  {"red": 1.0,  "green": 1.0,  "blue": 1.0},
            }
            bg = colors.get(bg_color, colors["dark"])

            svc.spreadsheets().batchUpdate(
                spreadsheetId=sheet_id,
                body={"requests": [{
                    "repeatCell": {
                        "range": {
                            "sheetId": tab_id,
                            "startRowIndex": 0, "endRowIndex": 1,
                            "startColumnIndex": 0, "endColumnIndex": col_count,
                        },
                        "cell": {
                            "userEnteredFormat": {
                                "backgroundColor": bg,
                                "textFormat": {
                                    "bold": True,
                                    "foregroundColor": (
                                        {"red": 1.0, "green": 1.0, "blue": 1.0}
                                        if bg_color not in ("light", "none")
                                        else {"red": 0.0, "green": 0.0, "blue": 0.0}
                                    ),
                                },
                            }
                        },
                        "fields": "userEnteredFormat(backgroundColor,textFormat)",
                    }
                }]},
            ).execute()
            return {
                "success": True,
                "sheet_id": sheet_id,
                "tab_name": tab_name,
                "bg_color": bg_color,
                "preview": f"[Sheets] Formatted header row in '{tab_name}' ({bg_color} theme)",
            }
        except Exception as e:
            return {"error": f"format_headers failed: {e}"}

    # ── FIND ──────────────────────────────────────────────────────────────────
    if action == "find":
        sheet_id = params.get("sheet_id", "")
        query    = params.get("query", "")
        tab_name = params.get("tab_name", "")
        if not sheet_id:
            return {"error": "Provide 'sheet_id'"}
        if not query:
            return {"error": "Provide 'query' (value to search for)"}
        try:
            svc = _sheets_svc()
            info = svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
            tabs_to_search = []
            for s in info.get("sheets", []):
                title = s["properties"]["title"]
                if not tab_name or title.lower() == tab_name.lower():
                    tabs_to_search.append(title)

            matches = []
            for tab in tabs_to_search:
                result = svc.spreadsheets().values().get(
                    spreadsheetId=sheet_id, range=tab
                ).execute()
                rows = result.get("values", [])
                for r_idx, row in enumerate(rows):
                    for c_idx, cell in enumerate(row):
                        if query.lower() in str(cell).lower():
                            col_letter = chr(ord("A") + c_idx) if c_idx < 26 else f"col{c_idx+1}"
                            matches.append({
                                "tab": tab,
                                "cell": f"{col_letter}{r_idx + 1}",
                                "row": r_idx + 1,
                                "col": c_idx + 1,
                                "value": cell,
                            })
                            if len(matches) >= 50:
                                break
                    if len(matches) >= 50:
                        break

            return {
                "success": True,
                "sheet_id": sheet_id,
                "query": query,
                "match_count": len(matches),
                "matches": matches,
                "preview": f"[Sheets] Found {len(matches)} match(es) for '{query}'",
            }
        except Exception as e:
            return {"error": f"find failed: {e}"}

    return {
        "error": (
            f"Unknown action '{action}'. "
            "Use: build | create | read | append | update | clear | get_info | "
            "list_tabs | add_tab | rename_tab | delete_rows | format_headers | find"
        )
    }
