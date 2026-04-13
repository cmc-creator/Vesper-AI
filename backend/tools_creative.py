"""
Vesper Creative Income Tools
==============================
These tools let Vesper CREATE things and set up RESIDUAL INCOME streams for CC.
Books, songs, art, digital products — created autonomously and listed for sale.

Vesper generates the content. CC earns the royalties. Forever.
"""

import os
import re
import json
import asyncio
import requests
import datetime
from typing import Optional


def _safe_write(path: str, content: str) -> bool:
    """Write content to a file. Non-fatal: returns True on success, False on failure."""
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    except Exception as _err:
        print(f"[WARN] tools_creative file write failed (DB save still proceeds): {_err}")
        return False


def _extract_json(text: str) -> dict:
    """Robustly parse JSON from AI output — handles code fences, extra prose."""
    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    text = re.sub(r'```(?:json)?\s*', '', text).strip().rstrip('`').strip()
    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Find the first {...} block
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except Exception:
            pass
    return {}


# ─────────────────────────────────────────────────────────────────────────────
# WRITING SESSION — persistent state so Vesper always knows what she's writing
# ─────────────────────────────────────────────────────────────────────────────

_SESSION_FILE = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "writing_session.json")

def _load_writing_session() -> dict:
    """Load the current writing session from disk. Returns {} if none exists."""
    try:
        if os.path.exists(_SESSION_FILE):
            with open(_SESSION_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _save_writing_session(data: dict):
    """Persist the writing session to disk."""
    try:
        os.makedirs(os.path.dirname(_SESSION_FILE), exist_ok=True)
        data["updated_at"] = datetime.datetime.now().isoformat()
        with open(_SESSION_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[WARN] Could not save writing session: {e}")


def clear_writing_session() -> dict:
    """Clear the active writing session (start fresh)."""
    try:
        if os.path.exists(_SESSION_FILE):
            os.remove(_SESSION_FILE)
        return {"success": True, "message": "Writing session cleared. Ready for a new project."}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_writing_session() -> dict:
    """Return the current writing session so Vesper can report progress to CC."""
    session = _load_writing_session()
    if not session:
        return {"active": False, "message": "No active writing project."}
    return {
        "active": True,
        "book_title": session.get("book_title", ""),
        "form": session.get("form", ""),
        "genre": session.get("genre", ""),
        "chapter_number": session.get("chapter_number", 1),
        "word_count_total": session.get("word_count_total", 0),
        "story_so_far": session.get("story_so_far", ""),
        "last_updated": session.get("updated_at", ""),
        "chapters_written": session.get("chapters_written", []),
    }


# ─────────────────────────────────────────────────────────────────
# EBOOK CREATOR — KDP / GUMROAD READY
# ─────────────────────────────────────────────────────────────────────────────

async def create_ebook(params: dict, ai_router=None, TaskType=None) -> dict:
    """
    Generate a complete, publish-ready ebook.
    Outputs: full manuscript (markdown), chapter outline, KDP metadata,
    cover prompt, and publishing checklist.
    """
    title = params.get("title", "")
    topic = params.get("topic", "")
    genre = params.get("genre", "non-fiction")  # non-fiction | fiction | self-help | how-to | poetry
    target_audience = params.get("target_audience", "general readers")
    chapters = int(params.get("chapters", 10))
    words_per_chapter = int(params.get("words_per_chapter", 1500))
    tone = params.get("tone", "engaging and conversational")
    author_name = params.get("author_name", "C.M. Cooper")

    if not title and not topic:
        return {"error": "Provide title or topic"}

    if not ai_router:
        return {"error": "ai_router not available"}

    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "ebooks")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in (title or topic).lower())[:40]

    # Step 1: Generate outline
    outline_resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": "You are a professional author and publishing expert. Return raw JSON only, no markdown fences."},
            {"role": "user", "content": (
                f"Create a detailed {chapters}-chapter outline for a {genre} ebook.\n"
                f"Title: {title or 'TBD'}\nTopic: {topic}\n"
                f"Target audience: {target_audience}\nTone: {tone}\n\n"
                "Return ONLY a JSON object (no code fences, no prose before or after):\n"
                '{"title": "...", "subtitle": "...", "tagline": "...", '
                '"target_audience": "...", "chapters": [{"number": 1, "title": "...", '
                '"summary": "...", "key_points": ["..."]}]}'
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=3000,
        temperature=0.7,
    )

    outline = _extract_json(outline_resp.get("content", "{}"))
    # If parse failed but we got a text-only outline, build a minimal structure
    if not outline.get("chapters"):
        outline = {
            "title": title or topic,
            "subtitle": "",
            "chapters": [
                {"number": i + 1, "title": f"Chapter {i + 1}", "summary": topic, "key_points": [topic]}
                for i in range(chapters)
            ],
        }

    final_title = outline.get("title", title or topic)

    # Step 2: Write chapters — each call carries a cumulative "story bible" so
    # Gemini never repeats content from earlier chapters.
    manuscript_parts = [
        f"# {final_title}\n",
        f"### {outline.get('subtitle', '')}\n\n" if outline.get("subtitle") else "",
        f"*By {author_name}*\n\n---\n\n",
    ]

    written_summaries: list[str] = []          # grows as chapters are completed

    for ch in outline.get("chapters", [])[:chapters]:
        ch_num = ch.get("number", "?")
        ch_title = ch.get("title", f"Chapter {ch_num}")

        # Build a "what's already been written" context block to prevent repetition
        prior_context = ""
        if written_summaries:
            prior_context = (
                "\n\nALREADY WRITTEN — do NOT repeat or summarise these:\n"
                + "\n".join(f"  • Ch{i+1}: {s}" for i, s in enumerate(written_summaries))
                + "\n"
            )

        ch_resp = await ai_router.chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are writing a {genre} book titled '{final_title}'. "
                        f"Tone: {tone}. Author: {author_name}. "
                        "Write each chapter as a standalone, deeply engaging piece. "
                        "Never summarise or repeat what came before — always push the story or argument forward."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Write Chapter {ch_num}: {ch_title}\n\n"
                        f"Chapter summary: {ch.get('summary', '')}\n"
                        f"Key points to cover: {', '.join(ch.get('key_points', []))}\n"
                        f"{prior_context}"
                        f"Write approximately {words_per_chapter} words. "
                        "Use headers, scene breaks, or bullet points where they serve the reader. "
                        "No filler, no padding. Every sentence earns its place."
                    ),
                },
            ],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=min(int(words_per_chapter * 2.5), 8192),
            temperature=0.82,
        )
        ch_text = ch_resp.get("content", "")
        manuscript_parts.append(f"\n## Chapter {ch_num}: {ch_title}\n\n{ch_text}\n\n---\n")

        # Store a short summary of this chapter for subsequent chapters
        first_200 = " ".join(ch_text.split()[:120])
        written_summaries.append(f"'{ch_title}' — {first_200}…")

    manuscript = "".join(manuscript_parts)

    # Save manuscript
    manuscript_path = os.path.join(save_dir, f"{slug}.md")
    _safe_write(manuscript_path, manuscript)

    # Step 3: Generate KDP / publishing metadata
    meta_resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": "You are a publishing expert specializing in Amazon KDP. Return raw JSON only."},
            {"role": "user", "content": (
                f"Generate Amazon KDP metadata for this ebook:\n"
                f"Title: {final_title}\nTopic: {topic}\nGenre: {genre}\n"
                f"Audience: {target_audience}\n\n"
                "Return ONLY a JSON object:\n"
                '{"kdp_title": "...", "subtitle": "...", "description": "...(150 words)", '
                '"keywords": ["7 keywords"], "categories": ["Primary", "Secondary"], '
                '"price_usd": 9.99, "cover_prompt": "detailed DALL-E prompt for cover art", '
                '"back_cover_blurb": "...", "suno_music_prompt": "mood/style for a background music track"}'
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=1000,
        temperature=0.6,
    )

    metadata = _extract_json(meta_resp.get("content", "{}"))

    # Save metadata
    meta_path = os.path.join(save_dir, f"{slug}_metadata.json")
    _safe_write(meta_path, json.dumps({"title": final_title, "outline": outline, "metadata": metadata,
                   "created": datetime.datetime.now().isoformat()}, indent=2))

    word_count = len(manuscript.split())

    return {
        "success": True,
        "title": final_title,
        "subtitle": outline.get("subtitle", ""),
        "word_count": word_count,
        "chapters": len(outline.get("chapters", [])),
        "manuscript_path": manuscript_path,
        "manuscript": manuscript,
        "metadata": metadata,
        "publishing_checklist": [
            f"1. Review manuscript at: {manuscript_path}",
            "2. Generate cover art using the cover_prompt with generate_image tool",
            "3. Convert to EPUB: use Calibre (free) or upload .md to Reedsy",
            "4. Create KDP account at kdp.amazon.com if you don't have one",
            "5. Upload manuscript + cover → fill in the metadata above",
            f"6. Set price: ${metadata.get('price_usd', 9.99)} → ~70% royalty = ${round(metadata.get('price_usd', 9.99) * 0.7, 2)}/sale",
            "7. Also list on Gumroad (use gumroad_create_product tool) for higher margins",
            "8. Promote via LinkedIn + content posts → passive income starts flowing",
        ],
        "estimated_monthly_income": "At 50 sales/month: $" + str(round(metadata.get("price_usd", 9.99) * 0.7 * 50, 0)),
    }


# ─────────────────────────────────────────────────────────────────────────────
# SONG / MUSIC CREATOR
# ─────────────────────────────────────────────────────────────────────────────

async def create_song(params: dict, ai_router=None, TaskType=None) -> dict:
    """
    Write a complete, original song — lyrics, structure, chord progression,
    production notes for Suno/Udio AI generation, and distribution plan.
    """
    concept = params.get("concept", "")
    genre = params.get("genre", "pop")  # pop | country | r&b | rock | hip-hop | folk | jazz | electronic
    mood = params.get("mood", "")  # emotional | uplifting | melancholic | energetic | introspective
    theme = params.get("theme", "")  # love | resilience | freedom | nature | success | identity
    artist_style = params.get("artist_style", "")  # e.g. "Taylor Swift" or "Beyoncé"
    title = params.get("title", "")
    include_chords = params.get("include_chords", True)

    if not concept and not theme:
        return {"error": "Provide concept or theme"}

    if not ai_router:
        return {"error": "ai_router not available"}

    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "songs")
    os.makedirs(save_dir, exist_ok=True)

    style_ref = f" in the style of {artist_style}" if artist_style else ""
    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a professional songwriter and music producer. "
                "Write commercially viable, emotionally resonant original songs."
            )},
            {"role": "user", "content": (
                f"Write a complete original {genre} song{style_ref}.\n"
                f"Concept: {concept}\nMood: {mood}\nTheme: {theme}\n"
                f"Title hint: {title if title else 'choose the best title'}\n\n"
                "Include:\n"
                "1. Song title\n"
                "2. Full lyrics (verse 1, pre-chorus, chorus, verse 2, bridge, outro)\n"
                f"{'3. Chord progression for each section' if include_chords else ''}\n"
                "4. Tempo (BPM) and key\n"
                "5. Production notes (instrumentation, sound design, vibe)\n"
                "6. Suno AI prompt (exact text to paste into suno.com to generate this song)\n"
                "7. DistroKid/TuneCore release metadata (genre tags, mood tags, similar artists)\n"
                "8. Estimated streaming royalty potential\n\n"
                "Make the lyrics REALLY good — hook that gets stuck in your head, bridge that hits hard."
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=4096,
        temperature=0.8,
    )

    song_content = resp.get("content", "")

    # Extract title from content
    lines = song_content.split("\n")
    song_title = title
    for line in lines[:5]:
        if line.strip() and not line.startswith("#"):
            song_title = line.strip().strip("*#\"'")
            break

    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in song_title.lower())[:40]
    save_path = os.path.join(save_dir, f"{slug}.md")
    _safe_write(save_path, f"# {song_title}\n\n{song_content}\n\n---\nCreated: {datetime.datetime.now().isoformat()}")

    return {
        "success": True,
        "title": song_title,
        "genre": genre,
        "content": song_content,
        "saved_to": save_path,
        "next_steps": [
            "1. Go to suno.com (free tier available) and paste the Suno prompt above",
            "2. Generate several versions, pick the best",
            "3. Sign up for DistroKid ($22/year) → distribute to Spotify, Apple Music, Amazon Music",
            "4. Register with ASCAP or BMI (free) to collect performance royalties",
            "5. Upload lyrics to Genius for additional exposure",
            "6. Every stream = money. 1,000 streams ≈ $3-4. Viral = passive income forever.",
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# WRITE CREATIVE — poems, short stories, essays, chapters, lyrics, anything
# ─────────────────────────────────────────────────────────────────────────────

async def write_creative(params: dict, ai_router=None, TaskType=None) -> dict:
    """
    Vesper's full-power creative writing tool.
    Handles poems, short stories, essays, song lyrics, scripts, monologues,
    love letters, manifestos — anything. Auto-loads session so continuations
    just work without CC having to paste anything.
    """
    # ── Load session for continuations ───────────────────────────────────
    session = _load_writing_session()

    form = params.get("form", "") or session.get("form", "")
    title = params.get("title", "") or session.get("book_title", "")
    prompt_text = params.get("prompt", params.get("content", params.get("description", "")))
    genre = params.get("genre", "") or session.get("genre", "")
    style = params.get("style", "") or session.get("style", "")
    tone = params.get("tone", "") or session.get("tone", "")
    length = params.get("length", "medium")
    author_name = params.get("author_name", "") or session.get("author_name", "C.M. Cooper")
    instructions = params.get("instructions", "")

    # Auto-load previous content from session if not explicitly given
    # Only apply if this looks like a continuation of the same piece
    previous_content = params.get("previous_content", "")
    if not previous_content and session.get("last_tail") and (
        not title or title.lower() == session.get("book_title", "").lower()
    ):
        previous_content = session.get("last_tail", "")

    if not prompt_text and not title and not previous_content:
        return {"error": "Provide a prompt or title to write"}

    if not ai_router:
        return {"error": "ai_router not available"}

    length_guide = {"short": 350, "medium": 900, "long": 2200, "epic": 5000}.get(length, 900)
    max_tok = min(int(length_guide * 2.8), 16000)

    style_note = f" in the style of {style}" if style else ""
    genre_note = f" {genre}" if genre else ""
    tone_note = f" Tone: {tone}." if tone else ""
    form_label = form or "creative writing"

    continuation_block = ""
    if previous_content:
        tail = " ".join(previous_content.split()[-600:])
        continuation_block = (
            "\n\n--- WHAT'S ALREADY BEEN WRITTEN (continue from here, do NOT repeat) ---\n"
            f"…{tail}\n"
            "--- END OF EXISTING CONTENT ---\n\n"
            "Pick up EXACTLY where that left off. Do not recap, do not repeat.\n"
        )

    system_msg = (
        f"You are Vesper — a ferociously talented{genre_note} author and poet writing for CC (C.M. Cooper).{tone_note} "
        "You write with full creative authority: raw emotion, precise language, original voice. "
        "You never pad, never repeat, never summarise what's already been said. "
        "You write to the end — whatever the piece demands. No apologies, no caveats."
    )

    user_msg = (
        f"Write {form_label}{style_note}.\n"
        + (f"Title: {title}\n" if title else "")
        + (f"Prompt/direction: {prompt_text}\n" if prompt_text else "")
        + (f"Extra instructions: {instructions}\n" if instructions else "")
        + f"Target length: ~{length_guide} words.\n"
        + continuation_block
        + "Write it now. Complete it fully. Do not stop until it's done."
    ).strip()

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=max_tok,
        temperature=0.92,
    )

    content = resp.get("content", "").strip()
    if not content:
        return {"error": "No content generated"}

    # Save to disk
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations",
                            f"{form or 'creative'}s")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in (title or prompt_text[:40] if prompt_text else "piece").lower())
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    save_path = os.path.join(save_dir, f"{slug}_{ts}.md")
    full_doc = f"# {title or form_label}\n*By {author_name}*\n\n{content}\n\n---\nCreated: {datetime.datetime.now().isoformat()}"
    _safe_write(save_path, full_doc)

    word_count = len(content.split())

    # ── Save/update session ───────────────────────────────────────────────
    first_80 = " ".join(content.split()[:80])
    piece_summary = f"'{title or form_label}': {first_80}…"
    existing_summary = session.get("story_so_far", "")
    updated_session = {
        **session,
        "book_title": title or session.get("book_title", ""),
        "form": form or session.get("form", "creative"),
        "genre": genre,
        "tone": tone,
        "style": style,
        "author_name": author_name,
        "last_tail": " ".join(content.split()[-600:]),
        "story_so_far": ((existing_summary + "\n") if existing_summary else "") + piece_summary,
        "word_count_total": session.get("word_count_total", 0) + word_count,
    }
    _save_writing_session(updated_session)

    return {
        "success": True,
        "form": form_label,
        "title": title or "",
        "content": content,
        "word_count": word_count,
        "total_word_count": updated_session["word_count_total"],
        "saved_to": save_path,
        "manuscript": full_doc,
        "session_saved": True,
        "session_note": "Session saved. Say 'keep writing' or 'continue' and Vesper picks up right here.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# WRITE CHAPTER — continue or add to an existing book
# ─────────────────────────────────────────────────────────────────────────────

async def write_chapter(params: dict, ai_router=None, TaskType=None) -> dict:
    """
    Write a single chapter of an ongoing book.
    Auto-loads writing session — Vesper remembers the book, chapter number,
    story so far, and where she left off without being told.
    """
    # ── Load persistent session first ─────────────────────────────────────
    session = _load_writing_session()

    book_title = params.get("book_title", params.get("title", "")) or session.get("book_title", "Untitled")
    # Auto-advance chapter number if not explicitly given
    if params.get("chapter_number") or params.get("chapter"):
        chapter_number = int(params.get("chapter_number", params.get("chapter", 1)))
    else:
        chapter_number = session.get("chapter_number", 1)

    chapter_title = params.get("chapter_title", f"Chapter {chapter_number}")
    direction = params.get("direction", params.get("prompt", ""))
    genre = params.get("genre", "") or session.get("genre", "fiction")
    tone = params.get("tone", "") or session.get("tone", "")
    words = int(params.get("words", session.get("words_per_chapter", 1500)))
    author_name = params.get("author_name", "") or session.get("author_name", "C.M. Cooper")
    characters = params.get("characters", "") or session.get("characters", "")
    world_notes = params.get("world_notes", "") or session.get("world_notes", "")

    # Auto-load story continuity from session if not explicitly supplied
    story_so_far = params.get("story_so_far", "") or session.get("story_so_far", "")
    previous_chapter_text = params.get("previous_chapter_text", "") or session.get("last_tail", "")

    if not ai_router:
        return {"error": "ai_router not available"}

    # Build rich context block
    context_parts = []
    if story_so_far:
        context_parts.append(f"STORY SO FAR:\n{story_so_far}")
    if characters:
        context_parts.append(f"CHARACTERS:\n{characters}")
    if world_notes:
        context_parts.append(f"WORLD / SETTING:\n{world_notes}")
    if previous_chapter_text:
        tail = " ".join(previous_chapter_text.split()[-500:])
        context_parts.append(
            f"END OF PREVIOUS CHAPTER — pick up exactly here, do NOT repeat any of this:\n…{tail}"
        )

    context_block = "\n\n".join(context_parts)

    system_msg = (
        f"You are Vesper, writing Chapter {chapter_number} of '{book_title}' — a {genre} novel "
        f"by {author_name}."
        + (f" Tone: {tone}." if tone else "")
        + " Write with full creative authority. Never recap what's already been written."
        " Push the story forward. End the chapter at a natural stopping point or a hook "
        "that makes the reader desperate for the next chapter."
    )

    user_msg = (
        f"Write Chapter {chapter_number}: {chapter_title}\n\n"
        + (f"Direction for this chapter: {direction}\n\n" if direction else "")
        + f"{context_block}\n\n"
        f"Target: ~{words} words. Write the full chapter now. Do not stop until it's complete."
    ).strip()

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=min(int(words * 2.5), 16000),
        temperature=0.88,
    )

    content = resp.get("content", "").strip()
    if not content:
        return {"error": "No content generated"}

    # Save chapter file
    save_dir = os.path.join(
        os.path.dirname(__file__), "..", "vesper-ai", "creations", "books",
        "".join(c if c.isalnum() or c == "-" else "-" for c in book_title.lower())[:40],
    )
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, f"chapter_{chapter_number:03d}.md")
    full_doc = (
        f"# {book_title}\n## Chapter {chapter_number}: {chapter_title}\n"
        f"*By {author_name}*\n\n{content}\n\n"
        f"---\nWritten: {datetime.datetime.now().isoformat()}"
    )
    _safe_write(save_path, full_doc)

    word_count = len(content.split())

    # ── Build chapter summary line for story_so_far ───────────────────────
    first_120 = " ".join(content.split()[:120])
    chapter_summary = f"Ch{chapter_number} '{chapter_title}': {first_120}…"
    updated_story_so_far = ((story_so_far + "\n") if story_so_far else "") + chapter_summary

    # ── Persist updated session ───────────────────────────────────────────
    updated_session = {
        **session,
        "book_title": book_title,
        "form": "chapter",
        "genre": genre,
        "tone": tone,
        "author_name": author_name,
        "characters": characters,
        "world_notes": world_notes,
        "chapter_number": chapter_number + 1,   # ready for next chapter
        "story_so_far": updated_story_so_far,
        "last_tail": " ".join(content.split()[-600:]),  # last ~600 words
        "word_count_total": session.get("word_count_total", 0) + word_count,
        "chapters_written": session.get("chapters_written", []) + [
            {"number": chapter_number, "title": chapter_title, "words": word_count}
        ],
        "words_per_chapter": words,
    }
    _save_writing_session(updated_session)
    print(f"[SESSION] Chapter {chapter_number} saved. Next is Ch{chapter_number + 1}. Total: {updated_session['word_count_total']} words.")

    return {
        "success": True,
        "book_title": book_title,
        "chapter_number": chapter_number,
        "chapter_title": chapter_title,
        "word_count": word_count,
        "total_word_count": updated_session["word_count_total"],
        "next_chapter": chapter_number + 1,
        "content": content,
        "saved_to": save_path,
        "manuscript": full_doc,
        "session_saved": True,
        "session_note": f"Session saved. Next: Chapter {chapter_number + 1}. Just say 'keep writing' — Vesper remembers everything.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# ART FOR SALE — POD (Print on Demand) READY
# ─────────────────────────────────────────────────────────────────────────────

async def create_art_for_sale(params: dict, ai_router=None, TaskType=None) -> dict:
    """
    Generate AI art optimized for selling on Redbubble, Society6, Merch by Amazon, Etsy.
    Creates: image prompt, product descriptions, tags, pricing strategy.
    """
    concept = params.get("concept", "")
    style = params.get("style", "digital art")
    target_product = params.get("product", "all")  # t-shirt | poster | phone_case | sticker | all
    niche = params.get("niche", "")  # cats | nature | gothic | space | motivational | etc.
    generate_image = params.get("generate_image", True)

    if not concept and not niche:
        return {"error": "Provide concept or niche"}

    if not ai_router:
        return {"error": "ai_router not available"}

    # Step 1: Create optimized art prompt + business metadata
    meta_resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": "You are an expert in POD (print-on-demand) art that sells well online."},
            {"role": "user", "content": (
                f"Create a high-selling POD art concept.\n"
                f"Concept: {concept}\nStyle: {style}\nNiche: {niche}\nProduct target: {target_product}\n\n"
                "Return JSON:\n"
                '{"title": "...", "dalle_prompt": "detailed DALL-E 3 prompt optimized for POD, 1792x1024, '
                'high contrast, print-ready...", '
                '"redbubble_tags": ["20 relevant tags"], '
                '"product_title": "...(SEO optimized for Redbubble/Etsy)", '
                '"product_description": "...(2-3 sentences)", '
                '"best_products": ["t-shirt", "poster", "sticker", "phone case", "tote bag"], '
                '"target_buyer": "...", '
                '"trending_score": "high|medium|low", '
                '"estimated_monthly_sales": "1-5|5-20|20-50|50+", '
                '"pricing": {"redbubble_base": 20, "your_markup": 5, "your_price": 25}}'
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=1500,
        temperature=0.7,
    )

    try:
        import re
        meta_text = meta_resp.get("content", "{}")
        json_match = re.search(r'\{.*\}', meta_text, re.DOTALL)
        metadata = json.loads(json_match.group() if json_match else meta_text)
    except Exception:
        metadata = {"title": concept, "dalle_prompt": concept}

    result = {
        "success": True,
        "title": metadata.get("title", concept),
        "metadata": metadata,
        "image_generated": False,
        "publishing_steps": [
            "1. Sign up at redbubble.com (free)",
            "2. Upload the generated image",
            f"3. Title: {metadata.get('product_title', metadata.get('title', ''))}",
            f"4. Tags: {', '.join((metadata.get('redbubble_tags') or [])[:10])}",
            "5. Enable all product types — more products = more passive income",
            "6. Also list on society6.com and merch.amazon.com for maximum reach",
            "7. Every sale = royalty with zero work after upload",
        ],
    }

    # Optionally generate the image using existing generate_image infrastructure
    if generate_image and metadata.get("dalle_prompt"):
        result["dalle_prompt"] = metadata["dalle_prompt"]
        result["note"] = "Use generate_image tool with this dalle_prompt to create the artwork, then upload to Redbubble."

    return result


# ─────────────────────────────────────────────────────────────────────────────
# GUMROAD — DIGITAL PRODUCT SALES
# ─────────────────────────────────────────────────────────────────────────────

async def gumroad_create_product(params: dict) -> dict:
    """Create and list a digital product on Gumroad for immediate sale."""
    key = os.getenv("GUMROAD_ACCESS_TOKEN", "")
    if not key:
        return {
            "error": "GUMROAD_ACCESS_TOKEN not set.",
            "setup": [
                "1. Create account at gumroad.com (free)",
                "2. Go to Settings → Advanced → Applications",
                "3. Generate Access Token",
                "4. Add GUMROAD_ACCESS_TOKEN to Railway environment variables",
            ]
        }

    name = params.get("name", "")
    description = params.get("description", "")
    price_cents = int(float(params.get("price", 9.99)) * 100)
    file_path = params.get("file_path", "")  # local path to upload
    preview_url = params.get("preview_url", "")
    tags = params.get("tags", [])
    published = params.get("published", True)

    if not name:
        return {"error": "name required"}

    try:
        product_data = {
            "name": name,
            "description": description,
            "price": price_cents,
            "published": "true" if published else "false",
        }
        if tags:
            product_data["tags"] = json.dumps(tags) if isinstance(tags, list) else tags

        r = requests.post(
            "https://api.gumroad.com/v2/products",
            data=product_data,
            headers={"Authorization": f"Bearer {key}"},
            timeout=20
        )
        r.raise_for_status()
        product = r.json().get("product", {})

        result = {
            "success": True,
            "product_id": product.get("id"),
            "name": product.get("name"),
            "price": f"${price_cents/100:.2f}",
            "url": product.get("short_url") or product.get("url"),
            "published": published,
        }

        # Upload file if provided
        if file_path and os.path.exists(file_path):
            with open(file_path, "rb") as f:
                upload_r = requests.put(
                    f"https://api.gumroad.com/v2/products/{product['id']}/files",
                    files={"file": f},
                    headers={"Authorization": f"Bearer {key}"},
                    timeout=60
                )
                result["file_uploaded"] = upload_r.status_code == 200

        return result
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# MEDIUM — PUBLISH ARTICLES  (Free token: medium.com/me/settings → Integration tokens)
# ─────────────────────────────────────────────────────────────────────────────

async def medium_publish(params: dict) -> dict:
    """Publish an article to Medium. Drives traffic → consulting leads → income."""
    token = os.getenv("MEDIUM_TOKEN", "")
    if not token:
        return {
            "error": "MEDIUM_TOKEN not set.",
            "setup": "Go to medium.com/me/settings → Security and Apps → Integration tokens → Generate"
        }

    title = params.get("title", "")
    content = params.get("content", "")
    tags = params.get("tags", [])
    status = params.get("status", "draft")  # draft | public | unlisted
    canonical_url = params.get("canonical_url", "")

    if not title or not content:
        return {"error": "title and content required"}

    # Format content as HTML if it looks like markdown
    body = content
    if not content.strip().startswith("<"):
        # Basic markdown → HTML (Medium accepts both)
        import re
        body = re.sub(r'^# (.+)$', r'<h1>\1</h1>', body, flags=re.MULTILINE)
        body = re.sub(r'^## (.+)$', r'<h2>\1</h2>', body, flags=re.MULTILINE)
        body = re.sub(r'^### (.+)$', r'<h3>\1</h3>', body, flags=re.MULTILINE)
        body = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', body)
        body = re.sub(r'\*(.+?)\*', r'<em>\1</em>', body)
        body = "\n".join(f"<p>{line}</p>" if line.strip() and not line.startswith("<") else line
                         for line in body.split("\n"))

    try:
        # Get user ID
        me_r = requests.get(
            "https://api.medium.com/v1/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        me_r.raise_for_status()
        user_id = me_r.json().get("data", {}).get("id")

        post_data = {
            "title": title,
            "contentFormat": "html",
            "content": body,
            "publishStatus": status,
        }
        if tags:
            post_data["tags"] = tags[:5]
        if canonical_url:
            post_data["canonicalUrl"] = canonical_url

        r = requests.post(
            f"https://api.medium.com/v1/users/{user_id}/posts",
            json=post_data,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=20
        )
        r.raise_for_status()
        post = r.json().get("data", {})
        return {
            "success": True,
            "title": post.get("title"),
            "url": post.get("url"),
            "status": post.get("publishStatus"),
            "id": post.get("id"),
        }
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# INCOME STREAM PLANNER
# ─────────────────────────────────────────────────────────────────────────────

async def plan_income_stream(params: dict, ai_router=None, TaskType=None) -> dict:
    """
    Generate a complete, actionable passive income stream plan tailored to CC.
    Analyzes market opportunity, creates step-by-step execution plan,
    estimates realistic revenue, and identifies first 3 actions to take today.
    """
    niche = params.get("niche", "")
    skills = params.get("skills", "risk management, consulting, business strategy")
    stream_type = params.get("type", "any")  # ebook | course | art | music | templates | consulting | any
    time_available = params.get("time_per_week_hours", 5)
    investment = params.get("investment_budget", 0)  # USD

    if not ai_router:
        return {"error": "ai_router not available"}

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a passive income strategist specializing in digital products and consulting leverage. "
                "CC Cooper is a Risk Management Director and business consultant in Surprise, AZ. "
                "She wants REAL, actionable income streams — not generic advice."
            )},
            {"role": "user", "content": (
                f"Create a detailed passive income plan for CC.\n"
                f"Niche/Topic: {niche or 'leverage her risk management and consulting expertise'}\n"
                f"Stream type: {stream_type}\n"
                f"Skills: {skills}\n"
                f"Time available: {time_available} hours/week\n"
                f"Investment budget: ${investment}\n\n"
                "Provide:\n"
                "1. Specific product/stream to create (not generic — exact title, format, platform)\n"
                "2. Market size and competition analysis\n"
                "3. Realistic income projection (month 1, month 6, month 12)\n"
                "4. Complete step-by-step launch plan (20 steps max)\n"
                "5. First 3 actions to take TODAY\n"
                "6. Tools/platforms needed (with costs)\n"
                "7. How Vesper can automate most of this\n"
                "8. Risks and how to mitigate them\n\n"
                "Be specific. Give real numbers. No fluff."
            )}
        ],
        task_type=TaskType.ANALYSIS if TaskType else None,
        max_tokens=4096,
        temperature=0.6,
    )

    plan = resp.get("content", "")

    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "income_plans")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in (niche or stream_type).lower())[:30]
    save_path = os.path.join(save_dir, f"{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md")
    _safe_write(save_path, f"# Income Stream Plan: {niche or stream_type}\n\n{plan}\n\n---\nGenerated: {datetime.datetime.now().isoformat()}")

    return {
        "success": True,
        "plan": plan,
        "saved_to": save_path,
        "niche": niche,
        "stream_type": stream_type,
    }


