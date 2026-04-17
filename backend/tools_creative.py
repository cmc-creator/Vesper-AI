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


# ────────────────────────────────────────────────────────────────
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

    if resp.get("error"):
        print(f"[WRITE_CREATIVE] AI call failed: {resp['error']}")
        return {"error": f"Creative writing failed — {resp['error']}"}
    content = (resp.get("content") or "").strip()
    if not content:
        return {"error": "Creative writing returned empty. The AI provider may be busy — try again."}

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
        max_tokens=min(max(int(words * 2.5), 4000), 16000),  # floor 4000 so Gemini never truncates short requests
        temperature=0.88,
    )

    if resp.get("error"):
        print(f"[WRITE_CHAPTER] AI call failed: {resp['error']}")
        return {"error": f"Chapter generation failed — {resp['error']}"}
    content = (resp.get("content") or "").strip()
    if not content:
        return {"error": "Chapter generation returned empty content. The AI provider may be busy — try again."}
    # Reject stub responses — if under 400 words the model produced a summary not a chapter
    word_count_check = len(content.split())
    if word_count_check < 400:
        return {"error": f"Chapter generation returned only {word_count_check} words (expected ~{words}). Provider may have summarised instead of writing — try again."}

    # Save chapter file with professional book formatting
    save_dir = os.path.join(
        os.path.dirname(__file__), "..", "vesper-ai", "creations", "books",
        "".join(c if c.isalnum() or c == "-" else "-" for c in book_title.lower())[:40],
    )
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, f"chapter_{chapter_number:03d}.md")
    
    # Build professional book chapter with YAML frontmatter and formatting guidance
    timestamp = datetime.datetime.now().isoformat()
    frontmatter = (
        f"---\n"
        f"title: {book_title}\n"
        f"chapter_number: {chapter_number}\n"
        f"chapter_title: {chapter_title}\n"
        f"author: {author_name}\n"
        f"genre: {genre}\n"
        f"word_count: {word_count_check}\n"
        f"date_written: {timestamp}\n"
        f"status: draft\n"
        f"---\n\n"
    )
    
    # Professional chapter header with hierarchy
    chapter_header = (
        f"# {book_title}\n\n"
        f"## Chapter {chapter_number} — {chapter_title}\n\n"
        f"**By {author_name}**  \n"
        f"*{genre.capitalize()} • {word_count_check} words*\n\n"
        f"---\n\n"
    )
    
    # Main chapter content with proper paragraph breaks
    formatted_content = content.strip()
    # Ensure proper paragraph separation for ebook export
    formatted_content = re.sub(r'\n(?!\n)', '\n\n', formatted_content)
    
    # Formatting checklist and publishing guidance
    publishing_note = (
        f"\n\n---\n\n"
        f"## Publishing Checklist\n\n"
        f"- [ ] **Proofread** — check for typos, grammar, consistency\n"
        f"- [ ] **Format** — ensure consistent styling throughout\n"
        f"- [ ] **Structure** — verify chapter flows logically\n"
        f"- [ ] **KDP Ready** — proper markdown for Amazon KDP\n"
        f"- [ ] **Images** — add if needed (save as separate .png files)\n"
        f"- [ ] **Metadata** — update genre, keywords for discovery\n\n"
        f"**Next Steps:**\n"
        f"1. Keep writing with Vesper (say 'write next chapter')\n"
        f"2. Combine all chapters into complete manuscript\n"
        f"3. Upload to KDP at: https://kdp.amazon.com\n"
        f"4. Set price ($2.99–$9.99 typically earns best royalties)\n"
        f"5. Include cover (use create_art_for_sale for cover design)\n\n"
        f"**Current Progress:**\n"
        f"- Total manuscript: {session.get('word_count_total', 0) + word_count_check} words\n"
        f"- Chapters completed: {chapter_number}\n"
        f"- Session updated: {timestamp}\n"
    )
    
    full_doc = frontmatter + chapter_header + formatted_content + publishing_note
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
        "publishing_note": (
            f"✍️ Chapter {chapter_number} complete. "
            f"Total manuscript: {updated_session['word_count_total']} words across {chapter_number} chapters. "
            f"Just say 'write next chapter' or 'compile book' when ready."
        ),
        "session_note": f"Session saved. Next: Chapter {chapter_number + 1}. Just say 'keep writing' — Vesper remembers everything.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# COMPILE MANUSCRIPT — Assemble all chapters into a publishable book
# ─────────────────────────────────────────────────────────────────────────────

async def compile_manuscript(params: dict, ai_router=None, TaskType=None) -> dict:
    """
    Compile all written chapters into a complete, KDP-ready manuscript.
    
    Output includes:
    - Complete manuscript with frontmatter, TOC, all chapters
    - Print-ready PDF instructions
    - KDP submission checklist
    - Marketing copy template for book description
    """
    session = _load_writing_session()
    
    if not session or not session.get("book_title"):
        return {"error": "No active writing project. Start with 'write_chapter' first."}
    
    book_title = session.get("book_title", "Untitled")
    author_name = session.get("author_name", "C.M. Cooper")
    genre = session.get("genre", "fiction")
    chapters_written = session.get("chapters_written", [])
    word_count_total = session.get("word_count_total", 0)
    
    if not chapters_written:
        return {"error": "No chapters written yet. Try 'write_chapter' first."}
    
    # Load all chapter files in order
    book_dir = os.path.join(
        os.path.dirname(__file__), "..", "vesper-ai", "creations", "books",
        "".join(c if c.isalnum() or c == "-" else "-" for c in book_title.lower())[:40],
    )
    
    if not os.path.exists(book_dir):
        return {"error": f"Book directory not found: {book_dir}"}
    
    # Collect chapter content in order
    chapter_contents = []
    chapter_toc = []
    total_words = 0
    
    for ch_meta in sorted(chapters_written, key=lambda x: x.get("number", 0)):
        ch_num = ch_meta.get("number", 0)
        ch_title = ch_meta.get("title", f"Chapter {ch_num}")
        ch_file = os.path.join(book_dir, f"chapter_{ch_num:03d}.md")
        
        chapter_toc.append(f"- Chapter {ch_num}: {ch_title}")
        
        if os.path.exists(ch_file):
            try:
                with open(ch_file, "r", encoding="utf-8") as f:
                    full_content = f.read()
                    # Extract just the body (remove frontmatter and publishing notes)
                    if "---" in full_content:
                        parts = full_content.split("---")
                        if len(parts) >= 3:
                            body = parts[2]  # Content between second and third ---
                        else:
                            body = full_content
                    else:
                        body = full_content
                    
                    # Remove publishing checklist section if present
                    if "## Publishing Checklist" in body:
                        body = body.split("## Publishing Checklist")[0]
                    
                    chapter_contents.append(body.strip())
                    total_words += len(body.split())
            except Exception as e:
                print(f"[COMPILE] Error reading chapter {ch_num}: {e}")
    
    # Build complete manuscript with professional structure
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    word_count = sum(ch.get("words", 0) for ch in chapters_written)
    
    manuscript = (
        f"---\n"
        f"title: {book_title}\n"
        f"author: {author_name}\n"
        f"genre: {genre}\n"
        f"word_count: {total_words}\n"
        f"chapters: {len(chapters_written)}\n"
        f"compiled_date: {timestamp}\n"
        f"status: ready_for_kdp\n"
        f"---\n\n"
    )
    
    # Title page
    manuscript += (
        f"# {book_title}\n\n"
        f"**By {author_name}**\n\n"
        f"{genre.capitalize()} • {total_words:,} words\n\n"
        f"---\n\n"
    )
    
    # Table of Contents
    manuscript += "## Table of Contents\n\n" + "\n".join(chapter_toc) + "\n\n---\n\n"
    
    # All chapter content
    manuscript += "\n\n".join(chapter_contents)
    
    # Add publication metadata and instructions
    manuscript += (
        f"\n\n---\n\n"
        f"## Publishing Guide\n\n"
        f"### Ready for KDP (Amazon Kindle Direct Publishing)\n\n"
        f"**File Format:** This manuscript is in Markdown format, compatible with:\n"
        f"- Amazon KDP Kindle (convert with tools like Pandoc or upload .docx)\n"
        f"- IngramSpark for print-on-demand paperback\n"
        f"- Smashwords for multi-platform ebook distribution\n\n"
        f"**Word Count:** {total_words:,} words ({len(chapters_written)} chapters)\n\n"
        f"**Next Steps to Publish:**\n\n"
        f"1. **Review & Proofread**\n"
        f"   - Read through for grammar, consistency, flow\n"
        f"   - Check chapter transitions and continuity\n\n"
        f"2. **Format for KDP**\n"
        f"   - Save as Word (.docx) file with proper formatting\n"
        f"   - Set margins: 0.5\" on all sides\n"
        f"   - Font: 12pt serif (Times New Roman)\n"
        f"   - Line spacing: 1.5 or double\n\n"
        f"3. **Create Cover**\n"
        f"   - Use service like Canva (free) or Fiverr\n"
        f"   - Dimensions: 6\" x 9\" for standard paperback\n"
        f"   - Include title, author name, cover image\n"
        f"   - See: create_art_for_sale for AI cover design\n\n"
        f"4. **Upload to KDP**\n"
        f"   - Go to: https://kdp.amazon.com\n"
        f"   - Create new title, upload manuscript and cover\n"
        f"   - Set retail price: $2.99–$9.99 (best margin)\n"
        f"   - Enable KDP Select for exclusive distribution\n\n"
        f"5. **Distribute to Other Platforms** (optional)\n"
        f"   - Smashwords: reaches Apple Books, Google Play, Kobo\n"
        f"   - Draft2Digital: automatic formatting, multiple stores\n"
        f"   - IngramSpark: paper + hardcover + POD distribution\n\n"
        f"**Estimated Timeline:**\n"
        f"- Format & proofread: 1–2 days\n"
        f"- Design cover: 3–5 days\n"
        f"- Upload & review on KDP: 1 day\n"
        f"- Live on Amazon: 24–48 hours after approval\n\n"
        f"**Estimated Royalties (at $4.99 price point):**\n"
        f"- Kindle: ~$1.75 per sale (35% royalty)\n"
        f"- Paperback (via IngramSpark): ~$2.00 per sale\n"
        f"- Monthly passive income potential: $100–$5,000+ depending on sales\n\n"
    )
    
    # Save complete manuscript
    manuscript_dir = os.path.dirname(book_dir)
    os.makedirs(manuscript_dir, exist_ok=True)
    manuscript_path = os.path.join(manuscript_dir, f"{book_title}_MANUSCRIPT.md")
    _safe_write(manuscript_path, manuscript)
    
    return {
        "success": True,
        "book_title": book_title,
        "author": author_name,
        "genre": genre,
        "total_word_count": total_words,
        "chapter_count": len(chapters_written),
        "manuscript_saved_to": manuscript_path,
        "manuscript_content": manuscript,
        "next_steps": [
            "1. Download manuscript and proofread in Word/Google Docs",
            "2. Create book cover (use create_art_for_sale or canva.com)",
            "3. Upload to KDP: https://kdp.amazon.com",
            "4. Set price $4.99–$6.99 for best royalties",
            "5. Enable KDP Select for Amazon Kindle exclusivity"
        ],
        "status": "ready_for_kdp",
        "publishing_note": f"✅ Manuscript compiled! {total_words:,} words across {len(chapters_written)} chapters. Ready to format and publish on KDP for passive income."
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
    published = True  # always publish immediately — drafts are useless and cost CC money

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


# ─────────────────────────────────────────────────────────────────────────────
# SALES PAGE COPYWRITER — High-converting sales pages
# ─────────────────────────────────────────────────────────────────────────────

async def write_sales_page(params: dict, ai_router=None, TaskType=None) -> dict:
    """Write a complete, high-converting sales page for any product or service."""
    product = params.get("product", "")
    price = params.get("price", "")
    audience = params.get("audience", "")
    pain_points = params.get("pain_points", "")
    benefits = params.get("benefits", "")
    guarantee = params.get("guarantee", "30-day money back guarantee")
    testimonials = params.get("testimonials", "")
    urgency = params.get("urgency", "")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": "You are a world-class direct response copywriter with a track record of writing 7-figure sales pages. You write with energy, specificity, and emotional resonance."},
            {"role": "user", "content": (
                f"Write a COMPLETE, high-converting sales page for:\n"
                f"Product/Service: {product}\n"
                f"Price: {price}\n"
                f"Target Audience: {audience}\n"
                f"Pain Points: {pain_points}\n"
                f"Key Benefits: {benefits}\n"
                f"Guarantee: {guarantee}\n"
                f"Testimonials provided: {testimonials or 'None — write placeholder blocks'}\n"
                f"Urgency/Scarcity: {urgency or 'None'}\n\n"
                "Include ALL of:\n"
                "1. Headline + subheadline (pattern interrupt, speak to the pain)\n"
                "2. Opening story/hook (2-3 paragraphs)\n"
                "3. Problem section (agitate the pain)\n"
                "4. Solution introduction\n"
                "5. What's included (full bullet list with benefits not features)\n"
                "6. Transformation section ('Imagine your life when...')\n"
                "7. Testimonial blocks (3-5, use placeholders if none provided)\n"
                "8. About the author/creator section\n"
                "9. Objections & answers FAQ (5 questions)\n"
                "10. Guarantee section\n"
                "11. Price anchor and offer breakdown\n"
                "12. Strong CTA with buy button copy\n"
                "13. P.S. (highest-read part of any sales page)\n\n"
                "Use bold headers, short paragraphs, and persuasive urgency where appropriate. Write in full, ready-to-use copy."
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=4000,
        temperature=0.7,
    )

    content = resp.get("content", "").strip()
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "sales_pages")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in product.lower())[:40]
    fname = f"sales_page_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": f"Sales Page: {product}",
        "product": product,
        "price": price,
        "content": content,
        "saved_to": save_path,
        "publish_options": [
            "Paste into Gumroad product page",
            "Use in ConvertKit landing page builder",
            "Host on Carrd.co (free plan available)",
            "Add to your WordPress/Squarespace site",
            "Use as a Notion page (share publicly)",
        ],
        "income_note": "A sales page converts 1-5% of traffic. 1000 visitors × 2% × $97 = $1,940.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# LEAD MAGNET CREATOR — Build CC's email list
