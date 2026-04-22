"""
Notion tool for Vesper — full CRUD on Notion pages, databases, and blocks.

Requires:
  NOTION_API_KEY env var (Integration token from notion.so/my-integrations)

Actions:
  search         — search all pages/databases by title
  get_page       — read a page's properties + blocks (full content)
  create_page    — create a new page in a database or as a child of a page
  update_page    — update page properties (title, status, etc.)
  append_blocks  — append text/content blocks to a page
  get_database   — get database schema + recent rows
  query_database — query a database with filters/sorts
  create_row     — create a new row in a database
  update_row     — update an existing database row's properties
  get_block      — get a specific block's content
  delete_page    — archive (soft-delete) a page
"""

import os
import json
import aiohttp
from typing import Optional, Any

_NOTION_VERSION = "2022-06-28"


def _headers() -> dict:
    key = os.environ.get("NOTION_API_KEY", "")
    if not key:
        raise ValueError("NOTION_API_KEY environment variable not set")
    return {
        "Authorization": f"Bearer {key}",
        "Notion-Version": _NOTION_VERSION,
        "Content-Type": "application/json",
    }


async def _notion_request(method: str, path: str, body: dict = None) -> dict:
    url = f"https://api.notion.com/v1{path}"
    try:
        async with aiohttp.ClientSession() as s:
            kwargs = {
                "headers": _headers(),
                "timeout": aiohttp.ClientTimeout(total=15),
            }
            if body is not None:
                kwargs["json"] = body
            async with getattr(s, method)(url, **kwargs) as r:
                data = await r.json()
                if r.status not in (200, 201, 204):
                    return {"error": data.get("message", f"HTTP {r.status}"), "status": r.status}
                return data
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": f"Notion request failed: {e}"}


def _extract_rich_text(rt_list: list) -> str:
    return "".join(t.get("plain_text", "") for t in rt_list) if rt_list else ""


def _extract_title(props: dict) -> str:
    for key in ("title", "Name", "Title"):
        if key in props:
            prop = props[key]
            if prop.get("type") == "title":
                return _extract_rich_text(prop.get("title", []))
    # Fallback — find any title-type property
    for prop in props.values():
        if isinstance(prop, dict) and prop.get("type") == "title":
            return _extract_rich_text(prop.get("title", []))
    return "(Untitled)"


def _blocks_to_text(blocks: list, max_chars: int = 8000) -> str:
    lines = []
    for block in blocks:
        bt = block.get("type", "")
        b = block.get(bt, {})

        if bt in ("paragraph", "quote", "callout"):
            text = _extract_rich_text(b.get("rich_text", []))
            if text:
                lines.append(text)
        elif bt in ("heading_1",):
            lines.append(f"# {_extract_rich_text(b.get('rich_text', []))}")
        elif bt in ("heading_2",):
            lines.append(f"## {_extract_rich_text(b.get('rich_text', []))}")
        elif bt in ("heading_3",):
            lines.append(f"### {_extract_rich_text(b.get('rich_text', []))}")
        elif bt == "bulleted_list_item":
            lines.append(f"- {_extract_rich_text(b.get('rich_text', []))}")
        elif bt == "numbered_list_item":
            lines.append(f"1. {_extract_rich_text(b.get('rich_text', []))}")
        elif bt == "to_do":
            checked = "x" if b.get("checked") else " "
            lines.append(f"- [{checked}] {_extract_rich_text(b.get('rich_text', []))}")
        elif bt == "divider":
            lines.append("---")
        elif bt == "code":
            lang = b.get("language", "")
            code = _extract_rich_text(b.get("rich_text", []))
            lines.append(f"```{lang}\n{code}\n```")
        elif bt == "image":
            src = b.get("external", {}).get("url") or b.get("file", {}).get("url", "")
            lines.append(f"[Image: {src}]")
        elif bt == "child_page":
            lines.append(f"[Child page: {b.get('title', '')}]")

    text = "\n".join(lines)
    if len(text) > max_chars:
        text = text[:max_chars] + f"\n...[truncated, {len(text)} total chars]"
    return text