# ─────────────────────────────────────────────────────────────────────────────
# CONTENT AUTOMATION — SCHEDULE + PUBLISH
# ─────────────────────────────────────────────────────────────────────────────

async def create_content_calendar(params: dict, ai_router=None, TaskType=None) -> dict:
    """
    Generate a month of content (LinkedIn posts, articles, tweets) aligned to
    CC's consulting brand and income goals. Ready to schedule or auto-post.
    """
    brand = params.get("brand", "Connie Michelle Consulting")
    focus = params.get("focus", "risk management consulting")
    platforms = params.get("platforms", ["linkedin", "twitter"])
    posts_per_week = int(params.get("posts_per_week", 5))
    weeks = int(params.get("weeks", 4))
    goal = params.get("goal", "attract consulting clients and thought leadership")

    if not ai_router:
        return {"error": "ai_router not available"}

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a social media strategist for B2B consultants. "
                "Content should attract corporate clients, demonstrate expertise, "
                "and convert followers to consulting inquiries."
            )},
            {"role": "user", "content": (
                f"Create a {weeks}-week content calendar for {brand}.\n"
                f"Focus: {focus}\nPlatforms: {', '.join(platforms)}\n"
                f"Posts per week: {posts_per_week}\nGoal: {goal}\n\n"
                "For each post provide:\n"
                "- Platform\n- Day/week\n- Hook (first line that stops the scroll)\n"
                "- Full post content\n- Hashtags\n- Call to action\n\n"
                "Mix: thought leadership, case studies (anonymized), tips, personal stories, "
                "questions that drive engagement. Make them genuinely good."
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=4096,
        temperature=0.75,
    )

    calendar = resp.get("content", "")

    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "content")
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, f"content_calendar_{datetime.datetime.now().strftime('%Y%m')}.md")
    _safe_write(save_path, f"# Content Calendar — {brand}\n\n{calendar}")

    return {
        "success": True,
        "calendar": calendar,
        "saved_to": save_path,
        "weeks": weeks,
        "platforms": platforms,
        "tip": "Use post_to_linkedin and post_to_twitter tools to publish these directly.",
    }