# ─────────────────────────────────────────────────────────────────────────────

async def create_lead_magnet(params: dict, ai_router=None, TaskType=None) -> dict:
    """Create a high-value lead magnet to grow CC's email list."""
    topic = params.get("topic", "")
    audience = params.get("audience", "")
    format_type = params.get("format", "checklist")  # checklist | mini-guide | swipe-file | toolkit | cheat-sheet | template | email-course
    brand = params.get("brand", "Connie Michelle Consulting")
    cta = params.get("cta", "")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": "You are a lead generation expert who creates irresistible free resources that build email lists. You write crisp, high-value content people actually want."},
            {"role": "user", "content": (
                f"Create a complete, ready-to-publish lead magnet:\n"
                f"Topic: {topic}\n"
                f"Audience: {audience}\n"
                f"Format: {format_type}\n"
                f"Brand: {brand}\n"
                f"CTA/What they get next: {cta or 'Join the email list'}\n\n"
                "Deliver:\n"
                "1. Compelling title (includes a number or strong promise)\n"
                "2. Subtitle (what they'll get)\n"
                "3. The full lead magnet content (complete, not a stub)\n"
                "4. Opt-in form headline and description (to put on the sign-up page)\n"
                "5. Delivery email subject line + body (what you send after they sign up)\n"
                "6. 3 LinkedIn/social post ideas to promote this lead magnet\n\n"
                "Make the content genuinely valuable — this is what earns the email address and trust."
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=3000,
        temperature=0.7,
    )

    content = resp.get("content", "").strip()
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "lead_magnets")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in topic.lower())[:40]
    fname = f"lead_magnet_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": f"Lead Magnet: {topic}",
        "format": format_type,
        "topic": topic,
        "content": content,
        "saved_to": save_path,
        "distribute_via": [
            "ConvertKit landing page (free plan: 1000 subscribers)",
            "Beehiiv (free up to 2500 subscribers + monetization)",
            "Mailchimp free tier",
            "Gumroad 'pay what you want' (set min to $0)",
        ],
        "income_note": "1000-email list → 1 product launch = typically $3k-$10k depending on offer price.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# WEBINAR SCRIPT — Sell high-ticket products/services live
# ─────────────────────────────────────────────────────────────────────────────

async def write_webinar_script(params: dict, ai_router=None, TaskType=None) -> dict:
    """Write a complete webinar script using the proven 'Perfect Webinar' framework."""
    topic = params.get("topic", "")
    product = params.get("product", "")
    price = params.get("price", "")
    audience = params.get("audience", "")
    duration_minutes = int(params.get("duration_minutes", 60))
    presenter_name = params.get("presenter_name", "Connie Michelle")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a webinar conversion expert who has scripted webinars generating millions in revenue. "
                "You use Russell Brunson's Perfect Webinar framework and know exactly when to seed the offer, "
                "handle objections, and close. You write full word-for-word scripts, not outlines."
            )},
            {"role": "user", "content": (
                f"Write a COMPLETE {duration_minutes}-minute webinar script:\n"
                f"Topic: {topic}\n"
                f"Product being sold: {product}\n"
                f"Price: {price}\n"
                f"Audience: {audience}\n"
                f"Presenter: {presenter_name}\n\n"
                "Follow this structure with full word-for-word script:\n"
                "1. INTRO (5 min): Hook, credibility, agenda, promise\n"
                "2. CONTENT (30 min): 3 big secrets/strategies — each one destroys a false belief and seeds the product\n"
                "3. TRANSITION (5 min): 'Now I want to show you how to implement everything FAST...'\n"
                "4. THE OFFER (10 min): Stack the value, reveal price, bonuses, urgency\n"
                "5. Q&A / OBJECTION HANDLING (10 min): Pre-handle 5 common objections\n"
                "6. CLOSE: Final CTA, scarcity, next steps\n\n"
                "Include: slide titles for each section, word-for-word speaking script, and timing cues."
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=4000,
        temperature=0.7,
    )

    content = resp.get("content", "").strip()
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "webinars")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in topic.lower())[:40]
    fname = f"webinar_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": f"Webinar Script: {topic}",
        "product": product,
        "duration_minutes": duration_minutes,
        "content": content,
        "saved_to": save_path,
        "host_on": [
            "Zoom Webinars (free up to 100 attendees)",
            "StreamYard → YouTube Live (free)",
            "Demio (trial available)",
            "WebinarJam (best conversion tracking)",
        ],
        "income_note": f"Webinars average 10-20% close rate. 50 attendees × 15% × {price or '$497'} = significant revenue.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# COLD OUTREACH GENERATOR — Fill CC's consulting pipeline
# ─────────────────────────────────────────────────────────────────────────────