def _prop_value(prop: dict) -> Any:
    """Extract a human-readable value from a Notion property."""
    t = prop.get("type", "")
    val = prop.get(t)
    if t == "title":
        return _extract_rich_text(val or [])
    elif t == "rich_text":
        return _extract_rich_text(val or [])
    elif t == "number":
        return val
    elif t == "select":
        return val.get("name") if val else None
    elif t == "multi_select":
        return [s.get("name") for s in (val or [])]
    elif t == "date":
        return val.get("start") if val else None
    elif t == "checkbox":
        return val
    elif t == "url":
        return val
    elif t == "email":
        return val
    elif t == "phone_number":
        return val
    elif t == "status":
        return val.get("name") if val else None
    elif t == "relation":
        return [r.get("id") for r in (val or [])]
    elif t == "formula":
        ftype = val.get("type", "")
        return val.get(ftype)
    elif t == "rollup":
        return val.get("number") or val.get("date") or val.get("array")
    elif t == "created_time":
        return val
    elif t == "last_edited_time":
        return val
    elif t == "people":
        return [p.get("name", p.get("id")) for p in (val or [])]
    else:
        return str(val)[:100] if val is not None else None


def _rich_text_obj(text: str) -> list:
    return [{"type": "text", "text": {"content": text}}]


def _text_to_blocks(text: str) -> list:
    """Convert plain text (with markdown-ish lines) to Notion blocks."""
    blocks = []
    for line in text.split("\n"):
        line = line.rstrip()
        if not line:
            continue
        if line.startswith("# "):
            blocks.append({"object": "block", "type": "heading_1", "heading_1": {"rich_text": _rich_text_obj(line[2:])}})
        elif line.startswith("## "):
            blocks.append({"object": "block", "type": "heading_2", "heading_2": {"rich_text": _rich_text_obj(line[3:])}})
        elif line.startswith("### "):
            blocks.append({"object": "block", "type": "heading_3", "heading_3": {"rich_text": _rich_text_obj(line[4:])}})
        elif line.startswith("- [ ] ") or line.startswith("- [x] "):
            checked = line[3] == "x"
            blocks.append({"object": "block", "type": "to_do", "to_do": {"rich_text": _rich_text_obj(line[6:]), "checked": checked}})
        elif line.startswith("- ") or line.startswith("* "):
            blocks.append({"object": "block", "type": "bulleted_list_item", "bulleted_list_item": {"rich_text": _rich_text_obj(line[2:])}})
        elif line.startswith("---"):
            blocks.append({"object": "block", "type": "divider", "divider": {}})
        else:
            blocks.append({"object": "block", "type": "paragraph", "paragraph": {"rich_text": _rich_text_obj(line)}})
    return blocks


