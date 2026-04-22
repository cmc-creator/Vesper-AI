"""google_slides.py — Vesper Google Slides tool.

Unified action-based interface for creating and editing Google Slides presentations.
Called from main.py as: await google_slides_tool(params)

Actions
-------
create          Create a new presentation with an optional title slide
get_info        Get slide count, IDs, and text summary for each slide
add_slide       Add a new slide with a title and body/bullet text
update_text     Find and replace text throughout a presentation (replaceAllText)
delete_slide    Remove a slide by 0-based index
duplicate_slide Duplicate a slide (copy it to the next position)
add_text_box    Add a floating text box to a specific slide
set_background  Set background color for a slide (hex or preset name)
rename          Rename (change title of) the presentation
export          Get export/download link (pdf | pptx)
"""

from typing import Any


# ── Slide geometry constants (EMU = English Metric Units, 914400 EMU = 1 inch) ──
_SLIDE_W = 9144000   # 10 inches wide
_SLIDE_H = 5143500   # 5.625 inches tall
_MARGIN  = 457200    # 0.5 inch margin


# ── Helpers ───────────────────────────────────────────────────────────────────

def _slides_svc():
    from main import get_google_service
    return get_google_service("slides", "v1")


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


def _emu_rect(x_inch: float, y_inch: float, w_inch: float, h_inch: float) -> dict:
    """Return a Slides API elementProperties size+transform dict."""
    U = 914400  # EMU per inch
    return {
        "size": {
            "width":  {"magnitude": int(w_inch * U), "unit": "EMU"},
            "height": {"magnitude": int(h_inch * U), "unit": "EMU"},
        },
        "transform": {
            "scaleX": 1, "scaleY": 1,
            "translateX": int(x_inch * U),
            "translateY": int(y_inch * U),
            "unit": "EMU",
        },
    }


def _get_slide_texts(presentation: dict) -> list[dict]:
    """Return a summary of each slide's text content."""
    summaries = []
    for i, slide in enumerate(presentation.get("slides", [])):
        texts = []
        for elem in slide.get("pageElements", []):
            shape = elem.get("shape", {})
            text_content = shape.get("text", {})
            for te in text_content.get("textElements", []):
                tr = te.get("textRun", {})
                if tr.get("content", "").strip():
                    texts.append(tr["content"].strip())
        summaries.append({
            "index": i,
            "slide_id": slide.get("objectId", ""),
            "text": " | ".join(texts) if texts else "(blank)",
        })
    return summaries


def _hex_to_rgb(hex_color: str) -> dict:
    """Convert #RRGGBB or RRGGBB to Slides API RGB dict (0-1 scale)."""
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c*2 for c in h)
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return {"red": r/255, "green": g/255, "blue": b/255}


_COLOR_PRESETS = {
    "white":   "#FFFFFF",
    "black":   "#000000",
    "dark":    "#212121",
    "navy":    "#1A237E",
    "blue":    "#1565C0",
    "teal":    "#00695C",
    "green":   "#2E7D32",
    "purple":  "#6A1B9A",
    "red":     "#C62828",
    "orange":  "#E65100",
    "yellow":  "#F9A825",
    "grey":    "#546E7A",
    "gray":    "#546E7A",
    "light":   "#F5F5F5",
}


# ── Main tool ─────────────────────────────────────────────────────────────────