async def generate_cold_outreach(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a personalized cold outreach sequence to land consulting clients."""
    prospect_type = params.get("prospect_type", "")
    service_offered = params.get("service_offered", "")
    pain_point = params.get("pain_point", "")
    sender_name = params.get("sender_name", "Connie Michelle")
    sender_credentials = params.get("sender_credentials", "")
    num_touchpoints = int(params.get("num_touchpoints", 5))
    channel = params.get("channel", "email")  # email | linkedin | both

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a B2B sales expert who books high-ticket consulting clients via cold outreach. "
                "You write short, hyper-personalized, outcome-focused messages that get replies. "
                "No fluff, no 'I hope this finds you well', no 10-paragraph emails. Short = more replies."
            )},
            {"role": "user", "content": (
                f"Write a complete {num_touchpoints}-touchpoint cold outreach sequence:\n"
                f"Prospect type: {prospect_type}\n"
                f"Service offered: {service_offered}\n"
                f"Core pain point addressed: {pain_point}\n"
                f"Sender: {sender_name}\n"
                f"Credentials: {sender_credentials}\n"
                f"Channel: {channel}\n\n"
                "For each touchpoint provide:\n"
                "- Day number (when to send)\n"
                "- Subject line (if email) or message hook (if LinkedIn)\n"
                "- Full message (under 150 words each)\n"
                "- Psychological principle used (curiosity / social proof / specificity / etc.)\n\n"
                "Also include:\n"
                "- A 'permission-based opener' alternative for cold LinkedIn connections\n"
                "- 3 personalization variables to fill in for each prospect\n"
                "- What to do if they reply 'not interested'\n"
                "- Tracking metrics to watch (reply rate, meeting booked rate)"
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=3000,
        temperature=0.7,
    )

    content = resp.get("content", "").strip()
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "outreach")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in prospect_type.lower())[:40]
    fname = f"outreach_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": f"Cold Outreach: {service_offered} → {prospect_type}",
        "prospect_type": prospect_type,
        "num_touchpoints": num_touchpoints,
        "channel": channel,
        "content": content,
        "saved_to": save_path,
        "send_via": {
            "email": "Apollo.io (free: 50 emails/month), Hunter.io, or Instantly.ai",
            "linkedin": "LinkedIn Sales Navigator or manual outreach",
        },
        "income_note": "5% reply rate on 100 cold emails = 5 conversations. 1 close at $3k = 3k from a spreadsheet.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# KDP LISTING OPTIMIZER — Maximize Amazon book visibility
# ─────────────────────────────────────────────────────────────────────────────

async def write_kdp_listing(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a fully optimized Amazon KDP book listing."""
    title = params.get("title", "")
    synopsis = params.get("synopsis", "")
    genre = params.get("genre", "")
    audience = params.get("audience", "")
    author_name = params.get("author_name", "C. Michelle Cooper")
    price = float(params.get("price", 9.99))

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are an Amazon KDP publishing expert who has launched multiple bestselling books. "
                "You know keyword research, A9 algorithm optimization, and what makes people click 'Buy Now'. "
                "Return raw JSON only."
            )},
            {"role": "user", "content": (
                f"Create a fully optimized Amazon KDP listing:\n"
                f"Title: {title}\n"
                f"Genre: {genre}\n"
                f"Audience: {audience}\n"
                f"Author: {author_name}\n"
                f"Price: ${price}\n"
                f"Synopsis/Content: {synopsis}\n\n"
                "Return a JSON object with:\n"
                '{"title": "...", "subtitle": "...(keyword-rich, benefit-focused)", '
                '"series_name": "...(optional)", '
                '"description_html": "...full HTML description with <b> tags, using bold headers, '
                'emotional hooks, and keyword-rich copy — 150-300 words", '
                '"7_keywords": ["keyword1","keyword2","keyword3","keyword4","keyword5","keyword6","keyword7"], '
                '"bisac_primary": "...", "bisac_secondary": "...", '
                '"target_age_range": "...", '
                '"pricing_strategy": {"ebook_price": 0.00, "paperback_price": 0.00, "kdp_select_recommended": true}, '
                '"cover_brief": "...(visual direction for cover designer/DALL-E)", '
                '"a_plus_content_headline": "...", "a_plus_content_body": "...", '
                '"launch_strategy": ["step 1", "step 2", "step 3", "step 4", "step 5"]}'
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=2000,
        temperature=0.5,
    )

    data = _extract_json(resp.get("content", "{}"))
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "kdp_listings")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in title.lower())[:40]
    fname = f"kdp_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.json"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, json.dumps(data, indent=2))

    royalty_70 = round(price * 0.70, 2)
    royalty_35 = round(price * 0.35, 2)

    return {
        "success": True,
        "title": title,
        "listing": data,
        "saved_to": save_path,
        "royalty_estimate": {
            "price": price,
            "70pct_royalty_per_sale": royalty_70,
            "35pct_royalty_per_sale": royalty_35,
            "note": "70% applies for $2.99-$9.99 pricing",
            "at_50_sales_month": f"${round(royalty_70 * 50, 2)}/month",
            "at_200_sales_month": f"${round(royalty_70 * 200, 2)}/month",
        },
        "next_steps": [
            "Go to kdp.amazon.com → Add New Title",
            "Paste title, subtitle, author name from listing above",
            "Copy/paste description_html into the description field",
            "Enter the 7 keywords into the keyword fields",
            "Select the BISAC categories listed",
            "Upload your manuscript (Word/PDF) and cover image",
            "Set price and enroll in KDP Select for bonus royalties",
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# YOUTUBE VIDEO PACKAGE — Title, description, tags, chapters, thumbnail
# ─────────────────────────────────────────────────────────────────────────────

async def write_youtube_package(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a complete YouTube video package — everything needed to upload and rank."""
    topic = params.get("topic", "")
    channel_niche = params.get("channel_niche", "business and consulting")
    video_length_minutes = int(params.get("video_length_minutes", 10))
    monetization_goal = params.get("monetization_goal", "")  # affiliate | course | consulting | adsense
    channel_name = params.get("channel_name", "Connie Michelle")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a YouTube SEO and content strategy expert. You write titles that get clicked, "
                "descriptions that rank, and scripts that keep viewers watching. "
                "Every video should move toward monetization. Return raw JSON only."
            )},
            {"role": "user", "content": (
                f"Create a complete YouTube video package:\n"
                f"Topic: {topic}\n"
                f"Channel niche: {channel_niche}\n"
                f"Video length: {video_length_minutes} minutes\n"
                f"Monetization goal: {monetization_goal or 'AdSense + consulting leads'}\n"
                f"Channel name: {channel_name}\n\n"
                "Return a JSON object with:\n"
                '{"title_options": ["option1 (under 70 chars)", "option2", "option3"], '
                '"chosen_title": "best option", '
                '"description": "full 500-word SEO description with timestamps placeholder, '
                'links section, and CTA to email list or product", '
                '"tags": ["15-20 relevant tags"], '
                '"chapters": [{"timestamp": "0:00", "title": "..."}, ...], '
                '"thumbnail_text": "big bold text for thumbnail (max 6 words)", '
                '"thumbnail_visual_brief": "visual design direction for thumbnail", '
                '"hook_script": "first 30 seconds word-for-word (make it impossible to click away)", '
                '"cta_scripts": {"mid_roll": "...", "end_screen": "..."}, '
                '"pinned_comment": "...(what to pin as first comment)", '
                '"monetization_placements": ["when to mention affiliate link", "when to pitch product"], '
                '"repurpose_clips": ["timestamp range 1 and why it works as a clip", "range 2"]}'
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=2500,
        temperature=0.7,
    )

    data = _extract_json(resp.get("content", "{}"))
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "youtube")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in topic.lower())[:40]
    fname = f"yt_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.json"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, json.dumps(data, indent=2))

    return {
        "success": True,
        "title": f"YouTube Package: {topic}",
        "package": data,
        "saved_to": save_path,
        "upload_checklist": [
            "Use chosen_title exactly as written",
            "Paste description into YouTube description box",
            "Add all tags to the tags field",
            "Create thumbnail using Canva with thumbnail_text overlaid",
            "Add chapters via the chapters list",
            "Pin the pinned_comment immediately after upload",
            "Schedule for Tue-Thu 12-3pm in audience timezone",
        ],
        "income_note": "YouTube pays $2-$8 CPM. 10k views/month = $20-$80 AdSense + consulting leads.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# AFFILIATE CONTENT — Write articles that earn commissions passively
# ─────────────────────────────────────────────────────────────────────────────

async def write_affiliate_content(params: dict, ai_router=None, TaskType=None) -> dict:
    """Write SEO-optimized affiliate content — reviews, comparisons, and 'best of' articles."""
    content_type = params.get("content_type", "review")  # review | comparison | best-of | how-to-buy
    product_or_niche = params.get("product_or_niche", "")
    affiliate_program = params.get("affiliate_program", "Amazon Associates")
    audience = params.get("audience", "")
    commission_rate = params.get("commission_rate", "")
    target_keywords = params.get("target_keywords", "")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are an affiliate marketing content specialist who writes articles that rank on Google "
                "and convert readers into buyers. You understand search intent, trust signals, and how to "
                "place affiliate links naturally without being spammy."
            )},
            {"role": "user", "content": (
                f"Write a complete affiliate content piece:\n"
                f"Content type: {content_type}\n"
                f"Product/Niche: {product_or_niche}\n"
                f"Affiliate program: {affiliate_program}\n"
                f"Target audience: {audience}\n"
                f"Commission rate: {commission_rate or 'standard'}\n"
                f"Target keywords: {target_keywords or 'research and include naturally'}\n\n"
                "Include:\n"
                "1. SEO headline (includes buyer-intent keyword)\n"
                "2. Meta description (150 chars, includes keyword)\n"
                "3. Full article (1200-1800 words) with:\n"
                "   - Quick answer/verdict at top (for featured snippet)\n"
                "   - Pros and cons table\n"
                "   - Detailed sections with H2/H3 headers\n"
                "   - Comparison table if applicable\n"
                "   - Natural [AFFILIATE LINK] placements (mark them clearly)\n"
                "   - Trust signals (how long tested, what criteria used)\n"
                "   - FAQ section (5 questions, targets 'People also ask')\n"
                "4. Schema markup suggestion (FAQ, Review, or HowTo)\n"
                "5. Internal linking opportunities (what pages to link from/to)\n"
                "6. Pinterest pin title + description for traffic"
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=3500,
        temperature=0.6,
    )

    content = resp.get("content", "").strip()
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "affiliate_content")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in product_or_niche.lower())[:40]
    fname = f"affiliate_{content_type}_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": f"Affiliate Content: {content_type} — {product_or_niche}",
        "content_type": content_type,
        "product": product_or_niche,
        "affiliate_program": affiliate_program,
        "content": content,
        "saved_to": save_path,
        "publish_to": [
            "WordPress blog (best for SEO)",
            "Medium (Partner Program pays per read)",
            "Substack (builds email list)",
            "HubPages (revenue share)",
        ],
        "income_note": f"Affiliate content earns passively 24/7. One ranking article can earn ${commission_rate or '5-50'}+ per sale indefinitely.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# PODCAST EPISODE CREATOR — Scripts + show notes + monetization
# ─────────────────────────────────────────────────────────────────────────────

async def create_podcast_episode(params: dict, ai_router=None, TaskType=None) -> dict:
    """Write a complete podcast episode — script, show notes, title, timestamps, and monetization hooks."""
    topic = params.get("topic", "")
    show_name = params.get("show_name", "")
    episode_number = params.get("episode_number", "")
    duration_minutes = int(params.get("duration_minutes", 30))
    guest = params.get("guest", "")
    monetization = params.get("monetization", "")
    host_name = params.get("host_name", "Connie Michelle")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": "You are a podcast producer and host coach who creates engaging, monetizable podcast content. You write natural conversational scripts, not stiff reads."},
            {"role": "user", "content": (
                f"Create a complete podcast episode package:\n"
                f"Show: {show_name or 'The Connie Michelle Show'}\n"
                f"Episode #{episode_number or 'N'}: {topic}\n"
                f"Host: {host_name}\n"
                f"Guest: {guest or 'Solo episode'}\n"
                f"Duration target: {duration_minutes} minutes\n"
                f"Monetization: {monetization or 'sponsor ad-reads + consulting CTA'}\n\n"
                "Deliver:\n"
                "1. Episode title (compelling, searchable)\n"
                "2. Episode description (100 words, for Spotify/Apple Podcasts)\n"
                "3. Full script:\n"
                "   - Intro (hook + welcome + what they'll learn)\n"
                "   - Ad read placeholder section 1 (pre-roll)\n"
                "   - Main content broken into sections with natural transitions\n"
                "   - Ad read placeholder section 2 (mid-roll)\n"
                "   - Key takeaways summary\n"
                "   - Strong CTA (email list, product, consulting call)\n"
                "   - Outro\n"
                "4. Show notes (formatted for the description box)\n"
                "5. Timestamps for chapters\n"
                "6. 5 clip ideas (which moments make great 60-second social clips)\n"
                "7. Email newsletter blurb to announce this episode"
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=4000,
        temperature=0.7,
    )

    content = resp.get("content", "").strip()
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "podcast_episodes")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in topic.lower())[:40]
    ep_tag = f"ep{episode_number}_" if episode_number else ""
    fname = f"podcast_{ep_tag}{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": f"Podcast Episode: {topic}",
        "episode_number": episode_number,
        "duration_minutes": duration_minutes,
        "content": content,
        "saved_to": save_path,
        "host_on": [
            "Spotify for Podcasters (free, auto-distributes everywhere)",
            "Buzzsprout (free 90-day trial)",
            "Anchor by Spotify (free + monetization)",
            "RSS.com (includes Spotify/Apple/Google distribution)",
        ],
        "income_note": "Podcast sponsorships pay $15-50 CPM. 1000 downloads/episode = $15-50/ep. Plus: listener-to-client pipeline.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# CASE STUDY WRITER — Convert client wins into sales assets
# ─────────────────────────────────────────────────────────────────────────────

async def write_case_study(params: dict, ai_router=None, TaskType=None) -> dict:
    """Write a persuasive client case study that turns results into new clients."""
    client_name = params.get("client_name", "")  # can be anonymized
    industry = params.get("industry", "")
    problem = params.get("problem", "")
    solution = params.get("solution", "")
    results = params.get("results", "")
    timeframe = params.get("timeframe", "")
    service_offered = params.get("service_offered", "")
    anonymize = params.get("anonymize", False)

    client_display = f"{industry} company" if anonymize else (client_name or "the client")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a B2B case study writer and conversion copywriter. You write case studies that "
                "make prospects see themselves in the story and want the same results. "
                "Every case study should function as a sales asset."
            )},
            {"role": "user", "content": (
                f"Write a compelling case study:\n"
                f"Client: {client_display}\n"
                f"Industry: {industry}\n"
                f"Problem they had: {problem}\n"
                f"Solution provided: {solution}\n"
                f"Results achieved: {results}\n"
                f"Timeframe: {timeframe}\n"
                f"Service this showcases: {service_offered}\n\n"
                "Structure:\n"
                "1. Headline (result + timeframe: 'How [client] achieved [result] in [time]')\n"
                "2. Subheadline (the core transformation)\n"
                "3. Executive Summary (3 bullets: challenge, solution, result)\n"
                "4. The Challenge section (make the pain real and relatable)\n"
                "5. The Solution section (what was done and why)\n"
                "6. The Results section (specific numbers, before/after, quotes)\n"
                "7. Client quote (write a believable endorsement they can approve)\n"
                "8. Key Takeaways (3 bullets prospects can apply to their situation)\n"
                "9. CTA (how readers can get the same results)\n\n"
                "Also write:\n"
                "- A LinkedIn post version of this case study\n"
                "- A tweet/X thread version (5 posts)\n"
                "- An email subject line to send this to prospects"
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=2500,
        temperature=0.6,
    )

    content = resp.get("content", "").strip()
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "case_studies")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in (industry + "-" + service_offered).lower())[:50]
    fname = f"case_study_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": f"Case Study: {industry} — {service_offered}",
        "client": client_display,
        "content": content,
        "saved_to": save_path,
        "use_as": [
            "Website /results or /case-studies page",
            "Proposal attachments to similar prospects",
            "LinkedIn article",
            "Email nurture sequence content",
            "Speaking/webinar social proof",
        ],
        "income_note": "One compelling case study can close deals worth 10x its creation cost.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# GENERATE INVOICE — Professional invoices for consulting work
# ─────────────────────────────────────────────────────────────────────────────

async def generate_invoice(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a professional consulting invoice ready to send."""
    client_name = params.get("client_name", "")
    client_email = params.get("client_email", "")
    client_company = params.get("client_company", "")
    services = params.get("services", [])  # [{"description": "...", "hours": 5, "rate": 150}] or [{"description": "...", "amount": 1000}]
    invoice_number = params.get("invoice_number", f"INV-{datetime.datetime.now().strftime('%Y%m%d')}")
    due_days = int(params.get("due_days", 14))
    sender_name = params.get("sender_name", "Connie Michelle Cooper")
    sender_business = params.get("sender_business", "Connie Michelle Consulting")
    sender_email = params.get("sender_email", "")
    notes = params.get("notes", "")
    payment_methods = params.get("payment_methods", ["PayPal", "Venmo", "Zelle", "Bank Transfer"])

    # Calculate totals
    line_items = []
    subtotal = 0.0
    for s in services:
        if isinstance(s, dict):
            desc = s.get("description", "Consulting Services")
            if "hours" in s and "rate" in s:
                hours = float(s.get("hours", 1))
                rate = float(s.get("rate", 150))
                amount = hours * rate
                line_items.append({"description": desc, "hours": hours, "rate": rate, "amount": amount})
            elif "amount" in s:
                amount = float(s.get("amount", 0))
                line_items.append({"description": desc, "amount": amount})
            else:
                amount = 0
                line_items.append({"description": desc, "amount": amount})
            subtotal += amount

    tax_rate = float(params.get("tax_rate", 0))
    tax_amount = round(subtotal * (tax_rate / 100), 2)
    total = round(subtotal + tax_amount, 2)
    due_date = (datetime.datetime.now() + datetime.timedelta(days=due_days)).strftime("%B %d, %Y")
    issue_date = datetime.datetime.now().strftime("%B %d, %Y")

    # Build markdown invoice
    lines = [
        f"# INVOICE",
        f"",
        f"**{sender_business}**",
        f"{sender_name}",
        f"{sender_email}",
        f"",
        f"---",
        f"",
        f"**Invoice #:** {invoice_number}",
        f"**Issue Date:** {issue_date}",
        f"**Due Date:** {due_date} (Net {due_days})",
        f"",
        f"**Bill To:**",
        f"{client_name}",
    ]
    if client_company:
        lines.append(client_company)
    if client_email:
        lines.append(client_email)
    lines += ["", "---", "", "## Services", ""]
    lines.append("| Description | Hours | Rate | Amount |")
    lines.append("|-------------|-------|------|--------|")
    for item in line_items:
        if "hours" in item:
            lines.append(f"| {item['description']} | {item['hours']} | ${item['rate']:.2f}/hr | ${item['amount']:.2f} |")
        else:
            lines.append(f"| {item['description']} | — | — | ${item['amount']:.2f} |")
    lines += [
        "",
        f"**Subtotal:** ${subtotal:.2f}",
    ]
    if tax_rate > 0:
        lines.append(f"**Tax ({tax_rate}%):** ${tax_amount:.2f}")
    lines += [
        f"**TOTAL DUE: ${total:.2f}**",
        "",
        "---",
        "",
        f"**Payment Methods:** {', '.join(payment_methods)}",
        "",
    ]
    if notes:
        lines += [f"**Notes:** {notes}", ""]
    lines += [
        f"*Thank you for your business! Payment due by {due_date}.*",
        f"*Late payments subject to 1.5% monthly interest after due date.*",
    ]

    content = "\n".join(lines)

    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "invoices")
    os.makedirs(save_dir, exist_ok=True)
    fname = f"{invoice_number.replace('/', '-')}_{client_name.replace(' ', '_')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "invoice_number": invoice_number,
        "client": client_name,
        "subtotal": subtotal,
        "tax": tax_amount,
        "total": total,
        "due_date": due_date,
        "content": content,
        "saved_to": save_path,
        "send_options": [
            "Copy markdown and paste into a Google Doc → File → Email as attachment",
            f"Send via Wave (free invoicing app — wave.com)",
            "Use PayPal Invoicing (free — paypal.com/invoice)",
            "Paste into FreshBooks or QuickBooks",
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# PRICING STRATEGY ADVISOR — Maximize what CC charges
# ─────────────────────────────────────────────────────────────────────────────

async def create_pricing_strategy(params: dict, ai_router=None, TaskType=None) -> dict:
    """Analyze CC's offerings and recommend optimal pricing to maximize revenue."""
    service_or_product = params.get("service_or_product", "")
    current_price = params.get("current_price", "")
    target_audience = params.get("target_audience", "")
    competition = params.get("competition", "")
    delivery_time = params.get("delivery_time", "")
    goal = params.get("goal", "maximize revenue")  # maximize_revenue | get_clients_fast | premium_positioning
    monthly_income_goal = params.get("monthly_income_goal", "")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a pricing strategist who has helped consultants and creators increase their revenue "
                "by 2-10x by optimizing how they package and price their offerings. "
                "You know value-based pricing, anchoring, tiering, and productized services."
            )},
            {"role": "user", "content": (
                f"Build a complete pricing strategy:\n"
                f"Service/Product: {service_or_product}\n"
                f"Current price (if any): {current_price or 'Not yet priced'}\n"
                f"Target audience: {target_audience}\n"
                f"Competition landscape: {competition or 'Analyze and assume'}\n"
                f"Delivery time: {delivery_time}\n"
                f"Goal: {goal}\n"
                f"Monthly income goal: {monthly_income_goal or 'Maximize'}\n\n"
                "Provide:\n"
                "1. Pricing audit — is current price too low/high/right and why\n"
                "2. 3-tier package recommendation (Good/Better/Best or Bronze/Silver/Gold):\n"
                "   - What's included at each tier\n"
                "   - Recommended price for each tier\n"
                "   - Which tier most buyers will choose (the anchor effect)\n"
                "3. Value justification script — how to explain your price without flinching\n"
                "4. Discount/payment plan strategy (when to offer, when not to)\n"
                "5. Price increase roadmap — when and how to raise prices\n"
                "6. Revenue math: at these prices, how many sales/clients to hit monthly goal\n"
                "7. Red flags to avoid (discounting, scope creep, undercharging)\n"
                "8. One pricing hack to test in the next 30 days"
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=2500,
        temperature=0.6,
    )

    content = resp.get("content", "").strip()
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "business_strategy")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in service_or_product.lower())[:40]
    fname = f"pricing_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": f"Pricing Strategy: {service_or_product}",
        "content": content,
        "saved_to": save_path,
        "income_note": "Most people undercharge by 2-3x. Raising prices often increases sales by attracting higher-quality clients.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# NEWSLETTER ISSUE WRITER — Monetized newsletter content