async def notion_tool(params: dict, **kwargs) -> dict:
    action = params.get("action", "search").lower()

    if action == "search":
        query = params.get("query", "").strip()
        filter_type = params.get("filter", "")  # "page" or "database"
        body = {"query": query, "page_size": int(params.get("max_results", 20))}
        if filter_type in ("page", "database"):
            body["filter"] = {"value": filter_type, "property": "object"}
        result = await _notion_request("post", "/search", body)
        if "error" in result:
            return result
        items = result.get("results", [])
        lines = [f"🔍 **Search: '{query}'** — {len(items)} result(s)\n"]
        for item in items:
            obj_type = item.get("object", "")
            title = _extract_title(item.get("properties", {})) if obj_type == "page" else item.get("title", [{}])[0].get("plain_text", "(Untitled)") if item.get("title") else "(Untitled)"
            url = item.get("url", "")
            icon = "📄" if obj_type == "page" else "🗃️"
            lines.append(f"{icon} **{title}**")
            lines.append(f"  ID: `{item['id']}` | [Open in Notion]({url})")
        return {"results": items, "count": len(items), "preview": "\n".join(lines)}

    elif action == "get_page":
        page_id = params.get("page_id", "").strip().replace("-", "")
        if not page_id:
            return {"error": "page_id is required"}
        max_chars = int(params.get("max_chars", 8000))

        page = await _notion_request("get", f"/pages/{page_id}")
        if "error" in page:
            return page

        blocks_resp = await _notion_request("get", f"/blocks/{page_id}/children?page_size=100")
        if "error" in blocks_resp:
            return blocks_resp

        props = page.get("properties", {})
        title = _extract_title(props)
        content = _blocks_to_text(blocks_resp.get("results", []), max_chars)

        # Extract readable properties
        readable_props = {k: _prop_value(v) for k, v in props.items() if k != "title" and k != "Name"}
        readable_props = {k: v for k, v in readable_props.items() if v is not None}

        preview = f"📄 **{title}**\n\n{content[:3000]}"
        return {
            "page_id": page_id,
            "title": title,
            "url": page.get("url"),
            "properties": readable_props,
            "content": content,
            "preview": preview,
        }

    elif action == "create_page":
        parent_id = params.get("parent_id", "").strip()
        parent_type = params.get("parent_type", "page")  # "page" or "database"
        title = params.get("title", "New Page")
        content = params.get("content", "")
        extra_props = params.get("properties", {})  # dict of additional DB props

        if not parent_id:
            return {"error": "parent_id is required (page or database ID)"}

        parent = {"database_id": parent_id} if parent_type == "database" else {"page_id": parent_id}
        properties = {"title": {"title": _rich_text_obj(title)}}

        # Merge extra_props (for database rows)
        if extra_props and parent_type == "database":
            for key, val in extra_props.items():
                if isinstance(val, str):
                    properties[key] = {"rich_text": _rich_text_obj(val)}
                elif isinstance(val, bool):
                    properties[key] = {"checkbox": val}
                elif isinstance(val, (int, float)):
                    properties[key] = {"number": val}
                elif isinstance(val, dict) and "select" in val:
                    properties[key] = {"select": {"name": val["select"]}}

        body: dict = {"parent": parent, "properties": properties}
        if content:
            body["children"] = _text_to_blocks(content)

        result = await _notion_request("post", "/pages", body)
        if "error" in result:
            return result

        return {
            "page_id": result.get("id"),
            "url": result.get("url"),
            "title": title,
            "preview": f"✅ Created Notion page: **{title}**\n[Open]({result.get('url')})",
        }

    elif action == "update_page":
        page_id = params.get("page_id", "").strip().replace("-", "")
        if not page_id:
            return {"error": "page_id is required"}

        title = params.get("title")
        extra_props = params.get("properties", {})
        archived = params.get("archived", None)

        properties = {}
        if title:
            properties["title"] = {"title": _rich_text_obj(title)}
        for key, val in extra_props.items():
            if isinstance(val, str):
                properties[key] = {"rich_text": _rich_text_obj(val)}
            elif isinstance(val, bool):
                properties[key] = {"checkbox": val}
            elif isinstance(val, (int, float)):
                properties[key] = {"number": val}
            elif isinstance(val, dict) and "select" in val:
                properties[key] = {"select": {"name": val["select"]}}

        body: dict = {}
        if properties:
            body["properties"] = properties
        if archived is not None:
            body["archived"] = archived

        result = await _notion_request("patch", f"/pages/{page_id}", body)
        if "error" in result:
            return result
        return {"success": True, "page_id": page_id, "url": result.get("url"), "preview": f"✅ Updated page `{page_id}`"}

    elif action == "append_blocks":
        page_id = params.get("page_id", "").strip().replace("-", "")
        content = params.get("content", "").strip()
        if not page_id:
            return {"error": "page_id is required"}
        if not content:
            return {"error": "content is required"}

        blocks = _text_to_blocks(content)
        result = await _notion_request("patch", f"/blocks/{page_id}/children", {"children": blocks})
        if "error" in result:
            return result
        return {"success": True, "blocks_added": len(blocks), "preview": f"✅ Appended {len(blocks)} blocks to page `{page_id}`"}

    elif action == "get_database":
        db_id = params.get("database_id", "").strip().replace("-", "")
        if not db_id:
            return {"error": "database_id is required"}

        db = await _notion_request("get", f"/databases/{db_id}")
        if "error" in db:
            return db

        title = db.get("title", [{}])[0].get("plain_text", "(Untitled)") if db.get("title") else "(Untitled)"
        props = db.get("properties", {})
        schema = {}
        for name, prop in props.items():
            schema[name] = prop.get("type", "unknown")

        # Get first 10 rows
        query_result = await _notion_request("post", f"/databases/{db_id}/query", {"page_size": 10})
        rows = []
        if "results" in query_result:
            for item in query_result["results"]:
                row = {k: _prop_value(v) for k, v in item.get("properties", {}).items()}
                row["_id"] = item.get("id")
                rows.append(row)

        schema_lines = [f"  - {k}: {v}" for k, v in schema.items()]
        preview = (
            f"🗃️ **Database: {title}**\n"
            f"Properties:\n" + "\n".join(schema_lines) +
            f"\n\nFirst {len(rows)} rows:\n" +
            "\n".join(f"  • {r.get('title') or r.get('Name') or r.get('_id', '?')}" for r in rows)
        )
        return {"title": title, "schema": schema, "rows": rows, "preview": preview}

    elif action == "query_database":
        db_id = params.get("database_id", "").strip().replace("-", "")
        if not db_id:
            return {"error": "database_id is required"}
        filter_obj = params.get("filter")
        sorts = params.get("sorts", [])
        max_results = int(params.get("max_results", 20))

        body: dict = {"page_size": max_results}
        if filter_obj:
            body["filter"] = filter_obj
        if sorts:
            body["sorts"] = sorts

        result = await _notion_request("post", f"/databases/{db_id}/query", body)
        if "error" in result:
            return result

        rows = []
        for item in result.get("results", []):
            row = {k: _prop_value(v) for k, v in item.get("properties", {}).items()}
            row["_id"] = item.get("id")
            row["_url"] = item.get("url")
            rows.append(row)

        lines = [f"🗃️ **Query results — {len(rows)} rows**\n"]
        for row in rows[:20]:
            name = row.get("title") or row.get("Name") or row.get("_id", "?")
            props_str = " | ".join(f"{k}: {v}" for k, v in row.items() if k not in ("_id", "_url", "title", "Name") and v is not None)
            lines.append(f"• **{name}** — {props_str[:150]}")
        return {"rows": rows, "count": len(rows), "preview": "\n".join(lines)}

    elif action == "create_row":
        # Alias for create_page with parent_type=database
        return await notion_tool({**params, "action": "create_page", "parent_type": "database"}, **kwargs)

    elif action == "update_row":
        # Alias for update_page
        return await notion_tool({**params, "action": "update_page"}, **kwargs)

    elif action == "delete_page":
        page_id = params.get("page_id", "").strip().replace("-", "")
        if not page_id:
            return {"error": "page_id is required"}
        result = await _notion_request("patch", f"/pages/{page_id}", {"archived": True})
        if "error" in result:
            return result
        return {"success": True, "preview": f"🗑️ Archived (deleted) page `{page_id}`"}

    elif action == "get_block":
        block_id = params.get("block_id", "").strip().replace("-", "")
        if not block_id:
            return {"error": "block_id is required"}
        result = await _notion_request("get", f"/blocks/{block_id}")
        if "error" in result:
            return result
        bt = result.get("type", "")
        text = _blocks_to_text([result])
        return {"block_id": block_id, "type": bt, "content": text, "preview": text[:500]}

    else:
        return {"error": f"Unknown action '{action}'. Use: search | get_page | create_page | update_page | append_blocks | get_database | query_database | create_row | update_row | delete_page | get_block"}