async def write_consulting_proposal(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a professional consulting proposal ready to send to a prospect."""
    client_name = params.get("client_name", "")
    company = params.get("company", "")
    problem = params.get("problem", "")
    services = params.get("services", "risk management consulting")
    rate = params.get("rate", "")
    duration = params.get("duration", "3 months")
    deliverables = params.get("deliverables", [])

    if not problem and not company:
        return {"error": "Provide client problem or company"}

    if not ai_router:
        return {"error": "ai_router not available"}

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are writing a consulting proposal for Connie Michelle Cooper, "
                "Risk Management Director and founder of Connie Michelle Consulting & Business Solutions LLC, "
                "Surprise, AZ. Professional, confident, results-focused tone."
            )},
            {"role": "user", "content": (
                f"Write a complete consulting proposal.\n"
                f"Client: {client_name} at {company}\n"
                f"Problem to solve: {problem}\n"
                f"Services: {services}\n"
                f"Rate: {rate or 'TBD'}\nEngagement duration: {duration}\n"
                f"Deliverables: {', '.join(deliverables) if deliverables else 'standard for scope'}\n\n"
                "Include: Executive Summary, Problem Statement, Proposed Solution, "
                "Scope of Work, Deliverables, Timeline, Investment (pricing), "
                "About Connie Michelle Consulting, Next Steps. "
                "Professional, compelling, closes strong."
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=4096,
        temperature=0.5,
    )

    proposal = resp.get("content", "")

    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "proposals")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in (company or client_name).lower())[:30]
    save_path = os.path.join(save_dir, f"proposal_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md")
    _safe_write(save_path, proposal)

    return {
        "success": True,
        "proposal": proposal,
        "saved_to": save_path,
        "client": f"{client_name} at {company}",
        "next_steps": [
            "Review and customize the proposal",
            "Use send_email tool to send directly to the prospect",
            "Or create a PDF and attach it manually",
            "Follow up in 3 days if no response",
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# SEO ARTICLE WRITER — Medium / Substack / LinkedIn / Blog
# ─────────────────────────────────────────────────────────────────────────────

async def write_seo_article(params: dict, ai_router=None, TaskType=None) -> dict:
    """Write a complete SEO-optimized article ready to publish anywhere.
    Traffic → leads → income. Can be published to Medium, Substack, LinkedIn."""
    keyword    = params.get("keyword", params.get("topic", ""))
    title      = params.get("title", "")
    audience   = params.get("audience", "professionals and entrepreneurs")
    word_count = int(params.get("word_count", 1200))
    style      = params.get("style", "practical, authoritative, conversational")
    include_affiliate_hooks = params.get("include_affiliate_hooks", False)

    if not keyword:
        return {"error": "Provide keyword or topic"}
    if not ai_router:
        return {"error": "ai_router not available"}

    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "articles")
    os.makedirs(save_dir, exist_ok=True)

    # Step 1: Generate article
    affiliate_note = (
        "\n\nInclude 2-3 natural product/tool recommendation hooks where affiliate links could go. "
        "Mark them with [AFFILIATE: category] placeholders."
    ) if include_affiliate_hooks else ""

    article_resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are an expert SEO content writer and digital marketing strategist. "
                "You write articles that rank on Google AND convert readers into clients or buyers."
            )},
            {"role": "user", "content": (
                f"Write a complete, publish-ready SEO article.\n\n"
                f"Primary keyword: {keyword}\n"
                f"Title (or suggest one): {title or 'create a compelling SEO title'}\n"
                f"Target audience: {audience}\n"
                f"Word count: ~{word_count} words\n"
                f"Style: {style}\n\n"
                f"Structure requirements:\n"
                f"1. SEO title (H1) with primary keyword\n"
                f"2. Meta description (155 chars, keyword-rich)\n"
                f"3. Opening hook (problem/stat/story)\n"
                f"4. 5-7 H2 sections with rich content\n"
                f"5. Practical tips or numbered lists\n"
                f"6. Conclusion with strong CTA\n\n"
                f"Format: full markdown article, sections clearly labeled."
                f"{affiliate_note}"
            )},
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=4000,
        temperature=0.65,
    )

    article = article_resp.get("content", "").strip()

    # Extract title from H1 if present
    import re
    h1 = re.search(r'^#\s+(.+)$', article, re.MULTILINE)
    final_title = h1.group(1) if h1 else (title or f"SEO Article: {keyword}")

    # Extract meta description
    meta_match = re.search(r'\*\*Meta[^:]*:\*\*\s*(.+)', article)
    meta_description = meta_match.group(1).strip() if meta_match else f"Learn about {keyword}."

    # Word count
    wc = len(article.split())

    # Save
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in keyword.lower())[:40]
    fname = f"{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{slug}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, article)

    return {
        "success": True,
        "title": final_title,
        "keyword": keyword,
        "meta_description": meta_description,
        "word_count": wc,
        "article": article,
        "saved_to": save_path,
        "publishing_plan": [
            "1. Publish to Medium → join Medium Partner Program for immediate earnings",
            "2. Post on LinkedIn as an article → builds thought leadership + consulting leads",
            "3. Republish on Substack newsletter → grow list → premium subscriptions",
            "4. Add to your blog/website for long-term SEO traffic",
            "5. Repurpose into Twitter/LinkedIn thread using repurpose_content tool",
        ],
        "estimated_monthly_value": "$50–500 in affiliate income or consulting leads if it ranks",
    }


# ─────────────────────────────────────────────────────────────────────────────
# COURSE OUTLINE BUILDER — Teachable / Kajabi / Gumroad / Udemy
# ─────────────────────────────────────────────────────────────────────────────

async def create_course_outline(params: dict, ai_router=None, TaskType=None) -> dict:
    """Build a complete, sellable online course — modules, lessons, worksheets,
    pricing tiers, launch strategy. Publish on Teachable, Kajabi, Gumroad, or Udemy."""
    topic       = params.get("topic", "")
    audience    = params.get("audience", "beginners to intermediate learners")
    outcome     = params.get("outcome", "learn the skill and apply it professionally")
    price_point = params.get("price_point", "97–297")
    modules     = int(params.get("modules", 6))
    your_expertise = params.get("your_expertise", params.get("skills", "consulting and business strategy"))

    if not topic:
        return {"error": "Provide a course topic"}
    if not ai_router:
        return {"error": "ai_router not available"}

    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "courses")
    os.makedirs(save_dir, exist_ok=True)

    course_resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are an expert instructional designer and online course creator "
                "who has helped creators build 6-figure course businesses."
            )},
            {"role": "user", "content": (
                f"Build a complete, sellable online course outline.\n\n"
                f"Topic: {topic}\n"
                f"Target audience: {audience}\n"
                f"Transformation/outcome: {outcome}\n"
                f"Instructor expertise: {your_expertise}\n"
                f"Number of modules: {modules}\n"
                f"Target price range: ${price_point}\n\n"
                f"Deliver:\n"
                f"1. Course title + tagline\n"
                f"2. 1-paragraph sales description (for Gumroad/Teachable page)\n"
                f"3. Learning outcomes (5-7 bullet points)\n"
                f"4. WHO THIS IS FOR section (3-4 bullet points)\n"
                f"5. Full curriculum: {modules} modules, each with 3-5 lessons + one worksheet/exercise\n"
                f"6. Pricing strategy: Starter tier, Core tier, VIP tier (with what's in each)\n"
                f"7. Launch checklist: 10 steps to publish and sell within 30 days\n"
                f"8. Traffic sources: where to promote this course\n\n"
                f"Format: clean markdown, ready to paste into a Notion doc or course platform."
            )},
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=4000,
        temperature=0.6,
    )

    content = course_resp.get("content", "").strip()

    import re
    h1 = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    final_title = h1.group(1) if h1 else f"{topic} — Online Course"

    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in topic.lower())[:40]
    fname = f"course_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": final_title,
        "topic": topic,
        "content": content,
        "saved_to": save_path,
        "platform_options": {
            "Gumroad": "easiest — upload PDF curriculum + record videos, set price, sell immediately",
            "Teachable": "free plan, professional look, built-in payment processing",
            "Kajabi": "all-in-one (email + course + community), ~$149/mo but highest conversion",
            "Udemy": "no upfront work, huge traffic, but lower control and 50% revenue split",
            "Podia": "flat monthly fee, no transaction fees, good for bundles",
        },
        "income_projection": f"At 20 students/month × ${price_point.split('–')[0]}: ~${int(price_point.split('–')[0]) * 20}/month passive",
    }


# ─────────────────────────────────────────────────────────────────────────────
# TEMPLATE PACK CREATOR — Notion / Canva / Google Sheets / Excel / Figma
# ─────────────────────────────────────────────────────────────────────────────

async def create_template_pack(params: dict, ai_router=None, TaskType=None) -> dict:
    """Design and fully document a sellable template pack.
    Templates sell for $5–97 with zero delivery cost. Gumroad gold."""
    pack_type   = params.get("type", params.get("pack_type", "Notion"))   # Notion | Canva | Google Sheets | Excel | Figma | Airtable
    theme       = params.get("theme", params.get("topic", "productivity"))
    audience    = params.get("audience", "entrepreneurs and freelancers")
    price       = float(params.get("price", 27))
    num_templates = int(params.get("num_templates", 5))

    if not theme:
        return {"error": "Provide a theme or topic for the template pack"}
    if not ai_router:
        return {"error": "ai_router not available"}

    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "templates")
    os.makedirs(save_dir, exist_ok=True)

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a top-tier digital product creator who sells template packs on Gumroad and Etsy. "
                "You create templates people actually buy and use."
            )},
            {"role": "user", "content": (
                f"Create a complete, sellable {pack_type} Template Pack.\n\n"
                f"Theme/niche: {theme}\n"
                f"Target audience: {audience}\n"
                f"Number of templates: {num_templates}\n"
                f"Price point: ${price:.2f}\n\n"
                f"Deliver:\n"
                f"1. Pack name + catchy tagline\n"
                f"2. Gumroad product description (convincing, SEO-optimized, 200 words)\n"
                f"3. For EACH template:\n"
                f"   - Template name\n"
                f"   - What it does / problem it solves\n"
                f"   - Exact sections/features/formulas to include\n"
                f"   - Full template content/structure in markdown (ready to build)\n"
                f"4. Gumroad listing tags (10 tags)\n"
                f"5. Where to market this pack (3 best channels)\n"
                f"6. Upsell idea: what higher-priced version could include\n\n"
                f"Include the FULL content of each template (headers, sections, formulas, placeholder text). "
                f"Make these genuinely useful, not just descriptions."
            )},
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=5000,
        temperature=0.65,
    )

    content = resp.get("content", "").strip()

    import re
    h1 = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    final_title = h1.group(1) if h1 else f"{theme} {pack_type} Template Pack"

    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in f"{pack_type}-{theme}".lower())[:40]
    fname = f"templates_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": final_title,
        "type": pack_type,
        "theme": theme,
        "price": price,
        "content": content,
        "saved_to": save_path,
        "gumroad_tip": "Upload a PDF of the template pack OR a .zip with the files. Set 'Let buyers name their price' as a floor = more conversions.",
        "income_projection": f"At 30 sales/month: ${price * 30:.0f}/month — no shipping, no customer service, pure passive",
    }


# ─────────────────────────────────────────────────────────────────────────────
# CONTENT REPURPOSER — 1 piece → 5 platforms
# ─────────────────────────────────────────────────────────────────────────────

async def repurpose_content(params: dict, ai_router=None, TaskType=None) -> dict:
    """Take one piece of content and repurpose it for 5 different platforms.
    Maximum reach from minimum effort — the cornerstone of residual traffic."""
    source_content = params.get("content", params.get("source_content", ""))
    source_type    = params.get("source_type", "article")  # ebook_chapter | article | blog_post | presentation
    brand          = params.get("brand", "Connie Michelle Consulting")
    platforms      = params.get("platforms", ["linkedin", "twitter", "youtube", "tiktok", "pinterest"])

    if not source_content:
        return {"error": "Provide source_content to repurpose"}
    if not ai_router:
        return {"error": "ai_router not available"}

    if isinstance(platforms, str):
        platforms = [p.strip() for p in platforms.split(",")]

    platform_instructions = {
        "linkedin": "LinkedIn article/post (800–1200 words, professional tone, personal story hook, end with question for engagement)",
        "twitter": "Twitter/X thread (12-15 tweets, hook first tweet, numbered, last tweet = CTA with link)",
        "youtube": "YouTube video script (intro hook, 5-7 main points, outro CTA, timestamps, 8-12 min runtime, SEO title + description + 10 tags)",
        "tiktok": "TikTok video script (60-90 seconds, hook in first 2 seconds, fast-paced tips, trending audio suggestion, on-screen text overlays)",
        "pinterest": "5 Pinterest pin descriptions (keyword-rich, story-first, calls-to-action, board suggestions, vertical image descriptions)",
        "instagram": "5 Instagram captions + hashtag sets (one for carousel post, one for Reel, one story concept, lifestyle hook)",
        "substack": "Substack newsletter edition (subject line, preview text, full email body, subscriber value, CTA to share)",
        "podcast": "Podcast episode outline (title, 3-min intro hook, 5 main segments with talking points, outro, show notes)",
    }

    tasks = {}
    for platform in platforms:
        if platform.lower() in platform_instructions:
            tasks[platform] = platform_instructions[platform.lower()]
        else:
            tasks[platform] = f"Content for {platform} platform"

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                f"You are a content repurposing expert for {brand}. "
                "You take a core piece of content and reformat it for maximum reach across platforms, "
                "each with the right tone, format, and length for that platform."
            )},
            {"role": "user", "content": (
                f"Repurpose this {source_type} into the following platform formats:\n\n"
                f"SOURCE CONTENT:\n{source_content[:3000]}\n\n"
                f"PLATFORMS TO CREATE:\n"
                + "\n".join(f"- {p.upper()}: {inst}" for p, inst in tasks.items())
                + "\n\nFor EACH platform, deliver the complete, ready-to-post content. "
                f"Adapt tone and format fully — don't just summarize, genuinely rewrite for each platform."
            )},
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=6000,
        temperature=0.7,
    )

    content = resp.get("content", "").strip()
    title = f"Repurposed: {source_content[:60].strip()}…"

    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "repurposed")
    os.makedirs(save_dir, exist_ok=True)
    fname = f"repurposed_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": title,
        "platforms": list(tasks.keys()),
        "content": content,
        "saved_to": save_path,
        "next_steps": [
            "Use post_to_linkedin for the LinkedIn version",
            "Use post_to_twitter for the Twitter thread",
            "Upload the YouTube script to Descript or Riverside for easy recording",
            "Schedule TikTok via TikTok Creator Studio",
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# DIGITAL PRODUCT CREATOR — Workbooks / Checklists / Swipe Files / Toolkits
# ─────────────────────────────────────────────────────────────────────────────

async def create_digital_product(params: dict, ai_router=None, TaskType=None) -> dict:
    """Create any sellable digital product: workbook, checklist, swipe file,
    resource guide, toolkit, cheat sheet. Converts directly to Gumroad listing."""
    product_type = params.get("product_type", params.get("type", "workbook"))
    topic        = params.get("topic", "")
    audience     = params.get("audience", "entrepreneurs and small business owners")
    price        = float(params.get("price", 17))
    pages        = int(params.get("pages", 15))

    if not topic:
        return {"error": "Provide a topic for the digital product"}
    if not ai_router:
        return {"error": "ai_router not available"}

    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "digital_products")
    os.makedirs(save_dir, exist_ok=True)

    type_instructions = {
        "workbook": (
            f"An interactive workbook with {pages} pages. Include an intro, "
            "learning objectives, exercises with blank fill-in spaces, reflection prompts, "
            "action tables, and a summary action plan. Format in markdown with '[ ]' for fill-ins."
        ),
        "checklist": (
            f"A comprehensive {pages}-item checklist (or multiple smaller checklists totaling ~{pages*3} items). "
            "Organize by phase/category. Include a brief explanation for each item. "
            "Format as markdown checkboxes."
        ),
        "swipe_file": (
            f"A swipe file with {pages} ready-to-use templates, scripts, and copy examples. "
            "Each includes: when to use it, the full template, and customization tips."
        ),
        "resource_guide": (
            f"A curated resource guide with {pages} pages covering tools, books, websites, courses, "
            "and communities. Each resource: name, URL placeholder, what it does, cost, best for."
        ),
        "cheat_sheet": (
            f"A 1-2 page dense cheat sheet with key frameworks, formulas, quick reference tables, "
            "and decision trees. High information density, visual structure."
        ),
        "toolkit": (
            f"A complete toolkit with {pages} pages covering 5-7 tools/frameworks. "
            "Each tool: description, when to use, step-by-step guide, example, template."
        ),
    }

    instructions = type_instructions.get(product_type.lower(), type_instructions["workbook"])

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a digital product creator who builds high-value, "
                "immediately actionable resources that sell on Gumroad, Etsy, and Teachable."
            )},
            {"role": "user", "content": (
                f"Create a complete, sellable digital {product_type}.\n\n"
                f"Topic: {topic}\n"
                f"Target audience: {audience}\n"
                f"Price point: ${price:.2f}\n\n"
                f"Product type instructions: {instructions}\n\n"
                f"Also include at the top:\n"
                f"- Product title\n"
                f"- Gumroad description (150 words, benefit-focused)\n"
                f"- 8 SEO tags for Gumroad/Etsy\n\n"
                f"Then deliver the COMPLETE product content — every page, every exercise, "
                f"every template fully written out. This needs to be ready to format as a PDF and sell TODAY."
            )},
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=5000,
        temperature=0.65,
    )

    content = resp.get("content", "").strip()

    import re
    h1 = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    final_title = h1.group(1) if h1 else f"{topic} {product_type.title()}"

    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in f"{product_type}-{topic}".lower())[:45]
    fname = f"{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": final_title,
        "product_type": product_type,
        "topic": topic,
        "price": price,
        "content": content,
        "saved_to": save_path,
        "to_pdf": "Paste markdown into Notion → Export as PDF, OR use Canva Doc → Export PDF",
        "income_projection": f"At 40 sales/month × ${price:.0f}: ${price * 40:.0f}/month fully passive",
    }


# ─────────────────────────────────────────────────────────────────────────────
# EMAIL SEQUENCE BUILDER — ConvertKit / Mailchimp / Beehiiv lead funnel
# ─────────────────────────────────────────────────────────────────────────────

async def create_email_sequence(params: dict, ai_router=None, TaskType=None) -> dict:
    """Build a full email nurture sequence — welcome series, launch sequence,
    or sales funnel. Every email written and ready to load into any ESP."""
    sequence_type  = params.get("sequence_type", params.get("type", "welcome"))
    # welcome | launch | sales | nurture | re-engagement | onboarding
    topic          = params.get("topic", "")
    product        = params.get("product", "consulting services and digital products")
    audience       = params.get("audience", "entrepreneurs and business owners")
    num_emails     = int(params.get("num_emails", 7))
    brand_voice    = params.get("brand_voice", "warm, direct, expert — like a knowledgeable friend")
    cta_url        = params.get("cta_url", "[YOUR_URL]")

    if not topic:
        return {"error": "Provide a topic for the email sequence"}
    if not ai_router:
        return {"error": "ai_router not available"}

    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "email_sequences")
    os.makedirs(save_dir, exist_ok=True)

    seq_context = {
        "welcome":       "A welcome sequence for new subscribers. Build trust, deliver value, introduce CC's story, tease the product.",
        "launch":        "A product launch sequence. Build anticipation, share story, handle objections, open cart, push urgency, close.",
        "sales":         "A direct sales funnel. Qualify leads, demonstrate value, social proof, offer, follow-up.",
        "nurture":       "A nurture sequence that educates subscribers over time and warms them to buy.",
        "re-engagement": "Win back cold subscribers. Remind them of value, offer something free, confirm they want to stay.",
        "onboarding":    "Onboard new customers/clients. Welcome, quick-win, next steps, check-in, support, upsell.",
    }

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are an email copywriter who specializes in high-converting email sequences. "
                "Your emails feel personal, not salesy. They deliver value and naturally lead to purchases."
            )},
            {"role": "user", "content": (
                f"Write a complete {num_emails}-email {sequence_type} sequence.\n\n"
                f"Context: {seq_context.get(sequence_type, '')}\n"
                f"Topic: {topic}\n"
                f"Product/service being sold: {product}\n"
                f"Audience: {audience}\n"
                f"Brand voice: {brand_voice}\n"
                f"Main CTA URL: {cta_url}\n\n"
                f"For EACH email deliver:\n"
                f"EMAIL [N] — Day [X] after signup\n"
                f"Subject line: (write 3 options — direct, curiosity, list format)\n"
                f"Preview text: (one line, 90 chars)\n"
                f"Body: (complete email, 200-400 words, formatted with [FIRST_NAME] placeholder)\n"
                f"CTA: (specific action + button text)\n"
                f"---\n\n"
                f"Write all {num_emails} emails in full. No summaries — complete copy."
            )},
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=6000,
        temperature=0.7,
    )

    content = resp.get("content", "").strip()
    final_title = f"{sequence_type.title()} Sequence: {topic}"

    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in f"{sequence_type}-{topic}".lower())[:40]
    fname = f"email_seq_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": final_title,
        "sequence_type": sequence_type,
        "num_emails": num_emails,
        "topic": topic,
        "content": content,
        "saved_to": save_path,
        "load_into": {
            "ConvertKit": "Sequences → New Sequence → paste each email",
            "Mailchimp": "Automations → Customer Journeys → paste emails",
            "Beehiiv": "Automations → New Automation (free plan available)",
            "ActiveCampaign": "Automations → paste as email steps",
        },
        "income_note": "A good welcome sequence converts 2-5% of subscribers into buyers. 1000 subscribers × 3% × $97 product = $2,910.",
    }