async def google_slides_tool(params: dict, **kwargs) -> dict:
    """Unified Google Slides tool. See module docstring for actions."""

    action = params.get("action", "").lower().strip()
    if not action:
        return {"error": "Provide 'action': create | get_info | add_slide | update_text | delete_slide | duplicate_slide | add_text_box | set_background | rename | export"}

    err = _check_google()
    if err:
        return {"error": err}

    # ── CREATE ────────────────────────────────────────────────────────────────
    if action == "create":
        title      = params.get("title", "Untitled Presentation")
        slide_title = params.get("slide_title", title)
        slide_body  = params.get("slide_body", "") or params.get("subtitle", "")
        try:
            drive  = _drive_svc()
            folder = _default_folder()
            meta: dict[str, Any] = {
                "name": title,
                "mimeType": "application/vnd.google-apps.presentation",
            }
            if folder:
                meta["parents"] = [folder]
            created = drive.files().create(body=meta, fields="id,webViewLink").execute()
            pres_id = created["id"]

            svc = _slides_svc()
            pres = svc.presentations().get(presentationId=pres_id).execute()
            first_slide_id = pres["slides"][0]["objectId"]

            # Add title text box
            requests = []
            title_box_id = "title_box_0"
            requests.append({
                "createShape": {
                    "objectId": title_box_id,
                    "shapeType": "TEXT_BOX",
                    "elementProperties": {
                        "pageObjectId": first_slide_id,
                        **_emu_rect(0.5, 1.0, 9.0, 1.8),
                    },
                }
            })
            requests.append({"insertText": {"objectId": title_box_id, "text": slide_title}})
            # Style: larger font
            requests.append({
                "updateTextStyle": {
                    "objectId": title_box_id,
                    "style": {"fontSize": {"magnitude": 40, "unit": "PT"}, "bold": True},
                    "fields": "fontSize,bold",
                }
            })

            if slide_body:
                body_box_id = "body_box_0"
                requests.append({
                    "createShape": {
                        "objectId": body_box_id,
                        "shapeType": "TEXT_BOX",
                        "elementProperties": {
                            "pageObjectId": first_slide_id,
                            **_emu_rect(0.5, 3.0, 9.0, 2.0),
                        },
                    }
                })
                requests.append({"insertText": {"objectId": body_box_id, "text": slide_body}})
                requests.append({
                    "updateTextStyle": {
                        "objectId": body_box_id,
                        "style": {"fontSize": {"magnitude": 24, "unit": "PT"}},
                        "fields": "fontSize",
                    }
                })

            svc.presentations().batchUpdate(
                presentationId=pres_id, body={"requests": requests}
            ).execute()

            url = created.get("webViewLink", f"https://docs.google.com/presentation/d/{pres_id}/edit")
            return {
                "success": True,
                "presentationId": pres_id,
                "title": title,
                "webViewLink": url,
                "preview": f"[Slides] Created '{title}' → {url}",
            }
        except Exception as e:
            return {"error": f"create failed: {e}"}

    # ── GET INFO ──────────────────────────────────────────────────────────────
    if action == "get_info":
        pres_id = params.get("presentation_id", "") or params.get("pres_id", "")
        if not pres_id:
            return {"error": "Provide 'presentation_id'"}
        try:
            svc  = _slides_svc()
            pres = svc.presentations().get(presentationId=pres_id).execute()
            slides = _get_slide_texts(pres)
            return {
                "success": True,
                "presentationId": pres_id,
                "title": pres.get("title", ""),
                "slide_count": len(slides),
                "slides": slides,
                "webViewLink": f"https://docs.google.com/presentation/d/{pres_id}/edit",
                "preview": f"[Slides] '{pres.get('title', '')}' — {len(slides)} slide(s)",
            }
        except Exception as e:
            return {"error": f"get_info failed: {e}"}

    # ── ADD SLIDE ─────────────────────────────────────────────────────────────
    if action == "add_slide":
        pres_id    = params.get("presentation_id", "") or params.get("pres_id", "")
        slide_title = params.get("title", "")
        slide_body  = params.get("body", "") or params.get("content", "")
        insert_at   = params.get("insert_at", None)   # 0-based; None = append
        if not pres_id:
            return {"error": "Provide 'presentation_id'"}
        try:
            svc  = _slides_svc()
            pres = svc.presentations().get(presentationId=pres_id).execute()
            slide_count = len(pres.get("slides", []))
            position = insert_at if insert_at is not None else slide_count

            import uuid
            new_slide_id = "slide_" + uuid.uuid4().hex[:8]
            requests: list[dict] = [{
                "createSlide": {
                    "objectId": new_slide_id,
                    "insertionIndex": position,
                    "slideLayoutReference": {"predefinedLayout": "BLANK"},
                }
            }]

            if slide_title:
                tb_id = "stitle_" + uuid.uuid4().hex[:8]
                requests += [
                    {
                        "createShape": {
                            "objectId": tb_id,
                            "shapeType": "TEXT_BOX",
                            "elementProperties": {
                                "pageObjectId": new_slide_id,
                                **_emu_rect(0.5, 0.4, 9.0, 1.4),
                            },
                        }
                    },
                    {"insertText": {"objectId": tb_id, "text": slide_title}},
                    {
                        "updateTextStyle": {
                            "objectId": tb_id,
                            "style": {"fontSize": {"magnitude": 32, "unit": "PT"}, "bold": True},
                            "fields": "fontSize,bold",
                        }
                    },
                ]

            if slide_body:
                bb_id = "sbody_" + uuid.uuid4().hex[:8]
                requests += [
                    {
                        "createShape": {
                            "objectId": bb_id,
                            "shapeType": "TEXT_BOX",
                            "elementProperties": {
                                "pageObjectId": new_slide_id,
                                **_emu_rect(0.5, 2.0, 9.0, 3.0),
                            },
                        }
                    },
                    {"insertText": {"objectId": bb_id, "text": slide_body}},
                    {
                        "updateTextStyle": {
                            "objectId": bb_id,
                            "style": {"fontSize": {"magnitude": 20, "unit": "PT"}},
                            "fields": "fontSize",
                        }
                    },
                ]

            svc.presentations().batchUpdate(
                presentationId=pres_id, body={"requests": requests}
            ).execute()

            return {
                "success": True,
                "presentationId": pres_id,
                "new_slide_id": new_slide_id,
                "position": position,
                "preview": f"[Slides] Added slide at position {position}: '{slide_title}'",
            }
        except Exception as e:
            return {"error": f"add_slide failed: {e}"}

    # ── UPDATE TEXT (find & replace throughout presentation) ──────────────────
    if action == "update_text":
        pres_id  = params.get("presentation_id", "") or params.get("pres_id", "")
        old_text = params.get("old_text", "") or params.get("find", "")
        new_text = params.get("new_text", "") or params.get("replace", "")
        match_case = bool(params.get("match_case", False))
        if not pres_id:
            return {"error": "Provide 'presentation_id'"}
        if not old_text:
            return {"error": "Provide 'old_text' (text to find)"}
        try:
            svc = _slides_svc()
            result = svc.presentations().batchUpdate(
                presentationId=pres_id,
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
                "presentationId": pres_id,
                "occurrences_changed": replaced,
                "preview": f"[Slides] Replaced {replaced} occurrence(s) of '{old_text}'",
            }
        except Exception as e:
            return {"error": f"update_text failed: {e}"}

    # ── DELETE SLIDE ──────────────────────────────────────────────────────────
    if action == "delete_slide":
        pres_id = params.get("presentation_id", "") or params.get("pres_id", "")
        index   = params.get("index", 0)  # 0-based
        if not pres_id:
            return {"error": "Provide 'presentation_id'"}
        try:
            svc  = _slides_svc()
            pres = svc.presentations().get(presentationId=pres_id).execute()
            slides = pres.get("slides", [])
            if index >= len(slides):
                return {"error": f"Slide index {index} out of range (presentation has {len(slides)} slides)"}
            slide_id = slides[index]["objectId"]
            svc.presentations().batchUpdate(
                presentationId=pres_id,
                body={"requests": [{"deleteObject": {"objectId": slide_id}}]},
            ).execute()
            return {
                "success": True,
                "presentationId": pres_id,
                "deleted_index": index,
                "deleted_slide_id": slide_id,
                "preview": f"[Slides] Deleted slide at index {index}",
            }
        except Exception as e:
            return {"error": f"delete_slide failed: {e}"}

    # ── DUPLICATE SLIDE ───────────────────────────────────────────────────────
    if action == "duplicate_slide":
        pres_id = params.get("presentation_id", "") or params.get("pres_id", "")
        index   = params.get("index", 0)  # 0-based
        if not pres_id:
            return {"error": "Provide 'presentation_id'"}
        try:
            svc  = _slides_svc()
            pres = svc.presentations().get(presentationId=pres_id).execute()
            slides = pres.get("slides", [])
            if index >= len(slides):
                return {"error": f"Slide index {index} out of range"}
            slide_id = slides[index]["objectId"]
            result = svc.presentations().batchUpdate(
                presentationId=pres_id,
                body={"requests": [{"duplicateObject": {"objectId": slide_id}}]},
            ).execute()
            new_id = result["replies"][0]["duplicateObject"]["objectId"]
            return {
                "success": True,
                "presentationId": pres_id,
                "source_index": index,
                "new_slide_id": new_id,
                "preview": f"[Slides] Duplicated slide {index} → new slide ID {new_id}",
            }
        except Exception as e:
            return {"error": f"duplicate_slide failed: {e}"}

    # ── ADD TEXT BOX ──────────────────────────────────────────────────────────
    if action == "add_text_box":
        pres_id = params.get("presentation_id", "") or params.get("pres_id", "")
        index   = params.get("index", 0)  # slide index, 0-based
        text    = params.get("text", "")
        x       = float(params.get("x", 0.5))
        y       = float(params.get("y", 1.0))
        w       = float(params.get("width", 9.0))
        h       = float(params.get("height", 1.0))
        font_sz = int(params.get("font_size", 18))
        bold    = bool(params.get("bold", False))
        if not pres_id:
            return {"error": "Provide 'presentation_id'"}
        if not text:
            return {"error": "Provide 'text'"}
        try:
            import uuid
            svc  = _slides_svc()
            pres = svc.presentations().get(presentationId=pres_id).execute()
            slides = pres.get("slides", [])
            if index >= len(slides):
                return {"error": f"Slide index {index} out of range"}
            slide_id = slides[index]["objectId"]
            box_id = "tb_" + uuid.uuid4().hex[:8]

            requests = [
                {
                    "createShape": {
                        "objectId": box_id,
                        "shapeType": "TEXT_BOX",
                        "elementProperties": {
                            "pageObjectId": slide_id,
                            **_emu_rect(x, y, w, h),
                        },
                    }
                },
                {"insertText": {"objectId": box_id, "text": text}},
                {
                    "updateTextStyle": {
                        "objectId": box_id,
                        "style": {
                            "fontSize": {"magnitude": font_sz, "unit": "PT"},
                            "bold": bold,
                        },
                        "fields": "fontSize,bold",
                    }
                },
            ]
            svc.presentations().batchUpdate(
                presentationId=pres_id, body={"requests": requests}
            ).execute()
            return {
                "success": True,
                "presentationId": pres_id,
                "slide_index": index,
                "text_box_id": box_id,
                "preview": f"[Slides] Added text box to slide {index}: '{text[:60]}'",
            }
        except Exception as e:
            return {"error": f"add_text_box failed: {e}"}

    # ── SET BACKGROUND ────────────────────────────────────────────────────────
    if action == "set_background":
        pres_id = params.get("presentation_id", "") or params.get("pres_id", "")
        index   = params.get("index", None)  # None = all slides
        color   = params.get("color", "white")
        if not pres_id:
            return {"error": "Provide 'presentation_id'"}
        # Resolve color
        hex_color = _COLOR_PRESETS.get(color.lower(), color)
        rgb = _hex_to_rgb(hex_color)
        try:
            svc  = _slides_svc()
            pres = svc.presentations().get(presentationId=pres_id).execute()
            slides = pres.get("slides", [])
            target_slides = [slides[index]] if index is not None else slides
            if index is not None and index >= len(slides):
                return {"error": f"Slide index {index} out of range"}

            requests = []
            for slide in target_slides:
                requests.append({
                    "updatePageProperties": {
                        "objectId": slide["objectId"],
                        "pageProperties": {
                            "pageBackgroundFill": {
                                "solidFill": {"color": {"rgbColor": rgb}}
                            }
                        },
                        "fields": "pageBackgroundFill",
                    }
                })
            svc.presentations().batchUpdate(
                presentationId=pres_id, body={"requests": requests}
            ).execute()

            scope = f"slide {index}" if index is not None else f"all {len(target_slides)} slide(s)"
            return {
                "success": True,
                "presentationId": pres_id,
                "color": color,
                "hex": hex_color,
                "slides_updated": len(target_slides),
                "preview": f"[Slides] Set {scope} background to {color} ({hex_color})",
            }
        except Exception as e:
            return {"error": f"set_background failed: {e}"}

    # ── RENAME ────────────────────────────────────────────────────────────────
    if action == "rename":
        pres_id   = params.get("presentation_id", "") or params.get("pres_id", "")
        new_title = params.get("title", "") or params.get("new_title", "")
        if not pres_id:
            return {"error": "Provide 'presentation_id'"}
        if not new_title:
            return {"error": "Provide 'title'"}
        try:
            _drive_svc().files().update(fileId=pres_id, body={"name": new_title}).execute()
            return {
                "success": True,
                "presentationId": pres_id,
                "new_title": new_title,
                "webViewLink": f"https://docs.google.com/presentation/d/{pres_id}/edit",
                "preview": f"[Slides] Renamed presentation to '{new_title}'",
            }
        except Exception as e:
            return {"error": f"rename failed: {e}"}

    # ── EXPORT ────────────────────────────────────────────────────────────────
    if action == "export":
        pres_id = params.get("presentation_id", "") or params.get("pres_id", "")
        fmt     = params.get("format", "pdf").lower()
        if not pres_id:
            return {"error": "Provide 'presentation_id'"}
        fmt_map = {
            "pdf":  "pdf",
            "pptx": "pptx",
            "odp":  "odp",
            "png":  "png",
            "svg":  "svg",
        }
        export_fmt = fmt_map.get(fmt, "pdf")
        export_url = f"https://docs.google.com/presentation/d/{pres_id}/export/{export_fmt}"
        try:
            _drive_svc().files().get(fileId=pres_id, fields="id,name").execute()
            return {
                "success": True,
                "presentationId": pres_id,
                "format": export_fmt,
                "export_url": export_url,
                "preview": f"[Slides] Export as {export_fmt.upper()}: {export_url}",
            }
        except Exception as e:
            return {"error": f"export failed: {e}"}

    return {
        "error": (
            f"Unknown action '{action}'. "
            "Use: create | get_info | add_slide | update_text | delete_slide | "
            "duplicate_slide | add_text_box | set_background | rename | export"
        )
    }