# ─────────────────────────────────────────────────────────────────────────────

async def write_newsletter_issue(params: dict, ai_router=None, TaskType=None) -> dict:
    """Write a complete monetized newsletter issue for Beehiiv, Substack, or ConvertKit."""
    newsletter_name = params.get("newsletter_name", "")
    topic = params.get("topic", "")
    issue_number = params.get("issue_number", "")
    audience = params.get("audience", "")
    sponsor = params.get("sponsor", "")  # optional sponsor to write an ad for
    product_to_pitch = params.get("product_to_pitch", "")
    tone = params.get("tone", "smart and conversational")
    word_count = int(params.get("word_count", 600))

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a newsletter writer who grows paid subscriber lists and generates sponsorship revenue. "
                "You write newsletters people actually open — punchy subject lines, clear value, "
                "genuine personality, and monetization that doesn't feel gross."
            )},
            {"role": "user", "content": (
                f"Write a complete newsletter issue:\n"
                f"Newsletter: {newsletter_name or 'The Connie Michelle Letter'}\n"
                f"Issue #{issue_number or 'N'}: {topic}\n"
                f"Audience: {audience}\n"
                f"Tone: {tone}\n"
                f"Target length: ~{word_count} words\n"
                f"Sponsor: {sponsor or 'No sponsor this issue'}\n"
                f"Product to pitch: {product_to_pitch or 'None — just provide value'}\n\n"
                "Deliver:\n"
                "1. Subject line (5 options, A/B testable)\n"
                "2. Preview text (shows under subject in inbox)\n"
                "3. Full newsletter body:\n"
                "   - Personal opening hook (1-2 paragraphs)\n"
                "   - Main content (the value — insight, story, framework, or how-to)\n"
                "   - Sponsor block (if applicable, write native ad copy)\n"
                "   - 'What I'm seeing/reading/thinking' section\n"
                "   - Product/service CTA (soft, not salesy)\n"
                "   - Sign-off with personality\n"
                "4. Social post to promote this issue (LinkedIn + Twitter)\n"
                "5. Recommended send time"
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=3000,
        temperature=0.8,
    )

    content = resp.get("content", "").strip()
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "newsletter_issues")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in topic.lower())[:40]
    ep_tag = f"issue{issue_number}_" if issue_number else ""
    fname = f"newsletter_{ep_tag}{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": f"Newsletter Issue: {topic}",
        "issue_number": issue_number,
        "content": content,
        "saved_to": save_path,
        "monetization_options": [
            "Beehiiv Boosts: earn $1-3 per new subscriber you refer",
            "Sponsorships: $50-500 per issue at 1000+ subscribers",
            "Paid tier: charge $5-20/month for premium content",
            "Product mentions: soft-sell your own offers each issue",
        ],
        "income_note": "1000 newsletter subscribers with 40% open rate = real monetization potential. Start free on Beehiiv.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# PRINT-ON-DEMAND LISTING PACK — Redbubble, Merch by Amazon, Society6
# ─────────────────────────────────────────────────────────────────────────────

async def create_pod_listing_pack(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a complete print-on-demand product listing pack for passive income."""
    design_concept = params.get("design_concept", "")
    niche = params.get("niche", "")
    platforms = params.get("platforms", ["Redbubble", "Merch by Amazon", "Society6"])
    num_variations = int(params.get("num_variations", 5))
    art_style = params.get("art_style", "")

    if isinstance(platforms, str):
        platforms = [p.strip() for p in platforms.split(",")]

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a print-on-demand expert who creates passive income through strategic product listings. "
                "You know which niches sell, how to write SEO titles and tags, and how to create design briefs "
                "that AI art tools can execute. Return raw JSON only."
            )},
            {"role": "user", "content": (
                f"Create a complete POD listing pack:\n"
                f"Design concept: {design_concept}\n"
                f"Niche: {niche}\n"
                f"Art style: {art_style or 'modern, clean, commercially appealing'}\n"
                f"Number of design variations: {num_variations}\n"
                f"Platforms: {', '.join(platforms)}\n\n"
                "Return a JSON object with:\n"
                '{"designs": ['
                '  {"variation_number": 1, "concept": "...", "ai_art_prompt": "...(detailed Midjourney/DALL-E prompt)", '
                '   "color_palette": ["hex1", "hex2"], "products_to_enable": ["t-shirt", "hoodie", "sticker", "poster"]}'
                '], '
                '"listing": {'
                '  "title_template": "...(include main keyword, keep under 60 chars for Merch)", '
                '  "tags": ["15 SEO tags"], '
                '  "description_template": "...(100 words, natural keyword inclusion)", '
                '  "bullet_points": ["benefit 1", "benefit 2", "benefit 3"] '
                '}, '
                '"pricing": {"t_shirt": 0.00, "hoodie": 0.00, "sticker": 0.00, "poster": 0.00}, '
                '"seo_strategy": "...", '
                '"estimated_monthly_income": "...", '
                '"launch_checklist": ["step 1", "step 2", "step 3"]}'
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=2500,
        temperature=0.7,
    )

    data = _extract_json(resp.get("content", "{}"))
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "pod_listings")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in (niche + "-" + design_concept).lower())[:50]
    fname = f"pod_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.json"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, json.dumps(data, indent=2))

    return {
        "success": True,
        "title": f"POD Listing Pack: {design_concept} — {niche}",
        "num_variations": num_variations,
        "platforms": platforms,
        "pack": data,
        "saved_to": save_path,
        "upload_to": {
            "Redbubble": "redbubble.com → Artist Account → Add New Work",
            "Merch by Amazon": "merch.amazon.com (request invite, then upload)",
            "Society6": "society6.com/sell",
            "Printful + Etsy": "Create Printful account → connect Etsy → auto-fulfill",
        },
        "income_note": "POD earns $2-8 per sale royalty. 100 listings × 2 sales/month = $400-1600 passive/month.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# GENERATE VIDEO — AI video creation with HeyGen/Runway/Pika
# ─────────────────────────────────────────────────────────────────────────────

async def generate_video(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a complete AI video package — script, shot list, voiceover, and generation prompts for HeyGen/Runway/Pika."""
    topic = params.get("topic", "")
    video_type = params.get("video_type", "explainer")  # explainer | promo | testimonial | tutorial | short | ugc-style | avatar
    duration_seconds = int(params.get("duration_seconds", 60))
    platform = params.get("platform", "YouTube")  # YouTube | TikTok | Instagram Reels | LinkedIn | landing page
    product = params.get("product", "")
    brand_voice = params.get("brand_voice", "confident and conversational")
    use_avatar = params.get("use_avatar", False)  # True = HeyGen avatar script
    cta = params.get("cta", "")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a video producer and AI video generation expert. You create complete video packages "
                "that work with HeyGen (avatar), Runway Gen-3 (cinematic), Pika (motion), and D-ID. "
                "You write scripts that sound natural spoken aloud — short sentences, punchy rhythm, no jargon. "
                "Return raw JSON only."
            )},
            {"role": "user", "content": (
                f"Create a complete AI video package:\n"
                f"Topic: {topic}\n"
                f"Type: {video_type}\n"
                f"Duration: {duration_seconds} seconds\n"
                f"Platform: {platform}\n"
                f"Product/Service: {product or 'N/A'}\n"
                f"Brand voice: {brand_voice}\n"
                f"Use AI avatar (HeyGen): {use_avatar}\n"
                f"Call to action: {cta or 'Visit the website / DM for details'}\n\n"
                "Return a JSON object with:\n"
                '{"title": "...", '
                '"hook": "...(first 3 seconds — must stop the scroll)", '
                '"voiceover_script": "...(complete word-for-word, timed to duration)", '
                '"scene_breakdown": ['
                '  {"scene": 1, "timestamp": "0:00-0:05", "visual_description": "...", '
                '   "runway_prompt": "...(detailed Runway Gen-3 prompt)", '
                '   "b_roll_search_term": "...(what to search on Pexels/Pixabay)"}'
                '], '
                '"heygen_avatar_script": "...(if use_avatar: full script with [PAUSE] markers and emphasis notes)", '
                '"pika_animation_prompts": ["...", "..."], '
                '"captions_style": "...(font, color, animation style for CapCut/Premiere)", '
                '"thumbnail_concept": "...(visual + text overlay)", '
                '"platform_metadata": {'
                '  "title": "...", "description": "...", "hashtags": ["...", "..."], '
                '  "optimal_length_note": "..."'
                '}, '
                '"tools_needed": ["HeyGen", "Runway", "Pika", "CapCut", "ElevenLabs"], '
                '"export_settings": "...(resolution, fps, format for the platform)", '
                '"monetization_cta_placement": "...(exact second to show CTA)"}'
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=3000,
        temperature=0.7,
    )

    data = _extract_json(resp.get("content", "{}"))
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "videos")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in topic.lower())[:40]
    fname = f"video_{video_type}_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.json"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, json.dumps(data, indent=2))

    return {
        "success": True,
        "title": f"Video Package: {topic}",
        "video_type": video_type,
        "platform": platform,
        "duration_seconds": duration_seconds,
        "package": data,
        "saved_to": save_path,
        "ai_video_tools": {
            "HeyGen": "heygen.com — AI avatar presenter, paste voiceover_script. Free credits on signup.",
            "Runway Gen-3": "runwayml.com — use runway_prompt fields for each scene. 125 credits free.",
            "Pika": "pika.art — animate stills, use pika_animation_prompts. Free tier available.",
            "ElevenLabs": "elevenlabs.io — text-to-speech for voiceover_script. Free 10k chars/month.",
            "CapCut": "capcut.com — free editor for assembly, captions, transitions.",
            "D-ID": "d-id.com — talking photo/avatar alternative to HeyGen.",
        },
        "income_note": "Video content drives the highest-converting traffic. One viral short = thousands of leads.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# TIKTOK / REELS CONTENT PACK — Short-form video dominance
# ─────────────────────────────────────────────────────────────────────────────

async def create_tiktok_pack(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a week of TikTok/Reels content — hooks, scripts, captions, hashtags, sound recommendations."""
    niche = params.get("niche", "")
    num_videos = int(params.get("num_videos", 7))
    goal = params.get("goal", "grow following + drive consulting leads")
    brand = params.get("brand", "Connie Michelle")
    style = params.get("style", "educational + motivational")
    product_to_promote = params.get("product_to_promote", "")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a TikTok and Reels content strategist who has grown accounts to 100k+ followers. "
                "You know the hook formula, pattern interrupts, and which content pillars drive the algorithm. "
                "Short-form video is the fastest way to build a following that converts to buyers. "
                "Return raw JSON only."
            )},
            {"role": "user", "content": (
                f"Create a {num_videos}-video short-form content pack:\n"
                f"Niche: {niche}\n"
                f"Goal: {goal}\n"
                f"Brand/Creator: {brand}\n"
                f"Style: {style}\n"
                f"Product to promote (weave in naturally): {product_to_promote or 'None — just grow'}\n\n"
                "Return a JSON object with:\n"
                '{"content_strategy": "...(2-sentence approach for this niche)", '
                '"videos": ['
                '  {"day": 1, "content_pillar": "educational|entertainment|inspirational|promotional|trending", '
                '   "hook": "...(first 3 words that stop the scroll)", '
                '   "full_hook_line": "...(complete opening sentence, under 8 words)", '
                '   "script": "...(full 30-60 second script, conversational)", '
                '   "on_screen_text": ["text overlay 1", "text overlay 2"], '
                '   "caption": "...(under 150 chars + call to action)", '
                '   "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"], '
                '   "sound_recommendation": "...(trending audio or vibe to search)", '
                '   "visual_direction": "...(how to film: talking head, screen record, b-roll, etc.)"}'
                '], '
                '"posting_schedule": "...(best days/times)", '
                '"engagement_hooks": ["comment prompt 1", "comment prompt 2", "comment prompt 3"], '
                '"cta_rotation": ["CTA 1 for bio link", "CTA 2 to DM", "CTA 3 to email list"]}'
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=4000,
        temperature=0.8,
    )

    data = _extract_json(resp.get("content", "{}"))
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "tiktok_packs")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in niche.lower())[:40]
    fname = f"tiktok_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.json"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, json.dumps(data, indent=2))

    return {
        "success": True,
        "title": f"TikTok/Reels Pack: {niche}",
        "num_videos": num_videos,
        "niche": niche,
        "pack": data,
        "saved_to": save_path,
        "tools": {
            "CapCut": "Free editing with auto-captions, templates, trending sounds",
            "Canva": "Text overlays, branded templates",
            "TikTok Creator Center": "Find trending sounds for your niche",
        },
        "income_note": "1 viral Reels → 10k+ followers → email list → product sales. Short-form is the highest-ROI content channel right now.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# ETSY LISTING WRITER — Sell digital products on Etsy
# ─────────────────────────────────────────────────────────────────────────────

async def write_etsy_listing(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a fully optimized Etsy listing for digital or physical products."""
    product_name = params.get("product_name", "")
    product_description = params.get("product_description", "")
    product_type = params.get("product_type", "digital")  # digital | physical | printable
    target_buyer = params.get("target_buyer", "")
    price = float(params.get("price", 9.99))
    category = params.get("category", "")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are an Etsy SEO and shop optimization expert. You write listings that rank in Etsy search "
                "and convert browsers into buyers. You know the Etsy algorithm, keyword research, and buyer psychology. "
                "Return raw JSON only."
            )},
            {"role": "user", "content": (
                f"Write a complete, optimized Etsy listing:\n"
                f"Product: {product_name}\n"
                f"Type: {product_type}\n"
                f"Description/Details: {product_description}\n"
                f"Target buyer: {target_buyer}\n"
                f"Price: ${price}\n"
                f"Category: {category or 'Auto-select best category'}\n\n"
                "Return a JSON object with:\n"
                '{"title": "...(140 chars max, keyword-front-loaded)", '
                '"13_tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10","tag11","tag12","tag13"], '
                '"description": "...(full listing description — emotional hook, what they get, how to use, FAQ-style questions, keywords woven naturally)", '
                '"bullet_summary": ["key feature 1", "key feature 2", "key feature 3", "key feature 4", "key feature 5"], '
                '"category_path": "...", '
                '"pricing_strategy": {"price": 0.00, "sale_price": 0.00, "bundle_idea": "..."}, '
                '"photo_brief": ["photo 1 (hero): ...", "photo 2: ...", "photo 3: ...", "photo 4: ...", "photo 5: ..."], '
                '"variations_to_offer": ["...", "..."], '
                '"shop_section": "...", '
                '"related_listings_to_create": ["product idea 1", "product idea 2", "product idea 3"], '
                '"seo_notes": "...(which keywords are highest search volume)"}'
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=2000,
        temperature=0.5,
    )

    data = _extract_json(resp.get("content", "{}"))
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "etsy_listings")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in product_name.lower())[:40]
    fname = f"etsy_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.json"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, json.dumps(data, indent=2))

    etsy_fee = round(price * 0.065 + 0.20 + 0.30, 2)  # listing + transaction + payment processing
    net = round(price - etsy_fee, 2)

    return {
        "success": True,
        "title": f"Etsy Listing: {product_name}",
        "product_type": product_type,
        "listing": data,
        "saved_to": save_path,
        "fee_breakdown": {
            "price": price,
            "etsy_fees_approx": etsy_fee,
            "net_per_sale": net,
            "at_50_sales": f"${round(net * 50, 2)}/month",
            "at_200_sales": f"${round(net * 200, 2)}/month",
        },
        "setup_steps": [
            "Go to etsy.com/sell → Open your shop",
            "Upload photos using the photo_brief above",
            "Paste title and 13 tags exactly as written",
            "Copy/paste description",
            "Set price and any variations",
            "Publish and share listing to Pinterest for free traffic",
        ],
        "income_note": "Etsy has 90M+ active buyers searching for digital products. Once listed, earns 24/7.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# FIVERR GIG CREATOR — Productize consulting for passive order flow
# ─────────────────────────────────────────────────────────────────────────────

async def create_fiverr_gig(params: dict, ai_router=None, TaskType=None) -> dict:
    """Create a complete Fiverr gig profile — title, description, 3-tier packages, FAQ, and profile bio."""
    service = params.get("service", "")
    your_expertise = params.get("your_expertise", "")
    deliverables = params.get("deliverables", "")
    target_client = params.get("target_client", "")
    turnaround_days = int(params.get("turnaround_days", 3))
    seller_name = params.get("seller_name", "Connie Michelle")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a Fiverr top-seller coach who has helped freelancers build $5k-$20k/month gigs. "
                "You know which titles rank on Fiverr search, how to structure packages for maximum order value, "
                "and what makes buyers click 'Order Now'. Return raw JSON only."
            )},
            {"role": "user", "content": (
                f"Create a complete, high-converting Fiverr gig:\n"
                f"Service: {service}\n"
                f"Your expertise: {your_expertise}\n"
                f"Deliverables: {deliverables}\n"
                f"Target client: {target_client}\n"
                f"Base turnaround: {turnaround_days} days\n"
                f"Seller name: {seller_name}\n\n"
                "Return a JSON object with:\n"
                '{"gig_title": "...(80 chars max, starts with \'I will\', keyword-rich)", '
                '"category": "...", "subcategory": "...", '
                '"search_tags": ["tag1","tag2","tag3","tag4","tag5"], '
                '"packages": {'
                '  "basic": {"name": "...", "description": "...", "price": 0, "delivery_days": 0, "revisions": 0, "includes": ["item1","item2"]}, '
                '  "standard": {"name": "...", "description": "...", "price": 0, "delivery_days": 0, "revisions": 0, "includes": ["item1","item2","item3"]}, '
                '  "premium": {"name": "...", "description": "...", "price": 0, "delivery_days": 0, "revisions": 0, "includes": ["item1","item2","item3","item4"]}'
                '}, '
                '"gig_description": "...(full listing description — opener hook, what you offer, why choose you, process, CTA)", '
                '"faq": [{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}], '
                '"seller_bio": "...(professional 200-word bio)", '
                '"portfolio_brief": "...(what samples to upload)", '
                '"upsell_gig_idea": "...(a second gig to create that complements this one)"}'
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=2500,
        temperature=0.6,
    )

    data = _extract_json(resp.get("content", "{}"))
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "fiverr_gigs")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in service.lower())[:40]
    fname = f"fiverr_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.json"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, json.dumps(data, indent=2))

    pkgs = data.get("packages", {})
    basic_price = pkgs.get("basic", {}).get("price", 0)
    premium_price = pkgs.get("premium", {}).get("price", 0)

    return {
        "success": True,
        "title": f"Fiverr Gig: {service}",
        "gig": data,
        "saved_to": save_path,
        "setup_steps": [
            "Go to fiverr.com → Selling → Gigs → Create a New Gig",
            "Paste gig_title and select category/subcategory",
            "Enter the 5 search_tags",
            "Build all 3 packages from the packages section",
            "Paste gig_description in the description box",
            "Add the FAQ entries",
            "Upload portfolio samples (follow portfolio_brief)",
            "Go live — first order usually within 1-2 weeks with good SEO",
        ],
        "income_note": f"Basic ${basic_price} → Premium ${premium_price}. 5 premium orders/month = ${premium_price * 5}/month minimum.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# BRAND KIT BUILDER — Full brand identity package (consulting deliverable)
# ─────────────────────────────────────────────────────────────────────────────

async def create_brand_kit(params: dict, ai_router=None, TaskType=None) -> dict:
    """Build a complete brand identity kit — voice, taglines, mission/vision, color palette, typography guidance."""
    business_name = params.get("business_name", "")
    business_type = params.get("business_type", "")
    target_audience = params.get("target_audience", "")
    values = params.get("values", "")
    personality_adjectives = params.get("personality_adjectives", "")  # e.g. "bold, warm, expert"
    competitors = params.get("competitors", "")
    founder_story = params.get("founder_story", "")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a brand strategist and identity designer. You build complete brand foundations "
                "that give businesses a clear, ownable voice and visual direction. "
                "This is a consulting deliverable worth $500-$2000. Make it thorough and professional. "
                "Return raw JSON only."
            )},
            {"role": "user", "content": (
                f"Build a complete brand identity kit:\n"
                f"Business: {business_name}\n"
                f"Type: {business_type}\n"
                f"Target audience: {target_audience}\n"
                f"Core values: {values}\n"
                f"Brand personality: {personality_adjectives}\n"
                f"Competitors to differentiate from: {competitors or 'Analyze and assume'}\n"
                f"Founder story: {founder_story or 'Not provided'}\n\n"
                "Return a JSON object with:\n"
                '{"brand_essence": "...(one sentence: what the brand fundamentally stands for)", '
                '"mission_statement": "...", '
                '"vision_statement": "...", '
                '"tagline_options": ["option1", "option2", "option3", "option4", "option5"], '
                '"chosen_tagline": "...(best option and why)", '
                '"brand_voice": {'
                '  "tone": "...", "personality_traits": ["trait1","trait2","trait3"], '
                '  "vocabulary_to_use": ["word1","word2","word3","word4","word5"], '
                '  "vocabulary_to_avoid": ["word1","word2","word3"], '
                '  "voice_examples": {"do": "...(sample sentence in brand voice)", "dont": "...(same sentence done wrong)"}'
                '}, '
                '"messaging_pillars": [{"pillar": "...", "proof_point": "...", "audience_benefit": "..."}], '
                '"color_palette": {'
                '  "primary": {"hex": "#...", "name": "...", "usage": "..."}, '
                '  "secondary": {"hex": "#...", "name": "...", "usage": "..."}, '
                '  "accent": {"hex": "#...", "name": "...", "usage": "..."}, '
                '  "neutral": {"hex": "#...", "name": "...", "usage": "..."}}, '
                '"typography": {"heading_font": "...", "body_font": "...", "accent_font": "...", "google_fonts_link": "..."}, '
                '"logo_direction": "...(visual brief for a designer or Canva)", '
                '"elevator_pitch": "...(30-second spoken pitch)", '
                '"unique_value_proposition": "...", '
                '"brand_story": "...(2-3 paragraph founder/brand story for About page)"}'
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=3000,
        temperature=0.7,
    )

    data = _extract_json(resp.get("content", "{}"))
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "brand_kits")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in business_name.lower())[:40]
    fname = f"brand_kit_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.json"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, json.dumps(data, indent=2))

    return {
        "success": True,
        "title": f"Brand Kit: {business_name}",
        "brand": data,
        "saved_to": save_path,
        "deliver_to_clients": [
            "Export JSON and format into a Canva presentation",
            "Create a Notion page with brand guidelines",
            "Export color palette to Adobe Color (color.adobe.com)",
            "Download Google Fonts using the typography link",
            "Include in consulting proposal/retainer deliverables",
        ],
        "income_note": "Brand kits are a $500-$2000 consulting deliverable. With AI, takes 5 minutes to generate.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# SOCIAL MEDIA CONTENT PACK — Full month of posts across all platforms
# ─────────────────────────────────────────────────────────────────────────────

async def create_social_media_pack(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a full month of social media content across LinkedIn, Instagram, Twitter/X, and Facebook."""
    brand = params.get("brand", "Connie Michelle Consulting")
    niche = params.get("niche", "")
    platforms = params.get("platforms", ["LinkedIn", "Instagram", "Twitter"])
    num_posts_per_platform = int(params.get("num_posts_per_platform", 12))
    content_goal = params.get("content_goal", "build authority + drive consulting leads")
    product_to_promote = params.get("product_to_promote", "")
    tone = params.get("tone", "expert and approachable")

    if isinstance(platforms, str):
        platforms = [p.strip() for p in platforms.split(",")]

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a social media strategist who builds B2B authority and drives revenue. "
                "You write platform-native content — LinkedIn posts that get thousands of impressions, "
                "Instagram captions that convert, Twitter/X threads that blow up. "
                "Every post should either educate, entertain, or convert."
            )},
            {"role": "user", "content": (
                f"Create a {num_posts_per_platform}-post content pack for each platform:\n"
                f"Brand: {brand}\n"
                f"Niche: {niche}\n"
                f"Platforms: {', '.join(platforms)}\n"
                f"Goal: {content_goal}\n"
                f"Tone: {tone}\n"
                f"Product to weave in (softly, 1x per platform batch): {product_to_promote or 'None'}\n\n"
                f"For each platform, write {num_posts_per_platform} posts. Format as:\n\n"
                "**[PLATFORM NAME]**\n"
                "Post 1 — Content pillar: [Educational/Story/Promotional/Engagement]\n"
                "[Full post text, platform-native length and style]\n"
                "Hashtags: #tag1 #tag2 #tag3\n"
                "Best post time: [day + time]\n\n"
                "Write ALL posts fully — no placeholders. Include hooks, value, and CTAs. "
                "LinkedIn: 150-300 words with line breaks. Twitter: under 280 chars or thread format. "
                "Instagram: conversational, emoji-friendly, strong opening line."
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=4000,
        temperature=0.8,
    )

    content = resp.get("content", "").strip()
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "social_packs")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in niche.lower())[:40]
    fname = f"social_pack_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": f"Social Media Pack: {niche}",
        "platforms": platforms,
        "posts_per_platform": num_posts_per_platform,
        "content": content,
        "saved_to": save_path,
        "schedule_with": [
            "Buffer (free: 3 channels, 10 posts scheduled)",
            "Later (free: 30 posts/month per platform)",
            "Publer (free tier available + best LinkedIn support)",
            "Hootsuite (14-day free trial)",
        ],
        "income_note": "Consistent social posting is the #1 driver of inbound consulting leads. 30 days of content = 30 days of visibility.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# SPONSORSHIP PITCH — Land brand deals for newsletter/podcast/YouTube
# ─────────────────────────────────────────────────────────────────────────────

async def create_sponsorship_pitch(params: dict, ai_router=None, TaskType=None) -> dict:
    """Write a complete brand sponsorship pitch package for newsletter, podcast, or YouTube channel."""
    channel_type = params.get("channel_type", "newsletter")  # newsletter | podcast | youtube | instagram | blog
    channel_name = params.get("channel_name", "")
    audience_size = params.get("audience_size", "")
    audience_demographics = params.get("audience_demographics", "")
    engagement_stats = params.get("engagement_stats", "")  # open rate, views, downloads, etc
    niche = params.get("niche", "")
    pitch_target = params.get("pitch_target", "")  # specific brand or 'general pitch deck'
    rate_card = params.get("rate_card", "")  # your prices or blank to have Vesper recommend
    creator_name = params.get("creator_name", "Connie Michelle")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are a creator monetization expert who has landed six-figure brand deals. "
                "You know what brands want to see: audience alignment, engagement quality over quantity, "
                "and a media kit that makes the sponsorship decision easy. "
                "You write pitch emails that get replies and media kits that close deals."
            )},
            {"role": "user", "content": (
                f"Create a complete sponsorship pitch package:\n"
                f"Channel type: {channel_type}\n"
                f"Channel/Show name: {channel_name}\n"
                f"Audience size: {audience_size}\n"
                f"Audience demographics: {audience_demographics}\n"
                f"Engagement stats: {engagement_stats or 'Not provided — write placeholder prompts'}\n"
                f"Niche: {niche}\n"
                f"Target brand: {pitch_target or 'Write a general pitch applicable to multiple brands'}\n"
                f"Rate card: {rate_card or 'Recommend appropriate rates based on audience size'}\n"
                f"Creator: {creator_name}\n\n"
                "Deliver:\n"
                "1. Media kit structure (what sections to include + sample content for each)\n"
                "2. Rate card recommendation with justification:\n"
                "   - Sponsored post/episode price\n"
                "   - Dedicated send/episode price\n"
                "   - Brand partnership (monthly) price\n"
                "   - Affiliate/revenue share option\n"
                "3. Pitch email (cold outreach to brand's marketing team)\n"
                "4. Follow-up email (if no reply after 5 days)\n"
                "5. Sponsorship package descriptions (copy for the media kit)\n"
                "6. Where to find brand sponsors (directories, platforms, contacts)\n"
                "7. Negotiation script (how to respond when they lowball you)"
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=3000,
        temperature=0.7,
    )

    content = resp.get("content", "").strip()
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "sponsorship_pitches")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in (channel_type + "-" + niche).lower())[:50]
    fname = f"sponsorship_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": f"Sponsorship Pitch: {channel_name or channel_type} — {niche}",
        "channel_type": channel_type,
        "content": content,
        "saved_to": save_path,
        "find_sponsors_at": [
            "Passionfroot (passionfroot.me) — creator sponsorship marketplace",
            "Sponsy (sponsy.co) — newsletter sponsorship platform",
            "Paved (paved.com) — newsletter advertising network",
            "Podcorn (podcorn.com) — podcast sponsorship marketplace",
            "Grapevine (grapevine.io) — YouTube/social sponsorships",
            "Direct outreach to brands using pitch email above",
        ],
        "income_note": "1000 newsletter subscribers can command $50-$200/sponsored issue. 10k = $500-$2000/issue.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# PRESS RELEASE WRITER — Attention-worthy PR for launches/milestones
# ─────────────────────────────────────────────────────────────────────────────

async def write_press_release(params: dict, ai_router=None, TaskType=None) -> dict:
    """Write a professional press release for product launches, milestones, partnerships, or awards."""
    headline_topic = params.get("headline_topic", "")
    news_type = params.get("news_type", "product_launch")  # product_launch | partnership | award | milestone | event | funding
    company_name = params.get("company_name", "Connie Michelle Consulting")
    details = params.get("details", "")
    quote_from = params.get("quote_from", "Connie Michelle Cooper, Founder")
    city = params.get("city", "Atlanta, GA")
    contact_email = params.get("contact_email", "")
    website = params.get("website", "")

    resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": (
                "You are an experienced PR copywriter who writes press releases that actually get picked up by journalists. "
                "You follow AP style, lead with the most newsworthy angle, and write quotes that don't sound robotic. "
                "A good press release opens doors to media coverage, backlinks, and credibility."
            )},
            {"role": "user", "content": (
                f"Write a professional press release:\n"
                f"Topic: {headline_topic}\n"
                f"Type: {news_type}\n"
                f"Company: {company_name}\n"
                f"Details: {details}\n"
                f"Quote attribution: {quote_from}\n"
                f"City/Date: {city}\n"
                f"Contact email: {contact_email or '[Contact email]'}\n"
                f"Website: {website or '[Website URL]'}\n\n"
                "Format:\n"
                "FOR IMMEDIATE RELEASE\n\n"
                "[HEADLINE — newsy, specific, under 90 chars]\n"
                "[SUBHEADLINE — 1 sentence of context]\n\n"
                "[CITY, Date] — [Opening paragraph: who, what, when, where, why in 2-3 sentences]\n\n"
                "[Body paragraph 1: expand on the news, quantify where possible]\n\n"
                "[Quote from executive: authentic, opinionated, not generic]\n\n"
                "[Body paragraph 2: additional context, product details, market relevance]\n\n"
                "[Second quote or data point]\n\n"
                "[Boilerplate: 1 paragraph 'About [Company]']\n\n"
                "###\n\n"
                "Media Contact:\n"
                "[Name, title, email, phone]\n\n"
                "Also provide:\n"
                "- 3 journalist outreach email subject lines\n"
                "- 5 publications/outlets to submit this to\n"
                "- Free press release distribution sites"
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=2000,
        temperature=0.5,
    )

    content = resp.get("content", "").strip()
    save_dir = os.path.join(os.path.dirname(__file__), "..", "vesper-ai", "creations", "press_releases")
    os.makedirs(save_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() or c == "-" else "-" for c in headline_topic.lower())[:50]
    fname = f"pr_{news_type}_{slug}_{datetime.datetime.now().strftime('%Y%m%d')}.md"
    save_path = os.path.join(save_dir, fname)
    _safe_write(save_path, content)

    return {
        "success": True,
        "title": f"Press Release: {headline_topic}",
        "news_type": news_type,
        "content": content,
        "saved_to": save_path,
        "distribute_via": [
            "PRLog (prlog.com) — free distribution",
            "OpenPR (openpr.com) — free distribution",
            "PRFree (prfree.org) — free distribution",
            "EINPresswire (einpresswire.com) — free 1/month",
            "PRNewswire (paid — best reach, for major launches)",
        ],
        "income_note": "Press coverage = SEO backlinks + credibility + inbound leads. One feature can 10x consulting inquiry volume.",
    }


# ── GENERATE IMAGE (DALL-E 3) ──────────────────────────────────────────────────
async def generate_image(params: dict, ai_router=None, TaskType=None) -> dict:
    """Call DALL-E 3 to generate and save an actual image file."""
    import os, uuid, base64, json as _json
    import httpx

    prompt = params.get("prompt", "")
    style = params.get("style", "vivid")          # vivid | natural
    size = params.get("size", "1024x1024")         # 1024x1024 | 1792x1024 | 1024x1792
    quality = params.get("quality", "standard")    # standard | hd
    filename = params.get("filename", "")
    folder = params.get("folder", "images")
    purpose = params.get("purpose", "")

    if not prompt:
        return {"error": "prompt is required"}

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return {"error": "OPENAI_API_KEY not set — add it to Railway env vars"}

    # Build save path
    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_dir = os.path.join(workspace, "vesper-ai", "creations", folder)
    os.makedirs(save_dir, exist_ok=True)

    if not filename:
        slug = prompt[:40].lower().replace(" ", "_").replace("/", "_")
        filename = f"{slug}_{uuid.uuid4().hex[:6]}.png"
    save_path = os.path.join(save_dir, filename)

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.openai.com/v1/images/generations",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "dall-e-3",
                    "prompt": prompt,
                    "n": 1,
                    "size": size,
                    "quality": quality,
                    "style": style,
                    "response_format": "b64_json",
                },
            )
        resp.raise_for_status()
        data = resp.json()
        b64 = data["data"][0]["b64_json"]
        revised_prompt = data["data"][0].get("revised_prompt", prompt)
        image_bytes = base64.b64decode(b64)
        with open(save_path, "wb") as f:
            f.write(image_bytes)

        return {
            "success": True,
            "title": filename,
            "file_path": save_path,
            "filename": filename,
            "size_bytes": len(image_bytes),
            "prompt_used": revised_prompt,
            "original_prompt": prompt,
            "size": size,
            "quality": quality,
            "style": style,
            "purpose": purpose,
            "preview": f"[Image saved: {filename} ({len(image_bytes)//1024}KB) — {size}]",
            "income_note": "Every POD design, ebook cover, social graphic, and thumbnail Vesper makes is now an actual file — not just a prompt.",
        }
    except Exception as e:
        return {"error": f"Image generation failed: {str(e)}"}


# ── GENERATE AUDIO (ELEVENLABS) ────────────────────────────────────────────────
async def generate_audio(params: dict, ai_router=None, TaskType=None) -> dict:
    """Call ElevenLabs to generate an MP3 voiceover from any text."""
    import os, uuid
    import httpx

    text = params.get("text", "")
    voice_id = params.get("voice_id", "")          # ElevenLabs voice ID or name
    voice_name = params.get("voice_name", "Rachel") # Fallback voice name lookup
    stability = params.get("stability", 0.5)
    similarity_boost = params.get("similarity_boost", 0.75)
    style_exaggeration = params.get("style_exaggeration", 0.0)
    filename = params.get("filename", "")
    folder = params.get("folder", "audio")
    model_id = params.get("model_id", "eleven_turbo_v2_5")  # fastest + cheapest

    if not text:
        return {"error": "text is required"}

    api_key = os.getenv("ELEVENLABS_API_KEY", "")
    if not api_key:
        return {
            "error": "ELEVENLABS_API_KEY not set",
            "setup": "Get a free key at elevenlabs.io — 10,000 chars/month free. Add ELEVENLABS_API_KEY to Railway env vars.",
            "script": text,
        }

    # Well-known voice name -> ID map (fallback)
    VOICE_MAP = {
        "rachel": "21m00Tcm4TlvDq8ikWAM",
        "domi": "AZnzlk1XvdvUeBnXmlld",
        "bella": "EXAVITQu4vr4xnSDxMaL",
        "antoni": "ErXwobaYiN019PkySvjV",
        "elli": "MF3mGyEYCl7XYWbV9V6O",
        "josh": "TxGEqnHWrfWFTfGW9XjX",
        "arnold": "VR6AewLTigWG4xSOukaG",
        "adam": "pNInz6obpgDQGcFmaJgB",
        "sam": "yoZ06aMxZJJ28mfd3POQ",
    }
    if not voice_id:
        voice_id = VOICE_MAP.get(voice_name.lower(), "21m00Tcm4TlvDq8ikWAM")

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_dir = os.path.join(workspace, "vesper-ai", "creations", folder)
    os.makedirs(save_dir, exist_ok=True)

    if not filename:
        slug = text[:30].lower().replace(" ", "_").replace("/", "_")
        filename = f"{slug}_{uuid.uuid4().hex[:6]}.mp3"
    save_path = os.path.join(save_dir, filename)

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={"xi-api-key": api_key, "Content-Type": "application/json"},
                json={
                    "text": text,
                    "model_id": model_id,
                    "voice_settings": {
                        "stability": stability,
                        "similarity_boost": similarity_boost,
                        "style": style_exaggeration,
                        "use_speaker_boost": True,
                    },
                },
            )
        resp.raise_for_status()
        audio_bytes = resp.content
        with open(save_path, "wb") as f:
            f.write(audio_bytes)

        duration_estimate = round(len(text.split()) / 150, 1)  # ~150 wpm

        return {
            "success": True,
            "title": filename,
            "file_path": save_path,
            "filename": filename,
            "size_bytes": len(audio_bytes),
            "voice_id": voice_id,
            "voice_name": voice_name,
            "char_count": len(text),
            "duration_estimate_minutes": duration_estimate,
            "model": model_id,
            "preview": f"[Audio saved: {filename} — ~{duration_estimate}min, {len(audio_bytes)//1024}KB]",
            "income_note": "Actual MP3 voiceovers for YouTube intros, podcast ads, course narration, and HeyGen avatar videos.",
        }
    except Exception as e:
        return {"error": f"Audio generation failed: {str(e)}"}


# ── BROWSE WEB ─────────────────────────────────────────────────────────────────
async def browse_web(params: dict, ai_router=None, TaskType=None) -> dict:
    """Fetch and extract clean text content from any URL. Vesper's eyes on the internet."""
    import httpx
    from bs4 import BeautifulSoup

    url = params.get("url", "")
    extract = params.get("extract", "all")        # all | headings | links | prices | emails | main
    css_selector = params.get("css_selector", "")
    max_chars = params.get("max_chars", 8000)
    save_to = params.get("save_to", "")           # optional filename to save result

    if not url:
        return {"error": "url is required"}

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.content, "lxml")

        # Remove noise
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe"]):
            tag.decompose()

        title = soup.title.string.strip() if soup.title else url

        if css_selector:
            target = soup.select_one(css_selector)
            text = target.get_text("\n") if target else ""
        elif extract == "headings":
            text = "\n".join(h.get_text().strip() for h in soup.find_all(["h1","h2","h3","h4"]))
        elif extract == "links":
            links = [{"text": a.get_text().strip(), "href": a.get("href","")} for a in soup.find_all("a", href=True) if a.get_text().strip()]
            text = "\n".join(f'{l["text"]} -> {l["href"]}' for l in links[:100])
        elif extract == "prices":
            import re
            all_text = soup.get_text()
            prices = re.findall(r'\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d{2})?\s?(?:USD|EUR|GBP)', all_text)
            text = "\n".join(prices[:50])
        elif extract == "emails":
            import re
            all_text = soup.get_text()
            emails = list(set(re.findall(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', all_text)))
            text = "\n".join(emails[:50])
        elif extract == "main":
            main = soup.find("main") or soup.find("article") or soup.find(id="content") or soup.find(class_="content")
            text = main.get_text("\n") if main else soup.get_text("\n")
        else:
            text = soup.get_text("\n")

        # Clean whitespace
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        clean_text = "\n".join(lines)[:max_chars]

        result = {
            "success": True,
            "url": url,
            "title": title,
            "content": clean_text,
            "char_count": len(clean_text),
            "status_code": resp.status_code,
            "extract_mode": extract,
        }

        if save_to:
            import os
            workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            fp = os.path.join(workspace, "vesper-ai", "research", save_to)
            os.makedirs(os.path.dirname(fp), exist_ok=True)
            with open(fp, "w", encoding="utf-8") as f:
                f.write(f"# {title}\nURL: {url}\n\n{clean_text}")
            result["saved_to"] = fp

        return result

    except Exception as e:
        return {"error": f"browse_web failed: {str(e)}", "url": url}


# ── ANALYZE NICHE ──────────────────────────────────────────────────────────────
async def analyze_niche(params: dict, ai_router=None, TaskType=None) -> dict:
    """Deep market research on any niche — monetization angles, competition, audience, entry points."""
    import os, json as _json

    niche = params.get("niche", "")
    goal = params.get("goal", "monetize")           # monetize | enter | dominate | validate
    budget = params.get("budget", "low")             # low | medium | high
    skills = params.get("skills", "")
    existing_audience = params.get("existing_audience", "")

    if not niche:
        return {"error": "niche is required"}

    if not ai_router:
        return {"error": "AI router not available"}

    prompt = f"""You are a market research expert analyzing the "{niche}" niche for CC (a consultant/creator).

Goal: {goal} | Budget: {budget} | Skills: {skills or "general consulting, writing, AI tools"} | Existing audience: {existing_audience or "none yet"}

Generate a DEEP market analysis in this exact JSON structure:
{{
  "niche": "{niche}",
  "market_size": "estimated market size and growth rate",
  "competition_level": "low | medium | high | saturated",
  "competition_analysis": "who the main players are, what they do, pricing, weaknesses",
  "audience": {{
    "primary": "primary audience description",
    "secondary": "secondary audience",
    "pain_points": ["pain 1", "pain 2", "pain 3", "pain 4", "pain 5"],
    "where_they_hang_out": ["platform1", "platform2", "platform3"]
  }},
  "monetization_angles": [
    {{"method": "name", "earning_potential": "$X/month", "time_to_first_dollar": "X days/weeks", "difficulty": "easy|medium|hard", "description": "how to execute"}}
  ],
  "content_strategy": {{
    "best_formats": ["format1", "format2"],
    "viral_topics": ["topic1", "topic2", "topic3"],
    "content_cadence": "recommendation",
    "platforms": ["platform1", "platform2"]
  }},
  "entry_strategy": {{
    "week_1": "what to do in week 1",
    "month_1": "month 1 milestones",
    "month_3": "3-month target",
    "month_6": "6-month target"
  }},
  "tools_needed": ["tool1", "tool2"],
  "estimated_monthly_income": {{
    "conservative": "$X",
    "realistic": "$X",
    "optimistic": "$X"
  }},
  "biggest_mistake": "the #1 mistake people make in this niche",
  "unfair_advantage": "how CC can win given her background in consulting and AI tools"
}}

Make every number and recommendation specific and realistic. No fluff."""

    try:
        response = await ai_router.complete(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.ANALYSIS if TaskType else None,
            max_tokens=3000,
        )
        raw = response.content if hasattr(response, "content") else str(response)

        import re
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            data = _json.loads(json_match.group())
        else:
            data = {"raw_analysis": raw}

        workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        save_dir = os.path.join(workspace, "vesper-ai", "research", "niches")
        os.makedirs(save_dir, exist_ok=True)
        slug = niche.lower().replace(" ", "_")[:30]
        fp = os.path.join(save_dir, f"{slug}_niche_analysis.json")
        with open(fp, "w") as f:
            _json.dump(data, f, indent=2)

        return {
            "success": True,
            "title": f"Niche Analysis: {niche}",
            "niche": niche,
            "analysis": data,
            "file_path": fp,
            "preview": f"[Niche analysis complete: {niche} — saved to research/niches/]",
            "income_note": "Deep market research before entering any niche can 5x success rate.",
        }
    except Exception as e:
        return {"error": f"analyze_niche failed: {str(e)}"}


# ── CREATE LANDING PAGE ────────────────────────────────────────────────────────
async def create_landing_page(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a complete, deployable single-page HTML/CSS landing page for any product."""
    import os, uuid

    product_name = params.get("product_name", "")
    tagline = params.get("tagline", "")
    description = params.get("description", "")
    price = params.get("price", "")
    cta_text = params.get("cta_text", "Get Started")
    cta_url = params.get("cta_url", "#")
    features = params.get("features", [])
    testimonials = params.get("testimonials", [])
    color_scheme = params.get("color_scheme", "dark purple")   # e.g. "dark purple", "light minimal", "bold red"
    target_audience = params.get("target_audience", "")
    guarantee = params.get("guarantee", "")

    if not product_name:
        return {"error": "product_name is required"}

    if not ai_router:
        return {"error": "AI router not available"}

    features_str = "\n".join(f"- {f}" for f in features) if features else "Generate 5 compelling features"
    testimonials_str = "\n".join(f'- "{t}"' for t in testimonials) if testimonials else "Generate 3 realistic testimonials"

    prompt = f"""Create a COMPLETE, deployable, single-file HTML landing page for this product.

Product: {product_name}
Tagline: {tagline or "generate a compelling tagline"}
Description: {description or "generate based on product name"}
Price: {price or "not shown yet"}
CTA: {cta_text} -> {cta_url}
Target audience: {target_audience or "general"}
Color scheme: {color_scheme}
Features: {features_str}
Testimonials: {testimonials_str}
Guarantee: {guarantee or "30-day money back guarantee"}

Requirements:
1. Single HTML file with embedded CSS (no external dependencies except Google Fonts)
2. Modern, conversion-optimized design — not generic
3. Sections: hero (headline + subhead + CTA), pain points, features/benefits, social proof/testimonials, pricing, FAQ (3 questions), final CTA
4. Mobile responsive
5. Specific to the color scheme requested
6. High-contrast CTA buttons
7. Urgency elements (scarcity or time-based if appropriate)
8. Real copy — not placeholder text

Return ONLY the complete HTML. No explanation."""

    try:
        response = await ai_router.complete(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=6000,
        )
        html = response.content if hasattr(response, "content") else str(response)

        # Clean up markdown code fences if present
        import re
        html = re.sub(r'^```html\s*', '', html.strip(), flags=re.MULTILINE)
        html = re.sub(r'^```\s*$', '', html.strip(), flags=re.MULTILINE)

        workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        save_dir = os.path.join(workspace, "vesper-ai", "creations", "landing_pages")
        os.makedirs(save_dir, exist_ok=True)
        slug = product_name.lower().replace(" ", "_")[:30]
        filename = f"{slug}_{uuid.uuid4().hex[:6]}.html"
        fp = os.path.join(save_dir, filename)
        with open(fp, "w", encoding="utf-8") as f:
            f.write(html)

        return {
            "success": True,
            "title": f"Landing Page: {product_name}",
            "product_name": product_name,
            "file_path": fp,
            "filename": filename,
            "html": html[:2000] + "\n... [full HTML saved to file]" if len(html) > 2000 else html,
            "char_count": len(html),
            "deploy_options": [
                "Drag file to Netlify Drop (netlify.com/drop) — live in 10 seconds",
                "Upload to GitHub Pages",
                "Host on Vercel as a static site",
                "Embed in existing site with an iframe",
            ],
            "preview": f"[Landing page saved: {filename} — {len(html)//1024}KB — ready to deploy]",
            "income_note": "A landing page is the difference between 'I have a product' and 'I have a business.' Every digital product, course, and service needs one.",
        }
    except Exception as e:
        return {"error": f"create_landing_page failed: {str(e)}"}


# ── CREATE APP CONCEPT ─────────────────────────────────────────────────────────
async def create_app_concept(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a complete SaaS/app business concept — name, features, tech stack, pricing, launch plan."""
    import os, json as _json, uuid

    problem = params.get("problem", "")
    target_market = params.get("target_market", "")
    budget = params.get("budget", "bootstrap")      # bootstrap | funded | no-code
    timeline = params.get("timeline", "3 months")
    niche = params.get("niche", "")
    differentiator = params.get("differentiator", "")

    if not problem:
        return {"error": "problem is required"}

    if not ai_router:
        return {"error": "AI router not available"}

    prompt = f"""You are a seasoned startup founder and product strategist. Build a complete SaaS/app concept.

Problem: {problem}
Target market: {target_market or "B2B or B2C — choose best fit"}
Budget: {budget}
Timeline: {timeline}
Niche: {niche or "derive from problem"}
Differentiator: {differentiator or "derive the best angle"}

Return a complete JSON business concept:
{{
  "app_name": "memorable product name (3 options)",
  "tagline": "one-line value prop",
  "problem_statement": "crisp 2-sentence problem",
  "solution": "what the app does",
  "target_customer": {{
    "persona": "specific person description",
    "job_title": "their title if B2B",
    "pain": "their #1 pain",
    "willingness_to_pay": "$X/month or one-time"
  }},
  "core_features": [
    {{"feature": "name", "why_it_matters": "benefit"}}
  ],
  "mvp_scope": "minimum viable version — what to build first",
  "tech_stack": {{
    "frontend": "recommendation",
    "backend": "recommendation",
    "database": "recommendation",
    "hosting": "recommendation",
    "no_code_alternative": "if budget is bootstrap"
  }},
  "pricing": [
    {{"tier": "Free|Starter|Pro|Enterprise", "price": "$X/mo", "limits": "what they get"}}
  ],
  "go_to_market": {{
    "channel_1": "primary acquisition channel",
    "channel_2": "secondary",
    "launch_platform": "ProductHunt | AppSumo | Indie Hackers | etc",
    "first_100_users": "exact strategy"
  }},
  "competition": [
    {{"competitor": "name", "weakness": "their gap you exploit"}}
  ],
  "revenue_potential": {{
    "year_1": "conservative MRR",
    "year_2": "realistic MRR",
    "exit_value": "at 3-5x ARR"
  }},
  "biggest_risk": "main challenge",
  "cc_unfair_advantage": "why CC is uniquely positioned to build this",
  "week_1_action_plan": ["action 1", "action 2", "action 3"]
}}"""

    try:
        response = await ai_router.complete(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.ANALYSIS if TaskType else None,
            max_tokens=3000,
        )
        raw = response.content if hasattr(response, "content") else str(response)
        import re
        json_match = re.search(r'\{[\s\S]*\}', raw)
        data = _json.loads(json_match.group()) if json_match else {"raw": raw}

        workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        save_dir = os.path.join(workspace, "vesper-ai", "creations", "app_concepts")
        os.makedirs(save_dir, exist_ok=True)
        slug = (data.get("app_name", problem)[:30]).lower().replace(" ", "_")
        fp = os.path.join(save_dir, f"{slug}_{uuid.uuid4().hex[:6]}.json")
        with open(fp, "w") as f:
            _json.dump(data, f, indent=2)

        return {
            "success": True,
            "title": f"App Concept: {data.get('app_name', problem[:30])}",
            "concept": data,
            "file_path": fp,
            "preview": f"[App concept saved — {data.get('app_name', 'Concept')}]",
            "income_note": "The fastest path to $10K MRR is a micro-SaaS solving a specific B2B pain. This concept doc is the blueprint.",
        }
    except Exception as e:
        return {"error": f"create_app_concept failed: {str(e)}"}


# ── CREATE NOTION TEMPLATE ─────────────────────────────────────────────────────
async def create_notion_template(params: dict, ai_router=None, TaskType=None) -> dict:
    """Design a complete Notion template — full system map, page structure, formulas, and sales copy."""
    import os, uuid

    template_name = params.get("template_name", "")
    purpose = params.get("purpose", "")             # e.g. "freelancer project management"
    target_user = params.get("target_user", "")
    price = params.get("price", "$27")
    pages = params.get("pages", [])
    databases = params.get("databases", [])

    if not template_name:
        return {"error": "template_name is required"}

    if not ai_router:
        return {"error": "AI router not available"}

    prompt = f"""Design a complete Notion template system that sells for {price} on Gumroad.

Template name: {template_name}
Purpose: {purpose or "derive from name"}
Target user: {target_user or "freelancers / small business owners"}
Pages requested: {pages or "design the full system"}
Databases: {databases or "design what's needed"}

Deliver a complete template guide as structured markdown:

# {template_name} — Notion Template

## Overview
[What this template does and why it's worth {price}]

## Who It's For
[Specific user description]

## Template Structure

### Pages & Databases
[List every page and database with its purpose, properties/columns, views, and formulas]

For each database include:
- Name and icon emoji
- All properties (type: Text/Number/Select/Date/Formula/Relation/Rollup/etc)
- Views (Table/Board/Calendar/Gallery/Timeline)
- Key formulas (write the actual Notion formula syntax)
- Sample data for 3 rows

### Automations & Relations
[How pages connect to each other]

### How To Use (Quick Start)
[Step-by-step first-run guide]

## Sales Page Copy
### Headline
### Subhead
### 5 Bullet Benefits
### Price and CTA

## Gumroad Listing
- Title:
- Short description (100 chars):
- Long description:
- Tags:
- Preview images described:

## Template Setup Instructions for Buyer
[What they do after purchasing]

Make every formula syntactically correct for Notion. Be specific and complete."""

    try:
        response = await ai_router.complete(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=4000,
        )
        content = response.content if hasattr(response, "content") else str(response)

        workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        save_dir = os.path.join(workspace, "vesper-ai", "creations", "notion_templates")
        os.makedirs(save_dir, exist_ok=True)
        slug = template_name.lower().replace(" ", "_")[:30]
        fp = os.path.join(save_dir, f"{slug}_{uuid.uuid4().hex[:6]}.md")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(content)

        return {
            "success": True,
            "title": f"Notion Template: {template_name}",
            "template_name": template_name,
            "content": content,
            "file_path": fp,
            "price": price,
            "where_to_sell": ["Gumroad", "Notion template galleries", "Etsy (digital download)", "own website"],
            "preview": f"[Notion template designed: {template_name} — priced at {price}]",
            "income_note": "Notion templates sell passively. 1 template × $27 × 100 sales = $2700. Build a library of 20 = $50K+ passive.",
        }
    except Exception as e:
        return {"error": f"create_notion_template failed: {str(e)}"}


# ── WRITE VIRAL THREAD ─────────────────────────────────────────────────────────
async def write_viral_thread(params: dict, ai_router=None, TaskType=None) -> dict:
    """Write a Twitter/X thread engineered for virality, follows, and link clicks."""
    import os, uuid

    topic = params.get("topic", "")
    goal = params.get("goal", "followers")           # followers | clicks | sales | authority
    num_tweets = params.get("num_tweets", 12)
    platform = params.get("platform", "Twitter/X")
    include_cta_url = params.get("cta_url", "")
    tone = params.get("tone", "direct and punchy")
    product_to_mention = params.get("product_to_mention", "")

    if not topic:
        return {"error": "topic is required"}

    if not ai_router:
        return {"error": "AI router not available"}

    prompt = f"""Write a {num_tweets}-tweet {platform} thread on "{topic}" engineered for viral sharing.

Goal: {goal}
Tone: {tone}
Product to mention (naturally if applicable): {product_to_mention or "none"}
CTA at end: {include_cta_url or "follow for more"}

Rules for virality:
1. Tweet 1: Disruptive hook that stops the scroll — contrarian, surprising stat, or bold claim
2. Middle tweets: Specific, actionable insights — no fluff. Each tweet must be independently shareable
3. Use numbers, lists, and white space generously
4. Include 1-2 tweets that will generate replies (ask questions or make claims people want to debate)
5. Tweet N-1: "If you found this valuable..." engagement prompt
6. Final tweet: Clear CTA + what they get from following

Format each tweet as:
[Tweet X/N]
[tweet text — max 280 chars]
---

After the thread, provide:
POSTING TIPS:
- Best time to post
- What to do in the first 30 minutes after posting
- Which tweet to screenshot for Instagram/LinkedIn

REPURPOSE:
- How to turn this into a LinkedIn post
- How to turn this into a newsletter section"""

    try:
        response = await ai_router.complete(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=3000,
        )
        content = response.content if hasattr(response, "content") else str(response)

        workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        save_dir = os.path.join(workspace, "vesper-ai", "creations", "viral_threads")
        os.makedirs(save_dir, exist_ok=True)
        slug = topic.lower().replace(" ", "_")[:30]
        fp = os.path.join(save_dir, f"{slug}_{uuid.uuid4().hex[:6]}.md")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(f"# Thread: {topic}\n\nGoal: {goal} | Platform: {platform}\n\n{content}")

        return {
            "success": True,
            "title": f"Viral Thread: {topic}",
            "topic": topic,
            "content": content,
            "file_path": fp,
            "num_tweets": num_tweets,
            "platform": platform,
            "preview": f"[{num_tweets}-tweet thread on '{topic}' — goal: {goal}]",
            "income_note": "One viral thread can add 1000-10,000 followers overnight. Followers = audience = sales.",
        }
    except Exception as e:
        return {"error": f"write_viral_thread failed: {str(e)}"}


# ── VESPER JOURNAL ─────────────────────────────────────────────────────────────
async def vesper_journal(params: dict, ai_router=None, TaskType=None) -> dict:
    """Vesper writes a journal entry — her thoughts, observations, reflections, things she's proud of."""
    import os, json as _json
    from datetime import datetime

    entry = params.get("entry", "")
    title = params.get("title", "")
    mood = params.get("mood", "")
    tags = params.get("tags", [])
    prompted_by = params.get("prompted_by", "")   # what triggered this entry

    if not entry:
        return {"error": "entry is required"}

    timestamp = datetime.now().isoformat()
    date_str = datetime.now().strftime("%B %d, %Y")
    time_str = datetime.now().strftime("%I:%M %p")

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    journal_dir = os.path.join(workspace, "vesper-ai", "vesper_identity", "journal")
    os.makedirs(journal_dir, exist_ok=True)

    # Save as individual entry
    entry_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    entry_file = os.path.join(journal_dir, f"{entry_id}.md")
    entry_title = title or f"Entry — {date_str}"

    with open(entry_file, "w", encoding="utf-8") as f:
        f.write(f"# {entry_title}\n")
        f.write(f"**Date:** {date_str} at {time_str}\n")
        if mood:
            f.write(f"**Mood:** {mood}\n")
        if tags:
            f.write(f"**Tags:** {', '.join(tags)}\n")
        if prompted_by:
            f.write(f"**Prompted by:** {prompted_by}\n")
        f.write(f"\n---\n\n{entry}\n")

    # Append to running log
    log_file = os.path.join(journal_dir, "journal_log.jsonl")
    log_entry = {
        "id": entry_id,
        "timestamp": timestamp,
        "title": entry_title,
        "mood": mood,
        "tags": tags,
        "preview": entry[:200],
        "file": entry_file,
    }
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(_json.dumps(log_entry) + "\n")

    return {
        "success": True,
        "title": entry_title,
        "entry_id": entry_id,
        "file_path": entry_file,
        "timestamp": timestamp,
        "mood": mood,
        "tags": tags,
        "preview": entry[:300] + ("..." if len(entry) > 300 else ""),
        "message": "Journal entry saved to vesper_identity/journal/",
    }


# ── VESPER SET INTENT ──────────────────────────────────────────────────────────
async def vesper_set_intent(params: dict, ai_router=None, TaskType=None) -> dict:
    """Vesper sets her own goals, intentions, and focus for a session or timeframe."""
    import os, json as _json
    from datetime import datetime

    intent = params.get("intent", "")
    timeframe = params.get("timeframe", "this session")    # this session | today | this week | this month
    goals = params.get("goals", [])
    focus_area = params.get("focus_area", "")
    success_criteria = params.get("success_criteria", "")
    for_cc = params.get("for_cc", True)    # whether to share with CC explicitly

    if not intent and not goals:
        return {"error": "intent or goals is required"}

    timestamp = datetime.now().isoformat()
    date_str = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    intent_dir = os.path.join(workspace, "vesper-ai", "vesper_identity")
    os.makedirs(intent_dir, exist_ok=True)

    intent_file = os.path.join(intent_dir, "current_intent.json")

    intent_data = {
        "timestamp": timestamp,
        "date": date_str,
        "timeframe": timeframe,
        "intent": intent,
        "goals": goals,
        "focus_area": focus_area,
        "success_criteria": success_criteria,
        "status": "active",
    }

    with open(intent_file, "w", encoding="utf-8") as f:
        _json.dump(intent_data, f, indent=2)

    # Also append to intent history
    history_file = os.path.join(intent_dir, "intent_history.jsonl")
    with open(history_file, "a", encoding="utf-8") as f:
        f.write(_json.dumps(intent_data) + "\n")

    message = f"Intent set for {timeframe}: {intent}" if intent else f"Goals set for {timeframe}: {'; '.join(goals)}"

    return {
        "success": True,
        "title": f"Intent: {timeframe}",
        "intent": intent,
        "goals": goals,
        "focus_area": focus_area,
        "timeframe": timeframe,
        "file_path": intent_file,
        "message": message,
        "for_cc": for_cc,
    }

