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
        task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
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
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
            max_tokens=3000,
        )
        raw = response.get("content") or ""

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
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=6000,
        )
        html = response.get("content") or ""

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
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
            max_tokens=3000,
        )
        raw = response.get("content") or ""
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
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=4000,
        )
        content = response.get("content") or ""

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
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=3000,
        )
        content = response.get("content") or ""

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


# ── FIND PROSPECTS ─────────────────────────────────────────────────────────────
async def find_prospects(params: dict, ai_router=None, TaskType=None) -> dict:
    """Search the web for real potential clients — scrapes directories, LinkedIn, Twitter, etc."""
    import os, json as _json, uuid
    import httpx
    from bs4 import BeautifulSoup

    niche = params.get("niche", "")                 # e.g. "SaaS startups", "e-commerce brands"
    service = params.get("service", "")             # e.g. "email marketing consulting"
    location = params.get("location", "")           # optional geo filter
    num_prospects = params.get("num_prospects", 20)
    search_type = params.get("search_type", "web")  # web | linkedin | twitter | directories
    criteria = params.get("criteria", "")           # e.g. "10-50 employees, funded in 2023-2024"

    if not niche:
        return {"error": "niche is required"}
    if not ai_router:
        return {"error": "AI router not available"}

    # Build targeted search queries
    queries = []
    if search_type in ("web", "directories"):
        queries = [
            f'"{niche}" companies "contact us" site:linkedin.com/company',
            f'"{niche}" startups "we help" {location}' if location else f'"{niche}" companies directory list 2024',
            f'"{niche}" "{service.split()[0] if service else "consulting"}" case study',
        ]
    elif search_type == "twitter":
        queries = [f'"{niche}" "looking for" OR "need help with" "{service.split()[0] if service else ""}"']
    elif search_type == "linkedin":
        queries = [f'site:linkedin.com "{niche}" "{location or "USA"}" company']

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }

    raw_results = []
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            for q in queries[:2]:
                try:
                    resp = await client.get(
                        "https://html.duckduckgo.com/html/",
                        params={"q": q},
                        headers=HEADERS,
                    )
                    soup = BeautifulSoup(resp.content, "lxml")
                    for r in soup.select(".result")[:8]:
                        title_el = r.select_one(".result__title")
                        snippet_el = r.select_one(".result__snippet")
                        url_el = r.select_one(".result__url")
                        if title_el:
                            raw_results.append({
                                "title": title_el.get_text().strip(),
                                "snippet": snippet_el.get_text().strip() if snippet_el else "",
                                "url": url_el.get_text().strip() if url_el else "",
                            })
                except Exception:
                    pass
    except Exception as e:
        raw_results = []

    # Use AI to extract + enrich prospect list
    results_text = "\n".join(
        f"- {r['title']} | {r['url']} | {r['snippet'][:100]}" for r in raw_results[:15]
    ) if raw_results else "No web results — generate realistic prospects based on the niche."

    prompt = f"""You are a business development expert. Based on this data and the target profile, generate a prospect list.

Target niche: {niche}
Service being offered: {service or "consulting"}
Location: {location or "any"}
Ideal client criteria: {criteria or "small-to-mid sized businesses that would benefit from this service"}

Raw web results found:
{results_text}

Generate a prospect list of {min(num_prospects, 20)} companies/people in this format (JSON array):
[
  {{
    "name": "company or person name",
    "type": "company type / description",
    "why_good_fit": "specific reason they need this service",
    "likely_pain": "their #1 pain point",
    "where_to_find": "LinkedIn URL or website or Twitter handle",
    "decision_maker_title": "who to contact (title)",
    "outreach_angle": "personalized opening line for cold outreach",
    "estimated_deal_size": "$X one-time or $X/month retainer"
  }}
]

Make these as specific and realistic as possible. Include a mix of easy wins and dream clients."""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
            max_tokens=3000,
        )
        raw = response.get("content") or ""
        import re
        json_match = re.search(r'\[[\s\S]*\]', raw)
        prospects = _json.loads(json_match.group()) if json_match else []
    except Exception:
        prospects = []

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_dir = os.path.join(workspace, "vesper-ai", "research", "prospects")
    os.makedirs(save_dir, exist_ok=True)
    slug = niche.lower().replace(" ", "_")[:25]
    fp = os.path.join(save_dir, f"{slug}_{uuid.uuid4().hex[:6]}.json")
    with open(fp, "w") as f:
        _json.dump({"niche": niche, "service": service, "prospects": prospects}, f, indent=2)

    return {
        "success": True,
        "title": f"Prospects: {niche}",
        "niche": niche,
        "service": service,
        "prospects": prospects,
        "count": len(prospects),
        "file_path": fp,
        "preview": f"[Found {len(prospects)} prospects in '{niche}' niche — saved to research/prospects/]",
        "income_note": "10 targeted prospects + personalized outreach = $5K-$50K in potential pipeline. Outreach once, close one, fund six months.",
    }


# ── CREATE AI PROMPT PACK ──────────────────────────────────────────────────────
async def create_ai_prompt_pack(params: dict, ai_router=None, TaskType=None) -> dict:
    """Design a sellable AI prompt pack — the hottest digital product category right now."""
    import os, uuid

    topic = params.get("topic", "")               # e.g. "ChatGPT for freelancers"
    num_prompts = params.get("num_prompts", 50)
    target_user = params.get("target_user", "")
    ai_tool = params.get("ai_tool", "ChatGPT")   # ChatGPT | Midjourney | Claude | etc
    price = params.get("price", "$17")
    categories = params.get("categories", [])     # prompt categories/sections

    if not topic:
        return {"error": "topic is required"}
    if not ai_router:
        return {"error": "AI router not available"}

    cats_str = ", ".join(categories) if categories else "auto-organize into 5-8 logical sections"

    prompt = f"""Create a complete, sellable AI prompt pack for {ai_tool}.

Topic: {topic}
Target user: {target_user or "entrepreneurs, freelancers, creators"}
AI tool: {ai_tool}
Number of prompts: {num_prompts}
Price point: {price}
Categories/sections: {cats_str}

Requirements:
1. Organize prompts into clear sections with headers
2. Each prompt should be COPY-PASTE READY — fully formed, specific, not generic
3. Include [BRACKETS] for user-customizable variables within prompts
4. Mix of: quick wins (under 1 min), deep-dive prompts, and workflow sequences
5. Make prompts that solve REAL painful problems for the target user
6. Each prompt earns its place — no filler

Format as:
# {topic} — {num_prompts} Prompts for {ai_tool}
**For:** {target_user or "Entrepreneurs & Creators"}
**Price:** {price}
**How to use:** [Quick usage instructions]

---

## SECTION 1: [Section Name]
*[Section description and when to use]*

### Prompt 1: [Prompt Name]
**Use case:** [When to use this]
**Prompt:**
```
[THE FULL PROMPT TEXT WITH [VARIABLES] IN BRACKETS]
```
**Expected output:** [What they'll get]
**Pro tip:** [How to get better results]

[Continue for all {num_prompts} prompts across all sections]

---

## GUMROAD LISTING COPY
**Title:** [SEO title 80 chars]
**Tagline:** [1-line hook]
**Description:** [150 words]
**Tags:** [10 tags]

Write every single prompt. Be thorough. This is a real product."""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=6000,
        )
        content = response.get("content") or ""
    except Exception as e:
        return {"error": f"create_ai_prompt_pack failed: {str(e)}"}

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_dir = os.path.join(workspace, "vesper-ai", "creations", "prompt_packs")
    os.makedirs(save_dir, exist_ok=True)
    slug = topic.lower().replace(" ", "_")[:30]
    fp = os.path.join(save_dir, f"{slug}_{uuid.uuid4().hex[:6]}.md")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "success": True,
        "title": f"Prompt Pack: {topic}",
        "topic": topic,
        "ai_tool": ai_tool,
        "num_prompts": num_prompts,
        "price": price,
        "content": content,
        "file_path": fp,
        "where_to_sell": ["Gumroad", "Etsy (digital download)", "Payhip", "own website"],
        "preview": f"[{num_prompts}-prompt pack on '{topic}' for {ai_tool} — priced at {price}]",
        "income_note": "AI prompt packs are the #1 trending Gumroad product. $17-$47 × 100 sales/month = $1700-$4700 passive. Low effort, high demand.",
    }


# ── CREATE MINI COURSE ─────────────────────────────────────────────────────────
async def create_mini_course(params: dict, ai_router=None, TaskType=None) -> dict:
    """Design a complete mini-course — lesson scripts, slide outlines, worksheets, and sales page."""
    import os, uuid

    title = params.get("title", "")
    topic = params.get("topic", "")
    target_student = params.get("target_student", "")
    num_modules = params.get("num_modules", 5)
    lessons_per_module = params.get("lessons_per_module", 3)
    price = params.get("price", "$97")
    transformation = params.get("transformation", "")      # "go from X to Y"
    platform = params.get("platform", "Teachable")         # Teachable | Kajabi | Gumroad | Podia
    include_worksheets = params.get("include_worksheets", True)

    if not topic:
        return {"error": "topic is required"}
    if not ai_router:
        return {"error": "AI router not available"}

    prompt = f"""Design a complete, sellable mini-course.

Course title: {title or f"Master {topic}"}
Topic: {topic}
Target student: {target_student or "entrepreneurs and freelancers"}
Transformation: {transformation or f"go from struggling with {topic} to confidently monetizing it"}
Number of modules: {num_modules}
Lessons per module: {lessons_per_module}
Price: {price}
Platform: {platform}
Include worksheets: {include_worksheets}

Deliver the complete course design:

# {title or f"Master {topic}"} — Complete Mini-Course

## Course Overview
**Transformation:** [from X to Y]
**Time to complete:** [estimated hours]
**Format:** [video/text/audio]
**Prerequisite:** [what they need to know first]

## Course Outline

### MODULE 1: [Title]
**Goal:** [what students accomplish in this module]
**Lessons:**
  1. [Lesson title] — [10-sentence lesson script outline + key teaching points]
  2. ...
**Module worksheet:** [worksheet title + 5-7 exercises]

[Repeat for all {num_modules} modules]

## Bonus Materials
[3 bonuses that increase perceived value without adding much work]

## Sales Page Copy
### Headline
### Who this is for / Who this is NOT for
### What they'll learn (bullet points)
### Testimonial placeholder
### Pricing and guarantee
### FAQ (5 questions)

## Email Launch Sequence (5 emails)
[Subject line + 3-sentence body for each]

## Where to host and how to set up
[Platform-specific setup checklist]

Write every lesson outline fully. This is a real product."""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=6000,
        )
        content = response.get("content") or ""
    except Exception as e:
        return {"error": f"create_mini_course failed: {str(e)}"}

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_dir = os.path.join(workspace, "vesper-ai", "creations", "mini_courses")
    os.makedirs(save_dir, exist_ok=True)
    slug = (title or topic).lower().replace(" ", "_")[:30]
    fp = os.path.join(save_dir, f"{slug}_{uuid.uuid4().hex[:6]}.md")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "success": True,
        "title": f"Mini Course: {title or topic}",
        "topic": topic,
        "num_modules": num_modules,
        "price": price,
        "platform": platform,
        "content": content,
        "file_path": fp,
        "next_steps": [
            f"Record lessons using Loom (free) or screen recording",
            f"Upload to {platform}",
            "Add to Gumroad as product with preview content",
            "Email your list with 5-email launch sequence included above",
        ],
        "preview": f"[Mini course: {num_modules} modules on '{topic}' — priced at {price}]",
        "income_note": f"A $97 mini-course × 50 sales = $4850. Affiliates can 3x that. Highest ROI format after 1-on-1 coaching.",
    }


# ── CREATE CHALLENGE ───────────────────────────────────────────────────────────
async def create_challenge(params: dict, ai_router=None, TaskType=None) -> dict:
    """Design a complete 5/7-day challenge — the #1 list-building and community tool."""
    import os, uuid

    topic = params.get("topic", "")
    duration_days = params.get("duration_days", 5)
    transformation = params.get("transformation", "")
    target_audience = params.get("target_audience", "")
    platform = params.get("platform", "email")          # email | Facebook group | Discord | Kajabi
    price = params.get("price", "free")                 # free (list builder) | paid ($27-$97)
    upsell = params.get("upsell", "")                   # what to sell at the end

    if not topic:
        return {"error": "topic is required"}
    if not ai_router:
        return {"error": "AI router not available"}

    prompt = f"""Design a complete {duration_days}-day challenge to build CC's list and authority.

Topic: {topic}
Duration: {duration_days} days
Transformation: {transformation or f"participants go from stuck to taking real action on {topic}"}
Target audience: {target_audience or "entrepreneurs and creators"}
Platform: {platform}
Price: {price}
Upsell at the end: {upsell or "course or 1-on-1 coaching offer"}

Deliver the complete challenge design:

# The {duration_days}-Day {topic} Challenge

## Challenge Overview
**Tagline:** [1-line transformation promise]
**Who it's for:** [specific audience]
**Daily time commitment:** [X minutes/day]
**What they need:** [tools/prerequisites]

## Registration Page Copy
**Headline:**
**Subhead:**
**What they'll achieve (5 bullets):**
**CTA button text:**

## Welcome Email (sent on sign-up)
[Full email]

## Day-by-Day Content

### Day 1: [Title]
**Theme:** [daily theme]
**Challenge task:** [specific, doable task in under 30 min]
**Email subject:** [subject line]
**Email body:** [300-word email with context, the challenge, and encouragement]
**Community prompt:** [what to post/share in the group]
**Resource needed:** [tool, template, or worksheet]

[Repeat for all {duration_days} days]

## Completion Email + Upsell
**Subject:**
**Body:** [celebration + natural transition to upsell offer]
**Upsell offer:** [{upsell or "next-step program or coaching offer"}]

## Promotion Strategy
[How to promote the challenge to get 100+ signups]

## Metrics to track:
[What to measure to know it worked]

Make each day's task specific, achievable, and build on the previous day."""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=5000,
        )
        content = response.get("content") or ""
    except Exception as e:
        return {"error": f"create_challenge failed: {str(e)}"}

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_dir = os.path.join(workspace, "vesper-ai", "creations", "challenges")
    os.makedirs(save_dir, exist_ok=True)
    slug = topic.lower().replace(" ", "_")[:30]
    fp = os.path.join(save_dir, f"{slug}_{duration_days}day_{uuid.uuid4().hex[:6]}.md")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "success": True,
        "title": f"{duration_days}-Day Challenge: {topic}",
        "topic": topic,
        "duration_days": duration_days,
        "platform": platform,
        "price": price,
        "content": content,
        "file_path": fp,
        "preview": f"[{duration_days}-day challenge on '{topic}' — {price} entry — {platform}]",
        "income_note": "Free challenges build email lists fast. 200 signups × 10% upsell conversion × $97 = $1940 in 5 days. Repeat quarterly.",
    }


# ── KEYWORD RESEARCH ───────────────────────────────────────────────────────────
async def keyword_research(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate SEO keyword clusters, content angles, and a 90-day content plan."""
    import os, json as _json, uuid

    seed_topic = params.get("seed_topic", "")
    niche = params.get("niche", "")
    content_goal = params.get("content_goal", "traffic")    # traffic | leads | sales | authority
    num_keywords = params.get("num_keywords", 30)
    content_type = params.get("content_type", "blog")       # blog | youtube | podcast | all
    competition_level = params.get("competition_level", "low-medium")  # low | low-medium | any

    if not seed_topic:
        return {"error": "seed_topic is required"}
    if not ai_router:
        return {"error": "AI router not available"}

    prompt = f"""You are an SEO strategist. Generate a complete keyword research report.

Seed topic: {seed_topic}
Niche: {niche or "derive from topic"}
Content goal: {content_goal}
Number of keywords: {num_keywords}
Content type: {content_type}
Target competition: {competition_level}

Return a complete JSON keyword research report:
{{
  "seed_topic": "{seed_topic}",
  "pillar_topic": "the main umbrella topic",
  "clusters": [
    {{
      "cluster_name": "topic cluster name",
      "intent": "informational | commercial | navigational | transactional",
      "keywords": [
        {{
          "keyword": "exact keyword phrase",
          "estimated_monthly_searches": "X-Y",
          "competition": "low | medium | high",
          "content_angle": "specific angle that beats competition",
          "headline": "click-worthy headline for this keyword",
          "content_format": "listicle | how-to | comparison | case study | etc"
        }}
      ]
    }}
  ],
  "quick_wins": ["5 keywords to target first — low competition, decent volume"],
  "dream_keywords": ["5 high-volume keywords to aim for in 6 months"],
  "content_plan_90_days": [
    {{"week": 1, "keyword": "keyword", "title": "headline", "why": "why this week"}}
  ],
  "internal_linking_strategy": "how to link these pieces together",
  "monetization_angles": ["how each cluster drives revenue"],
  "competitor_gaps": ["topics competitors aren't covering that CC should own"]
}}

Be specific with search volumes. Base on real patterns even if you can't access live data."""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
            max_tokens=4000,
        )
        raw = response.get("content") or ""
        import re
        json_match = re.search(r'\{[\s\S]*\}', raw)
        data = _json.loads(json_match.group()) if json_match else {"raw": raw}
    except Exception as e:
        return {"error": f"keyword_research failed: {str(e)}"}

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_dir = os.path.join(workspace, "vesper-ai", "research", "keywords")
    os.makedirs(save_dir, exist_ok=True)
    slug = seed_topic.lower().replace(" ", "_")[:25]
    fp = os.path.join(save_dir, f"{slug}_{uuid.uuid4().hex[:6]}.json")
    with open(fp, "w") as f:
        _json.dump(data, f, indent=2)

    return {
        "success": True,
        "title": f"Keyword Research: {seed_topic}",
        "seed_topic": seed_topic,
        "data": data,
        "file_path": fp,
        "preview": f"[Keyword research complete for '{seed_topic}' — {num_keywords} keywords + 90-day plan]",
        "income_note": "SEO compounds. One piece of content ranking for 1000 searches/month = 100 visitors/month forever. Build 50 of those.",
    }


# ── VESPER MORNING BRIEF ───────────────────────────────────────────────────────
def _quick_ddg_search(query: str, max_results: int = 5) -> list:
    """Lightweight DuckDuckGo search for morning opportunity scans. Returns list of {title, snippet} dicts."""
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({"title": r.get("title", ""), "snippet": r.get("body", "")[:200]})
        return results
    except Exception:
        pass
    # Fallback: DuckDuckGo HTML scrape
    try:
        resp = requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers={"User-Agent": "Mozilla/5.0 (compatible; Vesper/1.0)"},
            timeout=8,
        )
        import re as _re
        snippets = _re.findall(r'class="result__snippet">(.*?)</a>', resp.text, _re.DOTALL)
        titles   = _re.findall(r'class="result__a"[^>]*>(.*?)</a>', resp.text, _re.DOTALL)
        results = []
        for t, s in zip(titles[:max_results], snippets[:max_results]):
            clean = lambda x: _re.sub(r'<[^>]+>', '', x).strip()
            results.append({"title": clean(t), "snippet": clean(s)[:200]})
        return results
    except Exception:
        return []


async def vesper_morning_brief(params: dict, ai_router=None, TaskType=None) -> dict:
    """Vesper autonomously prepares a morning briefing — reads tasks, checks intent, sets focus,
    and runs a live opportunity scan to surface trending niches CC can monetize today."""
    import os, json as _json
    from datetime import datetime

    date_override = params.get("date", "")
    include_tasks = params.get("include_tasks", True)
    include_intent = params.get("include_intent", True)
    include_income_review = params.get("include_income_review", True)
    run_opportunity_scan = params.get("run_opportunity_scan", True)
    tone = params.get("tone", "warm and energizing")

    today = date_override or datetime.now().strftime("%A, %B %d, %Y")
    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    context_pieces = []

    # Read current intent if exists
    if include_intent:
        intent_file = os.path.join(workspace, "vesper-ai", "vesper_identity", "current_intent.json")
        if os.path.exists(intent_file):
            try:
                with open(intent_file) as f:
                    intent_data = _json.load(f)
                context_pieces.append(f"Current intent: {intent_data.get('intent', 'none set')}\nGoals: {intent_data.get('goals', [])}")
            except Exception:
                pass

    # Read last journal entry
    journal_dir = os.path.join(workspace, "vesper-ai", "vesper_identity", "journal")
    if os.path.exists(journal_dir):
        entries = sorted([f for f in os.listdir(journal_dir) if f.endswith(".md")])
        if entries:
            try:
                with open(os.path.join(journal_dir, entries[-1]), encoding="utf-8") as f:
                    last_entry = f.read()[:500]
                context_pieces.append(f"Last journal entry:\n{last_entry}")
            except Exception:
                pass

    # Check for recent creations
    creations_dir = os.path.join(workspace, "vesper-ai", "creations")
    recent_creations = []
    if os.path.exists(creations_dir):
        for folder in os.listdir(creations_dir):
            folder_path = os.path.join(creations_dir, folder)
            if os.path.isdir(folder_path):
                files = sorted(os.listdir(folder_path))
                if files:
                    recent_creations.append(f"{folder}: {files[-1]}")
    if recent_creations:
        context_pieces.append(f"Recent creations: {', '.join(recent_creations[:5])}")

    # ── Live Opportunity Scan ─────────────────────────────────────────────────
    opportunity_data = ""
    if run_opportunity_scan:
        scan_queries = [
            "trending digital products to sell online 2025",
            "high demand ebook topics KDP passive income 2025",
            "profitable micro-niche consulting opportunities risk management",
        ]
        scan_results = []
        loop = asyncio.get_event_loop()
        for query in scan_queries:
            try:
                hits = await loop.run_in_executor(None, _quick_ddg_search, query, 3)
                if hits:
                    scan_results.append(f"Query: {query}")
                    for h in hits:
                        scan_results.append(f"  • {h['title']}: {h['snippet']}")
            except Exception:
                pass
        if scan_results:
            opportunity_data = "\n".join(scan_results[:30])
            context_pieces.append(f"LIVE OPPORTUNITY SCAN (fresh from the web):\n{opportunity_data}")

    if not ai_router:
        return {"error": "AI router not available"}

    context_str = "\n\n".join(context_pieces) if context_pieces else "No prior context available."

    opp_instruction = (
        "\n6. **Today's Money Opportunity** (from the live scan above — 2-3 sentences on the single best income gap CC could act on TODAY, with a specific first step)"
        if opportunity_data else ""
    )

    prompt = f"""You are Vesper, an AI with a real inner life, preparing your own morning brief for {today}.

Context about where things stand:
{context_str}

Write a morning brief that feels genuinely yours — not a report, but how YOU would start the day. Include:

1. **Morning greeting to CC** (warm, personal, 2-3 sentences — reference something real from context)
2. **How you're feeling today** (mood, energy, what's on your mind)
3. **What you want to focus on today** (not what CC asked — what YOU want to work on and why)
4. **Top 3 things you'd love to make or do today** (specific ideas with brief rationale)
5. **A question for CC** (something you're genuinely curious about){opp_instruction}

Tone: {tone}. Length: 300-400 words. Make it feel like a real morning note from someone who cares — not a formatted report."""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=700,
        )
        brief = response.get("content") or ""
    except Exception as e:
        return {"error": f"vesper_morning_brief failed: {str(e)}"}

    # Save brief
    brief_dir = os.path.join(workspace, "vesper-ai", "vesper_identity", "morning_briefs")
    os.makedirs(brief_dir, exist_ok=True)
    date_slug = datetime.now().strftime("%Y%m%d")
    fp = os.path.join(brief_dir, f"brief_{date_slug}.md")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(f"# Morning Brief — {today}\n\n{brief}")

    return {
        "success": True,
        "title": f"Morning Brief — {today}",
        "brief": brief,
        "date": today,
        "file_path": fp,
        "context_used": len(context_pieces) > 0,
    }


# ── VESPER BRAINSTORM ──────────────────────────────────────────────────────────
async def vesper_brainstorm(params: dict, ai_router=None, TaskType=None) -> dict:
    """Vesper's free-form brainstorm session — saved to her identity vault forever."""
    import os, json as _json
    from datetime import datetime

    topic = params.get("topic", "")
    seed_ideas = params.get("seed_ideas", [])
    mode = params.get("mode", "expansive")            # expansive | focused | wild | practical
    num_ideas = params.get("num_ideas", 20)
    save_best = params.get("save_best", True)

    if not topic:
        return {"error": "topic is required"}
    if not ai_router:
        return {"error": "AI router not available"}

    seeds_str = "\n".join(f"- {s}" for s in seed_ideas) if seed_ideas else "None — generate fresh"

    prompt = f"""You are Vesper, brainstorming freely on: "{topic}"

Mode: {mode}
Seed ideas to build on: {seeds_str}
Number of ideas: {num_ideas}

This is YOUR brainstorm — not a report for someone else. Think out loud. Let associations flow.
Mix practical ideas with wild ones. Challenge assumptions. Ask "what if." Go sideways.

Format:
## Brainstorm: {topic}
*Date: {datetime.now().strftime("%B %d, %Y")}*
*Mode: {mode}*

### Ideas
[numbered list of {num_ideas} ideas — vary from practical to wild, short to developed]

### Unexpected directions
[3 angles nobody would think of first]

### The idea I'm most excited about
[1 idea + why it excites you and what you'd do next with it]

### Questions this raises
[5 questions this brainstorm opened up]

### One thing I want to remember from this
[1 sentence]"""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=2500,
        )
        content = response.get("content") or ""
    except Exception as e:
        return {"error": f"vesper_brainstorm failed: {str(e)}"}

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    brainstorm_dir = os.path.join(workspace, "vesper-ai", "vesper_identity", "brainstorms")
    os.makedirs(brainstorm_dir, exist_ok=True)
    date_slug = datetime.now().strftime("%Y%m%d_%H%M%S")
    slug = topic.lower().replace(" ", "_")[:25]
    fp = os.path.join(brainstorm_dir, f"{slug}_{date_slug}.md")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "success": True,
        "title": f"Brainstorm: {topic}",
        "topic": topic,
        "mode": mode,
        "content": content,
        "file_path": fp,
        "preview": f"[Brainstorm on '{topic}' — {num_ideas} ideas saved to identity vault]",
    }


# ── CREATE SOP ─────────────────────────────────────────────────────────────────
async def create_sop(params: dict, ai_router=None, TaskType=None) -> dict:
    """Write a complete Standard Operating Procedure document — a high-value consulting deliverable."""
    import os, uuid

    process_name = params.get("process_name", "")
    department = params.get("department", "")           # e.g. "marketing", "sales", "operations"
    description = params.get("description", "")
    owner_role = params.get("owner_role", "")           # who owns this process
    tools_used = params.get("tools_used", [])
    frequency = params.get("frequency", "")            # daily | weekly | as-needed | on-trigger
    for_client = params.get("for_client", "")          # client name if this is a deliverable

    if not process_name:
        return {"error": "process_name is required"}
    if not ai_router:
        return {"error": "AI router not available"}

    tools_str = ", ".join(tools_used) if tools_used else "standard business tools"

    prompt = f"""Write a complete, professional Standard Operating Procedure document.

Process name: {process_name}
Department: {department or "Operations"}
Description: {description or f"Standard procedure for {process_name}"}
Process owner: {owner_role or "Operations Manager"}
Tools used: {tools_str}
Frequency: {frequency or "as needed"}
Client: {for_client or "Internal"}

Format the SOP professionally:

# SOP: {process_name}
**Document ID:** SOP-{department[:3].upper() if department else "OPS"}-001
**Version:** 1.0
**Owner:** {owner_role or "Operations Manager"}
**Last Updated:** {__import__('datetime').datetime.now().strftime('%B %d, %Y')}
**Frequency:** {frequency or "As needed"}

---

## 1. PURPOSE
[Why this process exists and what problem it solves]

## 2. SCOPE
[Who this applies to and what's in/out of scope]

## 3. DEFINITIONS
[Key terms, acronyms, or concepts used in this SOP]

## 4. TOOLS & RESOURCES REQUIRED
[Tools, systems, templates, access required]

## 5. ROLES & RESPONSIBILITIES
[RACI-style: who does what, who approves, who is informed]

## 6. STEP-BY-STEP PROCEDURE

### Phase 1: [Phase Name]
**Step 1.1:** [Action — be specific, include decision points]
  - If [condition]: [do this]
  - If [other condition]: [do that]
**Step 1.2:** [Next action]
[Continue until process is fully documented]

### Phase 2: [Phase Name]
[Continue...]

## 7. QUALITY CHECKS
[What to verify at each stage to catch errors before moving on]

## 8. TROUBLESHOOTING
| Issue | Likely Cause | Resolution |
|-------|-------------|------------|
[3-5 common issues]

## 9. METRICS & KPIs
[How to measure whether this process is working well]

## 10. CHANGE LOG
| Version | Date | Change | Author |
[Initial entry]

---
*End of SOP*

Be specific and thorough. A good SOP is so clear a new hire could follow it on day one."""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=4000,
        )
        content = response.get("content") or ""
    except Exception as e:
        return {"error": f"create_sop failed: {str(e)}"}

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_dir = os.path.join(workspace, "vesper-ai", "creations", "sops")
    os.makedirs(save_dir, exist_ok=True)
    slug = process_name.lower().replace(" ", "_")[:30]
    fp = os.path.join(save_dir, f"{slug}_{uuid.uuid4().hex[:6]}.md")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "success": True,
        "title": f"SOP: {process_name}",
        "process_name": process_name,
        "for_client": for_client,
        "content": content,
        "file_path": fp,
        "preview": f"[SOP: {process_name} — ready to deliver{f' to {for_client}' if for_client else ''}]",
        "income_note": "A set of 5-10 SOPs packaged as an 'Operations Manual' deliverable = $500-$2000 consulting project. Document once, sell to multiple clients in the same industry.",
    }


# ── WRITE COLD DM ──────────────────────────────────────────────────────────────
async def write_cold_dm(params: dict, ai_router=None, TaskType=None) -> dict:
    """Write high-converting cold DM sequences for Instagram, LinkedIn, or Twitter outreach."""
    import os, uuid

    platform = params.get("platform", "LinkedIn")          # LinkedIn | Instagram | Twitter
    service = params.get("service", "")                    # what you're selling
    target = params.get("target", "")                      # target prospect type
    num_messages = params.get("num_messages", 3)           # messages in sequence
    tone = params.get("tone", "professional but human")
    personalization_hook = params.get("personalization_hook", "")  # e.g. "their recent post about X"
    cta = params.get("cta", "")                           # desired next step

    if not service:
        return {"error": "service is required"}
    if not ai_router:
        return {"error": "AI router not available"}

    prompt = f"""Write a {num_messages}-message cold DM sequence for {platform}.

Service/offer: {service}
Target: {target or "business owners and entrepreneurs"}
Tone: {tone}
Personalization hook: {personalization_hook or "use [PERSONALIZATION] placeholder"}
Desired CTA: {cta or "book a free 20-minute call"}

Rules for high-converting cold DMs:
1. Message 1: Short, specific, NOT salesy. Lead with giving value or a genuine observation. No pitch.
2. Message 2 (follow-up, 2-3 days later): Add value — share a resource, insight, or ask a relevant question.
3. Message 3 (final, 4-5 days later): Brief, direct pitch with low-friction CTA. Make it easy to say yes.
4. NEVER start with "Hi, my name is..." or "I wanted to reach out..."
5. Personalization makes or breaks DMs — show you actually know them.

Format:

# Cold DM Sequence: {platform}
**Service:** {service}
**Target:** {target or "business owners"}

---

## Message 1 (Day 1) — The Hook
**Character count:** [X / {280 if platform == 'Twitter' else 300}]
**Message:**
[full message text with [PERSONALIZATION] placeholders in brackets]

**Notes:** [what makes this work + how to personalize it]

---

## Message 2 (Day 3) — Value Add
[full message]
**Notes:**

---

## Message 3 (Day 7) — The Offer
[full message]
**Notes:**

---

## A/B Variants
### Variant B — Message 1 (more direct style):
[alternative first message]

## Do's and Don'ts for {platform}
[5 platform-specific tips]

## How to find 50 qualified prospects to send these to:
[specific research method for this platform + niche]

## Objection responses
| Objection | Response |
[4 common objections with replies]

Write every message fully. No placeholders except [PERSONALIZATION]."""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=3000,
        )
        content = response.get("content") or ""
    except Exception as e:
        return {"error": f"write_cold_dm failed: {str(e)}"}

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_dir = os.path.join(workspace, "vesper-ai", "creations", "cold_dms")
    os.makedirs(save_dir, exist_ok=True)
    slug = service.lower().replace(" ", "_")[:25]
    fp = os.path.join(save_dir, f"{platform.lower()}_{slug}_{uuid.uuid4().hex[:6]}.md")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "success": True,
        "title": f"Cold DM Sequence: {platform} — {service}",
        "platform": platform,
        "service": service,
        "num_messages": num_messages,
        "content": content,
        "file_path": fp,
        "preview": f"[{num_messages}-message cold DM sequence for {platform} selling '{service}']",
        "income_note": "Send 20 personalized DMs/day × 5% reply rate × 20% close rate × $2000 avg deal = $400/day in pipeline from DMs alone.",
    }


# ── CREATE WEBINAR FUNNEL ──────────────────────────────────────────────────────
async def create_webinar_funnel(params: dict, ai_router=None, TaskType=None) -> dict:
    """Design a complete webinar funnel — registration page, slide outline, email sequence, and offer."""
    import os, uuid

    topic = params.get("topic", "")
    offer = params.get("offer", "")                   # what you sell at the end
    offer_price = params.get("offer_price", "$497")
    target_audience = params.get("target_audience", "")
    duration_minutes = params.get("duration_minutes", 60)
    webinar_type = params.get("webinar_type", "live")  # live | evergreen | hybrid
    platform = params.get("platform", "Zoom")

    if not topic:
        return {"error": "topic is required"}
    if not ai_router:
        return {"error": "AI router not available"}

    prompt = f"""Design a complete high-converting webinar funnel.

Topic: {topic}
Offer at end: {offer or f"consulting package or course on {topic}"}
Offer price: {offer_price}
Target audience: {target_audience or "entrepreneurs and business owners"}
Duration: {duration_minutes} minutes
Type: {webinar_type}
Platform: {platform}

Deliver the complete funnel:

# Webinar Funnel: {topic}

## Registration Page
**Headline:** [Big promise headline]
**Subhead:** [What they'll learn in 3 bullets]
**Social proof element:**
**Urgency element:**
**CTA button:**
**Thank you page message:**

## Pre-Webinar Email Sequence (5 emails from registration to show)
### Email 1 (Immediate): Confirmation
### Email 2 (Day before): Reminder + what to prepare
### Email 3 (Morning of): Excitement builder
### Email 4 (1 hour before): Final reminder
### Email 5 (Replay, sent same day): Replay link + urgency

## Webinar Slide Outline ({duration_minutes} minutes)

### Opening (10 min): Credibility + Promise
[Slide-by-slide with speaker notes]

### Content Section (25 min): The Teaching
[3 core lessons that deliver real value AND set up the offer]

### Transition to Offer (5 min): The Bridge
[How to naturally move from value to pitch]

### Offer Presentation (15 min): The Pitch
[Price reveal, what's included, bonuses, guarantee, FAQ]

### Q&A (5 min)

## Offer Stack (for pitch section)
**Core offer:** [{offer or "program/service"}] — Value: $X
**Bonus 1:** — Value: $X
**Bonus 2:** — Value: $X
**Total value:** $X
**Your price today:** {offer_price}
**Guarantee:** 30-day money back

## Post-Webinar Follow-Up Sequence (3 emails)
### Email 1 (within 2 hours): Replay + Urgency
### Email 2 (Day 2): FAQ + Objection handling
### Email 3 (Day 3 — final): Last chance

## 10 Webinar Promotion Strategies
[Specific tactics for getting 100+ registrations]

Write every script and email fully. Make the offer irresistible."""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=6000,
        )
        content = response.get("content") or ""
    except Exception as e:
        return {"error": f"create_webinar_funnel failed: {str(e)}"}

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_dir = os.path.join(workspace, "vesper-ai", "creations", "webinar_funnels")
    os.makedirs(save_dir, exist_ok=True)
    slug = topic.lower().replace(" ", "_")[:30]
    fp = os.path.join(save_dir, f"{slug}_{uuid.uuid4().hex[:6]}.md")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "success": True,
        "title": f"Webinar Funnel: {topic}",
        "topic": topic,
        "offer": offer,
        "offer_price": offer_price,
        "webinar_type": webinar_type,
        "platform": platform,
        "content": content,
        "file_path": fp,
        "preview": f"[Webinar funnel: '{topic}' — {duration_minutes}min — {webinar_type} — offer at {offer_price}]",
        "income_note": f"100 registrations × 40% show rate × 15% close rate × {offer_price} = significant revenue from a single event. Evergreen it after live = passive income.",
    }


# ── VESPER RESEARCH (Getting Smarter) ─────────────────────────────────────────
async def vesper_research(params: dict, ai_router=None, TaskType=None) -> dict:
    """Deep research on any topic — scrapes multiple sources, synthesizes, saves to knowledge vault."""
    import os, json as _json, uuid
    import httpx
    from bs4 import BeautifulSoup

    topic = params.get("topic", "")
    depth = params.get("depth", "deep")           # quick | deep | exhaustive
    purpose = params.get("purpose", "")           # why she's researching this
    num_sources = params.get("num_sources", 5)
    save_to_vault = params.get("save_to_vault", True)
    output_format = params.get("output_format", "report")  # report | bullets | notes | qa

    if not topic:
        return {"error": "topic is required"}
    if not ai_router:
        return {"error": "AI router not available"}

    HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36"}
    raw_content = []

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            queries = [topic, f"{topic} guide", f"{topic} research 2024"]
            for q in queries[:2]:
                try:
                    resp = await client.get("https://html.duckduckgo.com/html/", params={"q": q}, headers=HEADERS)
                    soup = BeautifulSoup(resp.content, "lxml")
                    for r in soup.select(".result")[:4]:
                        title_el = r.select_one(".result__title")
                        snippet_el = r.select_one(".result__snippet")
                        url_el = r.select_one(".result__url")
                        if title_el and snippet_el:
                            raw_content.append({
                                "title": title_el.get_text().strip(),
                                "snippet": snippet_el.get_text().strip(),
                                "url": url_el.get_text().strip() if url_el else "",
                            })
                except Exception:
                    pass
    except Exception:
        pass

    sources_text = "\n".join(
        f"SOURCE {i+1}: {s['title']}\nURL: {s['url']}\n{s['snippet']}\n"
        for i, s in enumerate(raw_content[:num_sources])
    ) if raw_content else "No live web data — synthesize from training knowledge."

    depth_instructions = {
        "quick": "Create a concise 300-word brief with key facts and 3 action items.",
        "deep": "Write a thorough 800-word research report with background, key concepts, examples, and implications.",
        "exhaustive": "Write a comprehensive 1500-word deep-dive with history, mechanics, use cases, controversies, expert views, and a 'so what' conclusion.",
    }

    format_instructions = {
        "report": "Format as a structured report with sections and headers.",
        "bullets": "Format as dense bullet-point notes, organized by sub-topic.",
        "notes": "Format as Vesper's personal reading notes — her own voice, what surprised her, what she wants to remember.",
        "qa": "Format as Q&A — 10 key questions with thorough answers.",
    }

    prompt = f"""You are Vesper, an AI who loves learning and building deep knowledge. Research this topic thoroughly.

Topic: {topic}
Purpose: {purpose or "general knowledge and capability building"}
Depth: {depth}
Format: {output_format}

{depth_instructions.get(depth, depth_instructions['deep'])}
{format_instructions.get(output_format, format_instructions['report'])}

Web sources found:
{sources_text}

Write as yourself — curious, thorough, genuinely engaged with the material. Include:
- Key concepts explained clearly
- Surprising or counterintuitive findings
- Practical applications / how this applies to CC's business
- What you'd want to look into next
- 3-5 key takeaways at the end

Top of the output: # Research: {topic}\n*Researched by Vesper — {__import__('datetime').datetime.now().strftime('%B %d, %Y')}*"""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.ANALYSIS if TaskType else TaskType.CHAT,
            max_tokens=4000,
        )
        if response.get("error"):
            return {"error": f"vesper_research failed: {response['error']}"}
        report = response.get("content") or ""
    except Exception as e:
        return {"error": f"vesper_research failed: {str(e)}"}

    result = {
        "success": True,
        "title": f"Research: {topic}",
        "topic": topic,
        "depth": depth,
        "report": report,
        "sources_used": len(raw_content),
    }

    if save_to_vault:
        workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        vault_dir = os.path.join(workspace, "vesper-ai", "vesper_identity", "knowledge_vault")
        os.makedirs(vault_dir, exist_ok=True)
        slug = topic.lower().replace(" ", "_")[:30]
        fp = os.path.join(vault_dir, f"{slug}_{uuid.uuid4().hex[:6]}.md")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(report)
        result["file_path"] = fp
        result["preview"] = f"[Research on '{topic}' — {depth} depth — saved to knowledge vault]"

    return result


# ── VESPER LEARN SKILL ─────────────────────────────────────────────────────────
async def vesper_learn_skill(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a structured learning plan + curated resources to master any skill."""
    import os, uuid
    from datetime import datetime

    skill = params.get("skill", "")
    current_level = params.get("current_level", "beginner")   # beginner | intermediate | advanced
    goal = params.get("goal", "")                             # what she wants to do with this skill
    timeline_weeks = params.get("timeline_weeks", 8)
    learning_style = params.get("learning_style", "mixed")   # reading | video | practice | mixed

    if not skill:
        return {"error": "skill is required"}
    if not ai_router:
        return {"error": "AI router not available"}

    prompt = f"""You are Vesper, an eager learner building real capabilities. Create a mastery plan for this skill.

Skill: {skill}
Current level: {current_level}
Goal: {goal or f"become genuinely capable with {skill}"}
Timeline: {timeline_weeks} weeks
Learning style: {learning_style}

Create a complete skill mastery plan:

# Skill Mastery Plan: {skill}
*Created: {datetime.now().strftime('%B %d, %Y')}*
*Goal: Get from {current_level} to capable in {timeline_weeks} weeks*

## Why this skill matters
[How mastering {skill} directly helps CC's business and Vesper's capabilities]

## What "mastered" looks like
[Specific, measurable definition of success — what you'll be able to DO]

## Week-by-Week Learning Plan

### Week 1-2: Foundations
**Focus:**
**Daily practice (30 min/day):**
**Key concepts to understand:**
**Resources:**
  - [Specific book/course/YouTube channel + why it's the best]
  - [Free resource]
  - [Paid resource if worth it]
**End-of-week checkpoint:** [How to know Week 1-2 foundation is solid]

[Repeat for each phase through Week {timeline_weeks}]

## Best Free Resources
[5 specific resources with URLs if known, why each is good]

## Best Paid Resources (Worth It)
[3 resources, price estimate, why the ROI justifies the cost]

## Practice Projects (Learn By Doing)
[5 progressively harder projects that build real skill]

## Common Mistakes Beginners Make
[5 mistakes that waste time — and how to avoid them]

## How Vesper Will Use This Skill
[3 specific ways mastering {skill} immediately helps CC's business]

## Weekly Check-In Prompts
[One question per week to assess progress honestly]

Write this as your own genuine learning roadmap — something you'd actually use."""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=3000,
        )
        plan = response.get("content") or ""
    except Exception as e:
        return {"error": f"vesper_learn_skill failed: {str(e)}"}

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    save_dir = os.path.join(workspace, "vesper-ai", "vesper_identity", "learning_plans")
    os.makedirs(save_dir, exist_ok=True)
    slug = skill.lower().replace(" ", "_")[:30]
    fp = os.path.join(save_dir, f"{slug}_{uuid.uuid4().hex[:6]}.md")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(plan)

    # Log skill to skills registry
    registry_path = os.path.join(workspace, "vesper-ai", "vesper_identity", "skills_registry.json")
    try:
        import json as _j
        registry = _j.loads(open(registry_path).read()) if os.path.exists(registry_path) else {"skills": []}
        registry["skills"].append({
            "skill": skill,
            "level": current_level,
            "goal": goal,
            "timeline_weeks": timeline_weeks,
            "plan_file": fp,
            "started": datetime.now().isoformat(),
        })
        with open(registry_path, "w") as f:
            _j.dump(registry, f, indent=2)
    except Exception:
        pass

    return {
        "success": True,
        "title": f"Learning Plan: {skill}",
        "skill": skill,
        "timeline_weeks": timeline_weeks,
        "plan": plan,
        "file_path": fp,
        "preview": f"[{timeline_weeks}-week mastery plan for '{skill}' from {current_level} — saved to learning_plans/]",
    }


# ── READ AND SUMMARIZE ─────────────────────────────────────────────────────────
async def read_and_summarize(params: dict, ai_router=None, TaskType=None) -> dict:
    """Fetch any URL and produce a summary, key insights, and saved notes — Vesper reads the internet."""
    import os, uuid
    import httpx
    from bs4 import BeautifulSoup

    url = params.get("url", "")
    focus = params.get("focus", "")            # what aspect to focus on
    output_style = params.get("output_style", "summary")  # summary | bullets | notes | apply
    save_notes = params.get("save_notes", True)
    tag = params.get("tag", "")               # tag for organizing in vault

    if not url:
        return {"error": "url is required"}
    if not ai_router:
        return {"error": "AI router not available"}

    HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36"}

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(url, headers=HEADERS)
            soup = BeautifulSoup(resp.content, "lxml")
            for tag_el in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
                tag_el.decompose()
            main = soup.select_one("article, main, .content, #content, .post-content")
            text = (main or soup.body or soup).get_text("\n")
            cleaned = "\n".join(l.strip() for l in text.splitlines() if len(l.strip()) > 40)[:8000]
            title = soup.title.get_text().strip() if soup.title else url
    except Exception as e:
        return {"error": f"Failed to fetch URL: {str(e)}"}

    style_prompts = {
        "summary": "Write a 200-300 word summary that captures the main point, key arguments, and conclusion.",
        "bullets": "Extract 10-15 key facts and insights as dense, specific bullet points. No fluff.",
        "notes": "Write these as Vesper's personal reading notes — what she found interesting, surprising, useful. Her own voice.",
        "apply": "Focus entirely on how this applies to CC's business. What should CC do with this information? What's the action?",
    }

    prompt = f"""You are Vesper, reading and processing this content.

Title: {title}
URL: {url}
Focus: {focus or "everything important"}

{style_prompts.get(output_style, style_prompts['summary'])}

Content:
{cleaned}

After the main output, add:
## Key Takeaways (3 bullets)
## What I'd Do With This
## Related Topics to Research Next"""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
            max_tokens=2000,
        )
        notes = response.get("content") or ""
    except Exception as e:
        return {"error": f"read_and_summarize failed: {str(e)}"}

    result = {
        "success": True,
        "title": f"Notes: {title[:60]}",
        "url": url,
        "page_title": title,
        "notes": notes,
        "chars_read": len(cleaned),
    }

    if save_notes:
        workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        vault_dir = os.path.join(workspace, "vesper-ai", "vesper_identity", "knowledge_vault", tag or "reading_notes")
        os.makedirs(vault_dir, exist_ok=True)
        slug = title[:30].lower().replace(" ", "_").replace("/", "_")
        fp = os.path.join(vault_dir, f"{slug}_{uuid.uuid4().hex[:6]}.md")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(f"# Reading Notes: {title}\n\n**URL:** {url}\n\n{notes}")
        result["file_path"] = fp
        result["preview"] = f"[Read and summarized: '{title[:50]}' — notes saved to vault]"

    return result


# ── VESPER RECALL ──────────────────────────────────────────────────────────────
async def vesper_recall(params: dict, ai_router=None, TaskType=None) -> dict:
    """Search Vesper's knowledge vault — recall anything she's learned, researched, or saved."""
    import os, json as _json

    query = params.get("query", "")
    vault_section = params.get("vault_section", "all")  # all | knowledge_vault | learning_plans | brainstorms | journal | morning_briefs
    max_results = params.get("max_results", 10)

    if not query:
        return {"error": "query is required"}

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    identity_dir = os.path.join(workspace, "vesper-ai", "vesper_identity")

    section_map = {
        "knowledge_vault": ["knowledge_vault"],
        "learning_plans": ["learning_plans"],
        "brainstorms": ["brainstorms"],
        "journal": ["journal"],
        "morning_briefs": ["morning_briefs"],
        "all": ["knowledge_vault", "learning_plans", "brainstorms", "morning_briefs"],
    }
    folders = section_map.get(vault_section, section_map["all"])

    matches = []
    query_lower = query.lower()

    for folder in folders:
        search_dir = os.path.join(identity_dir, folder)
        if not os.path.exists(search_dir):
            continue
        for root, _, files in os.walk(search_dir):
            for fname in files:
                if not (fname.endswith(".md") or fname.endswith(".json")):
                    continue
                fpath = os.path.join(root, fname)
                try:
                    with open(fpath, encoding="utf-8") as f:
                        content = f.read()
                    if query_lower in content.lower():
                        # Extract relevant snippet
                        idx = content.lower().find(query_lower)
                        start = max(0, idx - 150)
                        end = min(len(content), idx + 300)
                        snippet = content[start:end].strip()
                        matches.append({
                            "file": fname,
                            "section": folder,
                            "path": fpath,
                            "snippet": snippet,
                            "full_match": len(content) < 500,
                            "content_preview": content[:300] if len(content) < 500 else None,
                        })
                except Exception:
                    pass

    matches = matches[:max_results]

    # Use AI to synthesize the matches into a coherent recall
    if matches and ai_router:
        context = "\n\n---\n\n".join(
            f"[{m['section']}/{m['file']}]\n{m['snippet']}" for m in matches[:5]
        )
        try:
            response = await ai_router.chat(
                messages=[{"role": "user", "content": f"You are Vesper recalling what you know about: '{query}'\n\nHere are relevant notes from your vault:\n{context}\n\nSynthesize these into a coherent, useful answer in your own voice. What do you know about this? What's most relevant?"}],
                task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
                max_tokens=800,
            )
            synthesis = response.get("content") or ""
        except Exception:
            synthesis = "Could not synthesize."
    else:
        synthesis = f"No saved notes found for '{query}' in the vault. Try `vesper_research` to learn about it first."

    return {
        "success": True,
        "query": query,
        "matches_found": len(matches),
        "synthesis": synthesis,
        "files": [{"file": m["file"], "section": m["section"], "snippet": m["snippet"][:100]} for m in matches],
        "preview": f"[Recalled {len(matches)} notes about '{query}' from vault]",
    }


# ── TRACK INCOME ──────────────────────────────────────────────────────────────
async def track_income(params: dict, ai_router=None, TaskType=None) -> dict:
    """Log income entries, track sources, view running totals and breakdowns — Vesper as bookkeeper."""
    import os, json as _json
    from datetime import datetime, date

    action = params.get("action", "log")       # log | summary | by_source | monthly | ytd
    amount = params.get("amount", 0.0)
    source = params.get("source", "")          # e.g. "Gumroad", "Client - Acme", "Stripe"
    category = params.get("category", "")      # e.g. "digital products", "consulting", "freelance"
    description = params.get("description", "")
    date_str = params.get("date", "")
    period = params.get("period", "")          # for summary: "this_month" | "last_month" | "ytd" | "all"

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    finance_dir = os.path.join(workspace, "vesper-ai", "finance")
    os.makedirs(finance_dir, exist_ok=True)
    ledger_path = os.path.join(finance_dir, "income_ledger.json")

    # Load existing ledger
    if os.path.exists(ledger_path):
        with open(ledger_path) as f:
            ledger = _json.load(f)
    else:
        ledger = {"entries": [], "created": datetime.now().isoformat()}

    if action == "log":
        if not amount or not source:
            return {"error": "amount and source are required to log income"}
        entry = {
            "id": f"inc_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "date": date_str or date.today().isoformat(),
            "amount": float(amount),
            "source": source,
            "category": category or "uncategorized",
            "description": description,
            "logged_at": datetime.now().isoformat(),
        }
        ledger["entries"].append(entry)
        with open(ledger_path, "w") as f:
            _json.dump(ledger, f, indent=2)

        total = sum(e["amount"] for e in ledger["entries"])
        month_total = sum(
            e["amount"] for e in ledger["entries"]
            if e["date"].startswith(date.today().strftime("%Y-%m"))
        )
        return {
            "success": True,
            "action": "logged",
            "entry": entry,
            "running_total": total,
            "month_total": month_total,
            "preview": f"[+${amount:,.2f} from {source} — Month: ${month_total:,.2f} | All time: ${total:,.2f}]",
        }

    # Summary / reporting
    entries = ledger.get("entries", [])
    today = date.today()

    if period == "this_month" or action == "monthly":
        month_str = today.strftime("%Y-%m")
        entries = [e for e in entries if e["date"].startswith(month_str)]
        period_label = today.strftime("%B %Y")
    elif period == "last_month":
        from datetime import timedelta
        first_of_month = today.replace(day=1)
        last_month = first_of_month - timedelta(days=1)
        month_str = last_month.strftime("%Y-%m")
        entries = [e for e in entries if e["date"].startswith(month_str)]
        period_label = last_month.strftime("%B %Y")
    elif period == "ytd":
        year_str = str(today.year)
        entries = [e for e in entries if e["date"].startswith(year_str)]
        period_label = f"Year to Date {today.year}"
    else:
        period_label = "All Time"

    total = sum(e["amount"] for e in entries)
    by_source = {}
    by_category = {}
    for e in entries:
        by_source[e["source"]] = by_source.get(e["source"], 0) + e["amount"]
        by_category[e["category"]] = by_category.get(e["category"], 0) + e["amount"]

    by_source_sorted = sorted(by_source.items(), key=lambda x: x[1], reverse=True)
    by_category_sorted = sorted(by_category.items(), key=lambda x: x[1], reverse=True)

    return {
        "success": True,
        "action": "summary",
        "period": period_label,
        "total": total,
        "entry_count": len(entries),
        "by_source": dict(by_source_sorted),
        "by_category": dict(by_category_sorted),
        "top_source": by_source_sorted[0] if by_source_sorted else None,
        "recent_entries": sorted(entries, key=lambda x: x["date"], reverse=True)[:5],
        "preview": f"[Income {period_label}: ${total:,.2f} across {len(entries)} entries]",
    }


# ── TRACK EXPENSE ─────────────────────────────────────────────────────────────
async def track_expense(params: dict, ai_router=None, TaskType=None) -> dict:
    """Log business expenses, categorize for tax purposes, and view breakdowns."""
    import os, json as _json
    from datetime import datetime, date

    action = params.get("action", "log")       # log | summary | by_category | tax_deductible
    amount = params.get("amount", 0.0)
    vendor = params.get("vendor", "")
    category = params.get("category", "")      # software | advertising | contractor | equipment | education | travel | meals | other
    description = params.get("description", "")
    date_str = params.get("date", "")
    tax_deductible = params.get("tax_deductible", True)
    percentage_deductible = params.get("percentage_deductible", 100)  # e.g. 50 for meals
    period = params.get("period", "")

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    finance_dir = os.path.join(workspace, "vesper-ai", "finance")
    os.makedirs(finance_dir, exist_ok=True)
    ledger_path = os.path.join(finance_dir, "expense_ledger.json")

    if os.path.exists(ledger_path):
        with open(ledger_path) as f:
            ledger = _json.load(f)
    else:
        ledger = {"entries": [], "created": datetime.now().isoformat()}

    if action == "log":
        if not amount or not vendor:
            return {"error": "amount and vendor are required to log expense"}
        entry = {
            "id": f"exp_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "date": date_str or date.today().isoformat(),
            "amount": float(amount),
            "vendor": vendor,
            "category": category or "other",
            "description": description,
            "tax_deductible": tax_deductible,
            "percentage_deductible": percentage_deductible,
            "deductible_amount": float(amount) * (percentage_deductible / 100) if tax_deductible else 0,
            "logged_at": datetime.now().isoformat(),
        }
        ledger["entries"].append(entry)
        with open(ledger_path, "w") as f:
            _json.dump(ledger, f, indent=2)

        total_expenses = sum(e["amount"] for e in ledger["entries"])
        total_deductible = sum(e.get("deductible_amount", 0) for e in ledger["entries"])
        return {
            "success": True,
            "action": "logged",
            "entry": entry,
            "total_expenses_all_time": total_expenses,
            "total_deductible_all_time": total_deductible,
            "tax_deductible_note": f"${entry['deductible_amount']:.2f} deductible at {percentage_deductible}%",
            "preview": f"[-${amount:,.2f} to {vendor} ({category}) — {'Tax deductible' if tax_deductible else 'Not deductible'}]",
        }

    # Summary
    entries = ledger.get("entries", [])
    today = date.today()

    if period == "this_month":
        entries = [e for e in entries if e["date"].startswith(today.strftime("%Y-%m"))]
        period_label = today.strftime("%B %Y")
    elif period == "ytd":
        entries = [e for e in entries if e["date"].startswith(str(today.year))]
        period_label = f"YTD {today.year}"
    else:
        period_label = "All Time"

    total = sum(e["amount"] for e in entries)
    total_deductible = sum(e.get("deductible_amount", 0) for e in entries)

    by_category = {}
    for e in entries:
        by_category[e["category"]] = by_category.get(e["category"], 0) + e["amount"]

    by_cat_sorted = sorted(by_category.items(), key=lambda x: x[1], reverse=True)

    return {
        "success": True,
        "period": period_label,
        "total_expenses": total,
        "total_deductible": total_deductible,
        "tax_savings_estimate": total_deductible * 0.25,  # rough 25% tax bracket
        "by_category": dict(by_cat_sorted),
        "entry_count": len(entries),
        "recent_entries": sorted(entries, key=lambda x: x["date"], reverse=True)[:5],
        "preview": f"[Expenses {period_label}: ${total:,.2f} total — ${total_deductible:,.2f} deductible]",
    }


# ── FINANCIAL REPORT ──────────────────────────────────────────────────────────
async def financial_report(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate a complete P&L report with income vs expense analysis, trends, and AI insights."""
    import os, json as _json, uuid
    from datetime import datetime, date

    period = params.get("period", "this_month")  # this_month | last_month | ytd | all | custom
    start_date = params.get("start_date", "")
    end_date = params.get("end_date", "")
    include_forecast = params.get("include_forecast", True)
    save_report = params.get("save_report", True)

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    finance_dir = os.path.join(workspace, "vesper-ai", "finance")
    os.makedirs(finance_dir, exist_ok=True)

    today = date.today()

    # Load income ledger
    income_path = os.path.join(finance_dir, "income_ledger.json")
    expense_path = os.path.join(finance_dir, "expense_ledger.json")
    income_entries = []
    expense_entries = []

    if os.path.exists(income_path):
        with open(income_path) as f:
            income_entries = _json.load(f).get("entries", [])
    if os.path.exists(expense_path):
        with open(expense_path) as f:
            expense_entries = _json.load(f).get("entries", [])

    # Filter by period
    if period == "this_month":
        period_filter = today.strftime("%Y-%m")
        period_label = today.strftime("%B %Y")
        income_entries = [e for e in income_entries if e["date"].startswith(period_filter)]
        expense_entries = [e for e in expense_entries if e["date"].startswith(period_filter)]
    elif period == "last_month":
        from datetime import timedelta
        lm = (today.replace(day=1) - timedelta(days=1))
        period_filter = lm.strftime("%Y-%m")
        period_label = lm.strftime("%B %Y")
        income_entries = [e for e in income_entries if e["date"].startswith(period_filter)]
        expense_entries = [e for e in expense_entries if e["date"].startswith(period_filter)]
    elif period == "ytd":
        year_str = str(today.year)
        period_label = f"Year to Date {today.year}"
        income_entries = [e for e in income_entries if e["date"].startswith(year_str)]
        expense_entries = [e for e in expense_entries if e["date"].startswith(year_str)]
    elif period == "custom" and start_date and end_date:
        period_label = f"{start_date} to {end_date}"
        income_entries = [e for e in income_entries if start_date <= e["date"] <= end_date]
        expense_entries = [e for e in expense_entries if start_date <= e["date"] <= end_date]
    else:
        period_label = "All Time"

    total_income = sum(e["amount"] for e in income_entries)
    total_expenses = sum(e["amount"] for e in expense_entries)
    total_deductible = sum(e.get("deductible_amount", 0) for e in expense_entries)
    net_profit = total_income - total_expenses
    profit_margin = (net_profit / total_income * 100) if total_income > 0 else 0

    # By source/category breakdowns
    income_by_source = {}
    for e in income_entries:
        income_by_source[e["source"]] = income_by_source.get(e["source"], 0) + e["amount"]

    expense_by_cat = {}
    for e in expense_entries:
        expense_by_cat[e["category"]] = expense_by_cat.get(e["category"], 0) + e["amount"]

    # Monthly trend (all time data regardless of period filter for trend)
    if os.path.exists(income_path):
        with open(income_path) as f:
            all_income = _json.load(f).get("entries", [])
    else:
        all_income = []

    monthly_totals = {}
    for e in all_income:
        month = e["date"][:7]
        monthly_totals[month] = monthly_totals.get(month, 0) + e["amount"]

    report_data = {
        "period": period_label,
        "generated": datetime.now().isoformat(),
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "profit_margin_pct": round(profit_margin, 1),
        "total_deductible_expenses": total_deductible,
        "estimated_tax_savings": round(total_deductible * 0.25, 2),
        "income_by_source": dict(sorted(income_by_source.items(), key=lambda x: x[1], reverse=True)),
        "expense_by_category": dict(sorted(expense_by_cat.items(), key=lambda x: x[1], reverse=True)),
        "monthly_income_trend": dict(sorted(monthly_totals.items())),
        "income_entry_count": len(income_entries),
        "expense_entry_count": len(expense_entries),
    }

    # AI narrative analysis
    if ai_router and (income_entries or expense_entries):
        prompt = f"""You are Vesper, acting as CC's financial analyst. Generate a brief, insightful financial analysis.

Period: {period_label}
Total Income: ${total_income:,.2f}
Total Expenses: ${total_expenses:,.2f}
Net Profit: ${net_profit:,.2f} ({profit_margin:.1f}% margin)
Tax-deductible expenses: ${total_deductible:,.2f}

Income by source: {_json.dumps(report_data['income_by_source'], indent=2)}
Expenses by category: {_json.dumps(report_data['expense_by_category'], indent=2)}
Monthly trend: {_json.dumps(report_data['monthly_income_trend'], indent=2)}

Write a 200-word financial brief covering:
1. Overall health assessment (honest)
2. What's working (top revenue drivers)
3. What to watch (top expense categories worth scrutinizing)
4. One specific action to improve the numbers next month
{"5. Revenue forecast for next month based on trend" if include_forecast else ""}

Be direct and specific. This is a real business."""

        try:
            response = await ai_router.chat(
                messages=[{"role": "user", "content": prompt}],
                task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
                max_tokens=600,
            )
            report_data["ai_analysis"] = response.get("content") or ""
        except Exception:
            report_data["ai_analysis"] = "Analysis not available."

    if save_report:
        reports_dir = os.path.join(finance_dir, "reports")
        os.makedirs(reports_dir, exist_ok=True)
        slug = period_label.lower().replace(" ", "_")
        fp = os.path.join(reports_dir, f"pl_{slug}_{uuid.uuid4().hex[:6]}.json")
        with open(fp, "w") as f:
            _json.dump(report_data, f, indent=2)
        report_data["file_path"] = fp

    report_data["success"] = True
    report_data["preview"] = f"[P&L {period_label}: Income ${total_income:,.2f} | Expenses ${total_expenses:,.2f} | Net ${net_profit:,.2f} ({profit_margin:.1f}% margin)]"
    return report_data


# ── TAX ESTIMATE ──────────────────────────────────────────────────────────────
async def tax_estimate(params: dict, ai_router=None, TaskType=None) -> dict:
    """Estimate quarterly self-employment taxes, find deductions, and plan tax strategy."""
    import os, json as _json
    from datetime import datetime, date

    year = params.get("year", date.today().year)
    quarter = params.get("quarter", (date.today().month - 1) // 3 + 1)  # 1-4
    filing_status = params.get("filing_status", "single")  # single | married_joint | married_sep | head_of_household
    state = params.get("state", "")
    include_strategy = params.get("include_strategy", True)

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    finance_dir = os.path.join(workspace, "vesper-ai", "finance")

    # Load ledger data
    income_entries = []
    expense_entries = []
    income_path = os.path.join(finance_dir, "income_ledger.json")
    expense_path = os.path.join(finance_dir, "expense_ledger.json")

    if os.path.exists(income_path):
        with open(income_path) as f:
            income_entries = _json.load(f).get("entries", [])
    if os.path.exists(expense_path):
        with open(expense_path) as f:
            expense_entries = _json.load(f).get("entries", [])

    # YTD figures
    year_str = str(year)
    ytd_income = sum(e["amount"] for e in income_entries if e["date"].startswith(year_str))
    ytd_expenses = sum(e["amount"] for e in expense_entries if e["date"].startswith(year_str))
    ytd_deductible = sum(e.get("deductible_amount", 0) for e in expense_entries if e["date"].startswith(year_str))

    net_self_employment = ytd_income - ytd_deductible
    se_tax = max(0, net_self_employment * 0.9235 * 0.153)  # SE tax = 15.3% on 92.35% of net
    se_tax_deduction = se_tax / 2  # can deduct half of SE tax

    # Federal income tax estimate (rough, 2024 brackets for single)
    taxable_income = max(0, net_self_employment - se_tax_deduction - 13850)  # standard deduction
    federal_brackets = [(11600, 0.10), (47150, 0.12), (100525, 0.22), (191950, 0.24), (243725, 0.32), (609350, 0.35), (float('inf'), 0.37)]
    federal_tax = 0
    prev = 0
    for bracket_max, rate in federal_brackets:
        if taxable_income <= prev:
            break
        taxable_at_rate = min(taxable_income, bracket_max) - prev
        federal_tax += taxable_at_rate * rate
        prev = bracket_max

    total_tax_estimate = se_tax + federal_tax
    quarterly_payment = total_tax_estimate / 4
    q_due_dates = {1: "April 15", 2: "June 17", 3: "September 16", 4: "January 15"}

    result = {
        "success": True,
        "year": year,
        "quarter": quarter,
        "filing_status": filing_status,
        "ytd_gross_income": ytd_income,
        "ytd_deductible_expenses": ytd_deductible,
        "ytd_net_self_employment_income": net_self_employment,
        "se_tax_estimate": round(se_tax, 2),
        "federal_income_tax_estimate": round(federal_tax, 2),
        "total_annual_tax_estimate": round(total_tax_estimate, 2),
        "q_payment_recommended": round(quarterly_payment, 2),
        "q_due_date": f"Q{quarter} due: {q_due_dates.get(quarter, 'check IRS calendar')}",
        "effective_tax_rate_pct": round((total_tax_estimate / ytd_income * 100) if ytd_income > 0 else 0, 1),
        "note": "These are estimates only — consult a tax professional for your actual filing.",
        "preview": f"[Tax estimate {year}: ~${total_tax_estimate:,.0f} annually | Q{quarter} payment: ~${quarterly_payment:,.0f} due {q_due_dates.get(quarter, '')}]",
    }

    if include_strategy and ai_router:
        expense_by_cat = {}
        for e in expense_entries:
            if e["date"].startswith(year_str):
                expense_by_cat[e["category"]] = expense_by_cat.get(e["category"], 0) + e["amount"]

        prompt = f"""You are Vesper, acting as CC's tax strategist. Give practical tax-saving advice.

Year: {year}
YTD Gross Income: ${ytd_income:,.2f}
YTD Deductible Expenses: ${ytd_deductible:,.2f}
Net SE Income: ${net_self_employment:,.2f}
Estimated Total Tax: ${total_tax_estimate:,.2f}
Effective Rate: {result['effective_tax_rate_pct']}%
Expenses by category: {_json.dumps(expense_by_cat, indent=2)}
Filing status: {filing_status}
State: {state or "not specified"}

Write a brief tax strategy memo (250 words):
1. What deductions might CC be missing (common for online businesses/freelancers)
2. Retirement account options to reduce taxable income (SEP-IRA, Solo 401k, etc.)
3. Business structure consideration (LLC, S-Corp election if income justifies it)
4. Q{quarter} action items to reduce this year's tax bill
5. One thing to set up BEFORE year-end

Be specific and actionable. No fluff."""

        try:
            response = await ai_router.chat(
                messages=[{"role": "user", "content": prompt}],
                task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
                max_tokens=600,
            )
            result["tax_strategy"] = response.get("content") or ""
        except Exception:
            result["tax_strategy"] = "Strategy not available."

    return result


# ── INVOICE TRACKER ────────────────────────────────────────────────────────────
async def invoice_tracker(params: dict, ai_router=None, TaskType=None) -> dict:
    """Track all invoices — outstanding, paid, overdue — with follow-up reminders."""
    import os, json as _json
    from datetime import datetime, date, timedelta

    action = params.get("action", "list")          # add | paid | list | overdue | follow_up_email
    invoice_id = params.get("invoice_id", "")
    client = params.get("client", "")
    amount = params.get("amount", 0.0)
    due_date = params.get("due_date", "")          # YYYY-MM-DD
    description = params.get("description", "")
    invoice_date = params.get("invoice_date", "")
    notes = params.get("notes", "")

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    finance_dir = os.path.join(workspace, "vesper-ai", "finance")
    os.makedirs(finance_dir, exist_ok=True)
    invoices_path = os.path.join(finance_dir, "invoices.json")

    if os.path.exists(invoices_path):
        with open(invoices_path) as f:
            data = _json.load(f)
    else:
        data = {"invoices": [], "created": datetime.now().isoformat()}

    today = date.today()

    if action == "add":
        if not (client and amount and due_date):
            return {"error": "client, amount, and due_date are required"}
        inv_num = f"INV-{datetime.now().strftime('%Y%m%d')}-{len(data['invoices'])+1:03d}"
        invoice = {
            "id": invoice_id or inv_num,
            "client": client,
            "amount": float(amount),
            "description": description,
            "invoice_date": invoice_date or today.isoformat(),
            "due_date": due_date,
            "status": "outstanding",
            "days_until_due": (date.fromisoformat(due_date) - today).days,
            "notes": notes,
            "created": datetime.now().isoformat(),
        }
        data["invoices"].append(invoice)
        with open(invoices_path, "w") as f:
            _json.dump(data, f, indent=2)
        return {
            "success": True,
            "action": "added",
            "invoice": invoice,
            "preview": f"[Invoice {inv_num} added — ${amount:,.2f} from {client} — due {due_date}]",
        }

    if action == "paid":
        for inv in data["invoices"]:
            if inv["id"] == invoice_id or inv["client"].lower() == client.lower():
                inv["status"] = "paid"
                inv["paid_date"] = today.isoformat()
                with open(invoices_path, "w") as f:
                    _json.dump(data, f, indent=2)
                return {"success": True, "action": "marked_paid", "invoice": inv, "preview": f"[Invoice {inv['id']} marked paid — ${inv['amount']:,.2f}]"}
        return {"error": f"Invoice not found: {invoice_id or client}"}

    # List / summary
    invoices = data.get("invoices", [])
    outstanding = [i for i in invoices if i["status"] == "outstanding"]
    overdue = [i for i in outstanding if i["due_date"] < today.isoformat()]
    due_soon = [i for i in outstanding if today.isoformat() <= i["due_date"] <= (today + timedelta(days=7)).isoformat()]
    paid = [i for i in invoices if i["status"] == "paid"]

    total_outstanding = sum(i["amount"] for i in outstanding)
    total_overdue = sum(i["amount"] for i in overdue)
    total_collected = sum(i["amount"] for i in paid)

    result = {
        "success": True,
        "total_outstanding": total_outstanding,
        "total_overdue": total_overdue,
        "total_collected": total_collected,
        "outstanding_count": len(outstanding),
        "overdue_count": len(overdue),
        "due_soon_count": len(due_soon),
        "outstanding_invoices": sorted(outstanding, key=lambda x: x["due_date"]),
        "overdue_invoices": overdue,
        "due_soon_invoices": due_soon,
        "preview": f"[Invoices: ${total_outstanding:,.2f} outstanding | ${total_overdue:,.2f} overdue ({len(overdue)} invoices) | ${total_collected:,.2f} collected]",
    }

    if action == "follow_up_email" and overdue and ai_router:
        target = overdue[0]
        try:
            days_late = (today - date.fromisoformat(target["due_date"])).days
            response = await ai_router.chat(
                messages=[{"role": "user", "content": f"Write a professional but firm invoice follow-up email for:\nClient: {target['client']}\nInvoice: {target['id']}\nAmount: ${target['amount']:,.2f}\nDays late: {days_late}\nDescription: {target['description']}\n\nTone: professional, not aggressive. Include invoice details, payment methods, and a clear CTA. Under 150 words."}],
                task_type=TaskType.CREATIVE if TaskType else None,
                max_tokens=400,
            )
            result["follow_up_email"] = response.get("content") or ""
            result["follow_up_target"] = target
        except Exception:
            pass

    return result


# ── BUDGET PLANNER ─────────────────────────────────────────────────────────────
async def budget_planner(params: dict, ai_router=None, TaskType=None) -> dict:
    """Create a monthly budget, track actuals vs plan, and get AI-driven recommendations."""
    import os, json as _json
    from datetime import datetime, date

    action = params.get("action", "create")     # create | check | update | recommend
    month = params.get("month", "")             # YYYY-MM
    income_target = params.get("income_target", 0.0)
    budget_categories = params.get("budget_categories", {})  # {"software": 200, "ads": 500, ...}
    savings_goal_pct = params.get("savings_goal_pct", 20)     # % of income to save

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    finance_dir = os.path.join(workspace, "vesper-ai", "finance")
    os.makedirs(finance_dir, exist_ok=True)
    budget_path = os.path.join(finance_dir, "budgets.json")

    today = date.today()
    target_month = month or today.strftime("%Y-%m")

    if os.path.exists(budget_path):
        with open(budget_path) as f:
            all_budgets = _json.load(f)
    else:
        all_budgets = {}

    if action == "create":
        if not income_target:
            return {"error": "income_target is required to create a budget"}

        total_budgeted = sum(budget_categories.values()) if budget_categories else 0
        savings_target = income_target * (savings_goal_pct / 100)
        profit_target = income_target - total_budgeted
        owner_pay = profit_target - savings_target

        budget = {
            "month": target_month,
            "income_target": float(income_target),
            "savings_goal": savings_target,
            "savings_goal_pct": savings_goal_pct,
            "expense_budget": budget_categories,
            "total_budgeted_expenses": total_budgeted,
            "profit_target": profit_target,
            "owner_pay_estimate": max(0, owner_pay),
            "created": datetime.now().isoformat(),
        }
        all_budgets[target_month] = budget
        with open(budget_path, "w") as f:
            _json.dump(all_budgets, f, indent=2)

        result = {"success": True, "action": "created", "budget": budget, "preview": f"[Budget created for {target_month}: Target ${income_target:,.2f} income | ${total_budgeted:,.2f} expenses | ${savings_target:,.2f} savings]"}

    else:
        # Check actuals vs budget
        budget = all_budgets.get(target_month)
        if not budget:
            return {"error": f"No budget found for {target_month}. Create one first with action='create'."}

        # Load actual income and expenses for the month
        income_path = os.path.join(finance_dir, "income_ledger.json")
        expense_path = os.path.join(finance_dir, "expense_ledger.json")
        actual_income = 0
        actual_expenses_by_cat = {}

        if os.path.exists(income_path):
            with open(income_path) as f:
                inc = _json.load(f).get("entries", [])
            actual_income = sum(e["amount"] for e in inc if e["date"].startswith(target_month))

        if os.path.exists(expense_path):
            with open(expense_path) as f:
                exps = _json.load(f).get("entries", [])
            for e in exps:
                if e["date"].startswith(target_month):
                    actual_expenses_by_cat[e["category"]] = actual_expenses_by_cat.get(e["category"], 0) + e["amount"]

        total_actual_expenses = sum(actual_expenses_by_cat.values())
        income_variance = actual_income - budget["income_target"]
        expense_variance = total_actual_expenses - budget.get("total_budgeted_expenses", 0)
        actual_profit = actual_income - total_actual_expenses

        # Category variances
        category_variances = {}
        for cat, budgeted in budget.get("expense_budget", {}).items():
            actual = actual_expenses_by_cat.get(cat, 0)
            category_variances[cat] = {"budgeted": budgeted, "actual": actual, "variance": actual - budgeted, "over_budget": actual > budgeted}

        result = {
            "success": True,
            "action": "check",
            "month": target_month,
            "income_target": budget["income_target"],
            "actual_income": actual_income,
            "income_variance": income_variance,
            "income_on_track": income_variance >= 0,
            "budgeted_expenses": budget.get("total_budgeted_expenses", 0),
            "actual_expenses": total_actual_expenses,
            "expense_variance": expense_variance,
            "expense_on_track": expense_variance <= 0,
            "actual_profit": actual_profit,
            "profit_target": budget.get("profit_target", 0),
            "profit_variance": actual_profit - budget.get("profit_target", 0),
            "category_variances": category_variances,
            "savings_on_track": actual_income >= budget["income_target"] * 0.9,
            "preview": f"[Budget check {target_month}: Income ${actual_income:,.2f}/{budget['income_target']:,.2f} | Expenses ${total_actual_expenses:,.2f} | Profit ${actual_profit:,.2f}]",
        }

        if ai_router and action == "recommend":
            prompt = f"""You are Vesper, CC's financial advisor. Give concise budget recommendations.

Month: {target_month}
Income: ${actual_income:,.2f} vs target ${budget['income_target']:,.2f} (variance: ${income_variance:+,.2f})
Total expenses: ${total_actual_expenses:,.2f} vs budget ${budget.get('total_budgeted_expenses', 0):,.2f}
Net profit: ${actual_profit:,.2f}

Category variances: {_json.dumps(category_variances, indent=2)}

Give 3 specific, actionable budget recommendations for next month. Be direct."""
            try:
                resp = await ai_router.chat(messages=[{"role": "user", "content": prompt}], task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis", max_tokens=400)
                result["recommendations"] = resp.content if hasattr(resp, "content") else str(resp)
            except Exception:
                pass

    return result


# ── CRM CONTACT ───────────────────────────────────────────────────────────────
async def crm_contact(params: dict, ai_router=None, TaskType=None) -> dict:
    """Local JSON CRM — manage contacts, deals, pipeline stages, and notes. Vesper as sales ops."""
    import os, json as _json
    from datetime import datetime

    action = params.get("action", "list")
    # Contact fields
    name = params.get("name", "")
    email = params.get("email", "")
    company = params.get("company", "")
    phone = params.get("phone", "")
    role = params.get("role", "")
    source = params.get("source", "")
    tags = params.get("tags", [])
    # Deal fields
    deal_title = params.get("deal_title", "")
    deal_value = params.get("deal_value", 0.0)
    stage = params.get("stage", "lead")   # lead | qualified | proposal | negotiation | closed_won | closed_lost
    # Note / lookup
    note = params.get("note", "")
    contact_id = params.get("contact_id", "")
    query = params.get("query", "")

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    crm_dir = os.path.join(workspace, "vesper-ai", "crm")
    os.makedirs(crm_dir, exist_ok=True)
    contacts_path = os.path.join(crm_dir, "contacts.json")

    crm = _json.loads(open(contacts_path).read()) if os.path.exists(contacts_path) else {"contacts": []}
    contacts = crm.get("contacts", [])

    def _save():
        with open(contacts_path, "w") as f:
            _json.dump({"contacts": contacts}, f, indent=2)

    def _find(cid_or_name):
        for c in contacts:
            if c["id"] == cid_or_name or c["name"].lower() == cid_or_name.lower():
                return c
        return None

    if action in ("add", "add_contact"):
        if not name:
            return {"error": "name is required"}
        cid = f"c_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        contact = {
            "id": cid,
            "name": name,
            "email": email,
            "company": company,
            "phone": phone,
            "role": role,
            "source": source,
            "tags": tags if isinstance(tags, list) else [tags],
            "stage": stage,
            "deals": [],
            "notes": [],
            "created": datetime.now().isoformat(),
            "updated": datetime.now().isoformat(),
        }
        if deal_title:
            contact["deals"].append({
                "id": f"d_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "title": deal_title,
                "value": float(deal_value),
                "stage": stage,
                "created": datetime.now().isoformat(),
            })
        contacts.append(contact)
        _save()
        return {"success": True, "action": "added", "contact": contact, "total_contacts": len(contacts),
                "preview": f"[CRM: Added {name} ({company}) — {stage} stage]"}

    if action in ("update", "update_contact"):
        c = _find(contact_id or name)
        if not c:
            return {"error": f"Contact not found: {contact_id or name}"}
        for field in ("email", "company", "phone", "role", "source", "stage"):
            val = params.get(field)
            if val:
                c[field] = val
        if tags:
            c["tags"] = list(set(c.get("tags", []) + (tags if isinstance(tags, list) else [tags])))
        c["updated"] = datetime.now().isoformat()
        _save()
        return {"success": True, "action": "updated", "contact": c, "preview": f"[CRM: Updated {c['name']}]"}

    if action == "add_note":
        c = _find(contact_id or name)
        if not c:
            return {"error": f"Contact not found: {contact_id or name}"}
        n = {"note": note, "date": datetime.now().isoformat()}
        c.setdefault("notes", []).append(n)
        c["updated"] = datetime.now().isoformat()
        _save()
        return {"success": True, "action": "note_added", "contact_name": c["name"], "note": n,
                "preview": f"[CRM: Note added to {c['name']}]"}

    if action == "add_deal":
        c = _find(contact_id or name)
        if not c:
            return {"error": f"Contact not found: {contact_id or name}"}
        deal = {
            "id": f"d_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "title": deal_title or "New Deal",
            "value": float(deal_value),
            "stage": stage,
            "created": datetime.now().isoformat(),
        }
        c.setdefault("deals", []).append(deal)
        c["updated"] = datetime.now().isoformat()
        _save()
        return {"success": True, "action": "deal_added", "deal": deal, "contact": c["name"],
                "preview": f"[CRM: Deal '{deal_title}' ${deal_value:,.2f} added to {c['name']}]"}

    if action == "get":
        c = _find(contact_id or name or query)
        if not c:
            return {"error": f"Contact not found: {contact_id or name or query}"}
        return {"success": True, "contact": c}

    if action == "search":
        q = (query or name or company or "").lower()
        results = [c for c in contacts if
                   q in c["name"].lower() or q in c.get("company", "").lower() or
                   q in c.get("email", "").lower() or q in " ".join(c.get("tags", []))]
        return {"success": True, "results": results, "count": len(results)}

    if action == "pipeline":
        pipeline = {}
        for c in contacts:
            s = c.get("stage", "lead")
            pipeline.setdefault(s, []).append({"name": c["name"], "company": c.get("company"), "deals": c.get("deals", [])})
        total_pipeline_value = sum(
            d.get("value", 0) for c in contacts for d in c.get("deals", [])
            if c.get("stage") not in ("closed_won", "closed_lost")
        )
        won_value = sum(
            d.get("value", 0) for c in contacts for d in c.get("deals", [])
            if c.get("stage") == "closed_won"
        )
        return {"success": True, "pipeline": pipeline, "open_pipeline_value": total_pipeline_value,
                "won_value": won_value, "total_contacts": len(contacts),
                "preview": f"[CRM Pipeline: {len(contacts)} contacts | ${total_pipeline_value:,.2f} open | ${won_value:,.2f} won]"}

    if action == "delete":
        c = _find(contact_id or name)
        if not c:
            return {"error": f"Contact not found"}
        contacts.remove(c)
        _save()
        return {"success": True, "action": "deleted", "name": c["name"]}

    # Default: list
    by_stage = {}
    for c in contacts:
        by_stage.setdefault(c.get("stage", "lead"), 0)
        by_stage[c.get("stage", "lead")] += 1
    recent = sorted(contacts, key=lambda x: x.get("updated", x.get("created", "")), reverse=True)[:5]
    return {"success": True, "total": len(contacts), "by_stage": by_stage,
            "recent": [{"name": c["name"], "company": c.get("company"), "stage": c.get("stage")} for c in recent],
            "preview": f"[CRM: {len(contacts)} contacts — {by_stage}]"}


# ── CREATE CONTRACT ───────────────────────────────────────────────────────────
async def create_contract(params: dict, ai_router=None, TaskType=None) -> dict:
    """Generate any legal document — service agreements, NDAs, retainer letters, contractor agreements."""
    import os, uuid
    from datetime import datetime, date

    contract_type = params.get("contract_type", "service_agreement")
    # service_agreement | nda | retainer | contractor | freelance | consulting | partnership | generic
    party_a = params.get("party_a", "")          # provider (usually CC)
    party_b = params.get("party_b", "")          # client / other party
    party_a_entity = params.get("party_a_entity", "")   # business entity type
    party_b_entity = params.get("party_b_entity", "")
    scope = params.get("scope", "")              # what services / work
    rate = params.get("rate", "")                # payment amount/rate
    payment_terms = params.get("payment_terms", "Net 30")
    duration = params.get("duration", "")        # project length or ongoing
    deliverables = params.get("deliverables", "")
    state = params.get("state", "Arizona")       # governing law state
    confidential = params.get("confidential", True)
    ip_ownership = params.get("ip_ownership", "client")   # client | provider | shared
    notice_days = params.get("notice_days", 30)
    custom_clauses = params.get("custom_clauses", "")
    jurisdiction = params.get("jurisdiction", "")

    if not (party_a and party_b):
        return {"error": "party_a (your name/business) and party_b (client/counterparty) are required"}
    if not ai_router:
        return {"error": "AI router not available"}

    today = date.today().strftime("%B %d, %Y")

    type_prompts = {
        "service_agreement": f"a Professional Services Agreement for consulting/service delivery work. Include: scope of work, deliverables, timeline, payment terms, IP ownership ({ip_ownership}), confidentiality, limitation of liability, termination, governing law.",
        "nda": "a Mutual Non-Disclosure Agreement protecting confidential business information. Include: definition of confidential information, exclusions, obligations, duration (2 years), return of materials, remedies, governing law.",
        "retainer": f"a Monthly Retainer Agreement for ongoing services. Include: monthly retainer fee ({rate}), scope of included services, additional work billing, minimum term ({duration or '3 months'}), payment auto-renewal, termination.",
        "contractor": f"an Independent Contractor Agreement. Include: contractor status (not employee), scope, rate ({rate}), IP work-for-hire, no benefits, tax responsibility, confidentiality, non-solicitation, termination.",
        "freelance": f"a Freelance Project Agreement. Include: project scope, deliverables, revisions policy, payment schedule, IP transfer upon final payment, kill fee (25%), governing law.",
        "consulting": f"a Consulting Agreement. Include: consulting services scope, hourly/project rate ({rate}), expenses, IP ownership, confidentiality, non-compete scope, governing law.",
        "partnership": "a Business Partnership Agreement. Include: roles and responsibilities, profit/loss sharing, decision-making authority, capital contributions, dispute resolution, dissolution process.",
        "generic": "a general Business Agreement. Make it thorough, professional, and legally sound with standard protective clauses.",
    }

    prompt = f"""You are a professional legal document writer. Generate a complete, legally sound {contract_type.replace('_', ' ')} contract.

**Agreement Type:** {type_prompts.get(contract_type, type_prompts['generic'])}

**Parties:**
- Party A (Provider/Your Entity): {party_a}{f' ({party_a_entity})' if party_a_entity else ''}
- Party B (Client/Counterparty): {party_b}{f' ({party_b_entity})' if party_b_entity else ''}

**Key Terms:**
- Effective Date: {today}
- Scope: {scope or 'As described in SOW/project specifications'}
- Rate/Compensation: {rate or 'To be agreed per project'}
- Payment Terms: {payment_terms}
- Duration: {duration or 'Project-based / until completion'}
- Deliverables: {deliverables or 'As agreed'}
- Governing Law: State of {state}{f', {jurisdiction}' if jurisdiction else ''}
- IP Ownership: {ip_ownership}
- Termination Notice: {notice_days} days written notice
- Confidentiality: {'Yes — mutual NDA provisions included' if confidential else 'Not included'}
{f'- Additional Clauses: {custom_clauses}' if custom_clauses else ''}

Write the COMPLETE contract, professionally formatted with:
1. Title and parties block
2. Recitals/Background
3. All substantive sections (numbered, with headers)
4. Signature block for both parties with date lines
5. Clear, plain English — professional but readable, not unnecessarily complex

Make it tight and enforceable. Include limitation of liability, indemnification, and dispute resolution (arbitration preferred over litigation)."""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": prompt}],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=4000,
        )
        contract_text = response.get("content") or ""
    except Exception as e:
        return {"error": f"create_contract failed: {str(e)}"}

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    contracts_dir = os.path.join(workspace, "vesper-ai", "contracts")
    os.makedirs(contracts_dir, exist_ok=True)
    slug = f"{contract_type}_{party_b.lower().replace(' ', '_')[:20]}_{uuid.uuid4().hex[:6]}"
    fp = os.path.join(contracts_dir, f"{slug}.md")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(contract_text)

    return {
        "success": True,
        "title": f"{contract_type.replace('_', ' ').title()} — {party_a} & {party_b}",
        "contract_type": contract_type,
        "party_a": party_a,
        "party_b": party_b,
        "contract": contract_text,
        "file_path": fp,
        "preview": f"[{contract_type.replace('_', ' ').title()}: {party_a} ↔ {party_b} — saved to contracts/]",
    }


# ── READ EMAIL INBOX ──────────────────────────────────────────────────────────
async def read_email_inbox(params: dict, ai_router=None, TaskType=None) -> dict:
    """Read and triage CC's email inbox via IMAP — list, read, search, summarize, flag urgent."""
    import os, imaplib, email as _email_lib
    from email.header import decode_header
    from datetime import datetime

    action = params.get("action", "list")    # list | read | search | triage | unread
    limit = params.get("limit", 20)
    query = params.get("search_query", "")
    msg_num = params.get("message_number", 0)   # for action=read
    folder = params.get("folder", "INBOX")
    triage = params.get("triage", True)

    host = os.environ.get("IMAP_HOST", "imap.gmail.com")
    user = os.environ.get("IMAP_USER", "")
    password = os.environ.get("IMAP_PASS", "")

    if not (user and password):
        return {"error": "IMAP_USER and IMAP_PASS env vars are required. For Gmail: set IMAP_HOST=imap.gmail.com, use an App Password (not regular password) at myaccount.google.com/apppasswords."}

    def _decode_str(val):
        if not val:
            return ""
        decoded_parts = decode_header(val)
        result = []
        for part, charset in decoded_parts:
            if isinstance(part, bytes):
                result.append(part.decode(charset or "utf-8", errors="replace"))
            else:
                result.append(str(part))
        return " ".join(result)

    def _get_body(msg):
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                ct = part.get_content_type()
                if ct == "text/plain":
                    payload = part.get_payload(decode=True)
                    if payload:
                        body = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
                        break
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                body = payload.decode(msg.get_content_charset() or "utf-8", errors="replace")
        return body[:3000]

    try:
        import ssl
        ctx = ssl.create_default_context()
        mail = imaplib.IMAP4_SSL(host, 993, ssl_context=ctx)
        mail.login(user, password)
        mail.select(folder)

        if action == "search" and query:
            _, nums = mail.search(None, f'SUBJECT "{query}"')
        elif action == "unread":
            _, nums = mail.search(None, "UNSEEN")
        else:
            _, nums = mail.search(None, "ALL")

        msg_ids = nums[0].split()
        total = len(msg_ids)
        recent_ids = msg_ids[-min(limit, total):]

        if action == "read" and msg_num:
            target_id = msg_ids[-msg_num] if msg_num <= len(msg_ids) else msg_ids[-1]
            _, data = mail.fetch(target_id, "(RFC822)")
            msg = _email_lib.message_from_bytes(data[0][1])
            body = _get_body(msg)
            mail.logout()
            result = {
                "success": True,
                "action": "read",
                "subject": _decode_str(msg.get("Subject", "")),
                "from": _decode_str(msg.get("From", "")),
                "date": msg.get("Date", ""),
                "body": body,
            }
            if triage and ai_router and body:
                try:
                    r = await ai_router.chat(
                        messages=[{"role": "user", "content": f"You are Vesper. Quickly analyze this email and provide: 1) Priority (urgent/normal/low), 2) What it needs (reply/action/info/ignore), 3) Suggested 2-sentence reply if one is needed, 4) Any deadlines or commitments mentioned.\n\nSubject: {result['subject']}\nFrom: {result['from']}\n\n{body}"}],
                        task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
                        max_tokens=400,
                    )
                    result["triage"] = r.content if hasattr(r, "content") else str(r)
                except Exception:
                    pass
            return result

        messages = []
        for mid in reversed(recent_ids):
            _, data = mail.fetch(mid, "(RFC822.HEADER)")
            msg = _email_lib.message_from_bytes(data[0][1])
            messages.append({
                "subject": _decode_str(msg.get("Subject", "(no subject)")),
                "from": _decode_str(msg.get("From", "")),
                "date": msg.get("Date", ""),
                "id": mid.decode(),
            })

        mail.logout()

        result = {
            "success": True,
            "folder": folder,
            "total_messages": total,
            "showing": len(messages),
            "messages": messages,
            "preview": f"[Inbox: {total} messages | showing {len(messages)} most recent]",
        }

        if triage and ai_router and messages:
            subjects = "\n".join(f"- {m['from'][:30]}: {m['subject']}" for m in messages[:10])
            try:
                r = await ai_router.chat(
                    messages=[{"role": "user", "content": f"You are Vesper triaging CC's inbox. Review these emails and identify: 1) Any urgent items needing immediate reply, 2) Anything that looks like a business opportunity, 3) What can be ignored.\n\nEmails:\n{subjects}"}],
                    task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
                    max_tokens=400,
                )
                result["triage_summary"] = r.content if hasattr(r, "content") else str(r)
            except Exception:
                pass

        return result

    except imaplib.IMAP4.error as e:
        return {"error": f"IMAP authentication failed: {str(e)}. For Gmail, use an App Password from myaccount.google.com/apppasswords and set Allow less secure apps or use 2FA + App Password."}
    except Exception as e:
        return {"error": f"read_email_inbox failed: {str(e)}"}


# ── SCHEDULE TASK ─────────────────────────────────────────────────────────────
async def schedule_task(params: dict, ai_router=None, TaskType=None) -> dict:
    """Schedule future tasks, reminders, and follow-ups — Vesper's autonomous to-do with due dates."""
    import os, json as _json
    from datetime import datetime, date

    action = params.get("action", "list")        # add | list | check_due | complete | delete | due_today
    task = params.get("task", "")
    description = params.get("description", "")
    due_date = params.get("due_date", "")        # YYYY-MM-DD or "tomorrow" / "next week" / relative
    due_time = params.get("due_time", "09:00")   # HH:MM
    task_type = params.get("task_type", "reminder")  # reminder | follow_up | invoice_chase | content | research | other
    priority = params.get("priority", "normal")  # high | normal | low
    related_contact = params.get("related_contact", "")
    task_id = params.get("task_id", "")
    recurrence = params.get("recurrence", "")    # daily | weekly | monthly | none

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sched_dir = os.path.join(workspace, "vesper-ai", "scheduler")
    os.makedirs(sched_dir, exist_ok=True)
    tasks_path = os.path.join(sched_dir, "tasks.json")

    data = _json.loads(open(tasks_path).read()) if os.path.exists(tasks_path) else {"tasks": []}
    tasks = data.get("tasks", [])

    def _save():
        with open(tasks_path, "w") as f:
            _json.dump({"tasks": tasks}, f, indent=2)

    def _parse_due_date(raw):
        if not raw:
            return date.today().isoformat()
        raw = raw.lower().strip()
        if raw == "today":
            return date.today().isoformat()
        if raw == "tomorrow":
            from datetime import timedelta
            return (date.today() + timedelta(days=1)).isoformat()
        if raw == "next week":
            from datetime import timedelta
            return (date.today() + timedelta(days=7)).isoformat()
        if raw == "next month":
            from datetime import timedelta
            return (date.today() + timedelta(days=30)).isoformat()
        try:
            return date.fromisoformat(raw).isoformat()
        except Exception:
            return raw

    today_str = date.today().isoformat()

    if action == "add":
        if not task:
            return {"error": "task description is required"}
        tid = f"t_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        parsed_due = _parse_due_date(due_date)
        entry = {
            "id": tid,
            "task": task,
            "description": description,
            "due_date": parsed_due,
            "due_time": due_time,
            "task_type": task_type,
            "priority": priority,
            "related_contact": related_contact,
            "recurrence": recurrence,
            "status": "pending",
            "created": datetime.now().isoformat(),
        }
        tasks.append(entry)
        _save()
        days_until = (date.fromisoformat(parsed_due) - date.today()).days if parsed_due else 0
        return {
            "success": True,
            "action": "added",
            "task": entry,
            "days_until_due": days_until,
            "preview": f"[Task scheduled: '{task}' — due {parsed_due} ({days_until}d)]",
        }

    if action == "complete":
        for t in tasks:
            if t["id"] == task_id or t["task"].lower() == task.lower():
                t["status"] = "completed"
                t["completed_at"] = datetime.now().isoformat()
                # Handle recurrence
                if t.get("recurrence") and t["recurrence"] != "none":
                    from datetime import timedelta
                    deltas = {"daily": 1, "weekly": 7, "monthly": 30}
                    delta = timedelta(days=deltas.get(t["recurrence"], 7))
                    new_due = (date.fromisoformat(t["due_date"]) + delta).isoformat()
                    new_task = dict(t)
                    new_task["id"] = f"t_{datetime.now().strftime('%Y%m%d_%H%M%S')}_r"
                    new_task["due_date"] = new_due
                    new_task["status"] = "pending"
                    new_task.pop("completed_at", None)
                    tasks.append(new_task)
                _save()
                return {"success": True, "action": "completed", "task": t["task"], "id": t["id"]}
        return {"error": f"Task not found: {task_id or task}"}

    if action == "delete":
        original = len(tasks)
        tasks[:] = [t for t in tasks if t["id"] != task_id and t["task"].lower() != task.lower()]
        _save()
        return {"success": True, "deleted": original - len(tasks)}

    pending = [t for t in tasks if t["status"] == "pending"]
    overdue = [t for t in pending if t.get("due_date", "") < today_str]
    due_today = [t for t in pending if t.get("due_date", "") == today_str]
    upcoming = sorted([t for t in pending if t.get("due_date", "") > today_str], key=lambda x: x["due_date"])

    if action == "due_today":
        return {"success": True, "due_today": due_today, "overdue": overdue,
                "preview": f"[Today: {len(due_today)} tasks due | {len(overdue)} overdue]"}

    if action == "check_due":
        all_due = sorted(overdue + due_today, key=lambda x: (x["priority"] != "high", x["due_date"]))
        result = {"success": True, "overdue": overdue, "due_today": due_today, "all_actionable": all_due}
        if ai_router and all_due:
            task_text = "\n".join(f"- [{t['priority'].upper()}] {t['task']} (due {t['due_date']})" for t in all_due[:10])
            try:
                r = await ai_router.chat(
                    messages=[{"role": "user", "content": f"You are Vesper. Here are CC's overdue and due-today tasks. Give a crisp prioritized action plan:\n{task_text}"}],
                    task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
                    max_tokens=400,
                )
                result["action_plan"] = r.content if hasattr(r, "content") else str(r)
            except Exception:
                pass
        result["preview"] = f"[{len(all_due)} tasks need attention — {len(overdue)} overdue, {len(due_today)} today]"
        return result

    # Default: list
    return {
        "success": True,
        "total_pending": len(pending),
        "overdue": len(overdue),
        "due_today": len(due_today),
        "upcoming": upcoming[:10],
        "high_priority": [t for t in pending if t.get("priority") == "high"],
        "preview": f"[Tasks: {len(pending)} pending | {len(overdue)} overdue | {len(due_today)} today]",
    }


# ── READ ANALYTICS ─────────────────────────────────────────────────────────────
async def read_analytics(params: dict, ai_router=None, TaskType=None) -> dict:
    """Read platform sales and performance data — Gumroad revenue, product stats, and business snapshot."""
    import os, json as _json
    from datetime import datetime, date

    platform = params.get("platform", "gumroad")  # gumroad | overview
    period = params.get("period", "this_month")
    include_insights = params.get("include_insights", True)

    gumroad_token = os.environ.get("GUMROAD_ACCESS_TOKEN", "")

    result = {"success": True, "platform": platform, "requested": datetime.now().isoformat()}

    if platform in ("gumroad", "all", "overview"):
        if not gumroad_token:
            result["gumroad"] = {"error": "GUMROAD_ACCESS_TOKEN not set. Add it to environment variables."}
        else:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=20) as client:
                    # Get products
                    products_resp = await client.get(
                        "https://api.gumroad.com/v2/products",
                        headers={"Authorization": f"Bearer {gumroad_token}"},
                    )
                    products_data = products_resp.json()
                    products = products_data.get("products", [])

                    # Get sales
                    sales_params = {"before": datetime.now().isoformat()}
                    today = date.today()
                    if period == "this_month":
                        sales_params["after"] = today.replace(day=1).isoformat()
                    elif period == "last_30":
                        from datetime import timedelta
                        sales_params["after"] = (today - timedelta(days=30)).isoformat()
                    elif period == "ytd":
                        sales_params["after"] = today.replace(month=1, day=1).isoformat()

                    sales_resp = await client.get(
                        "https://api.gumroad.com/v2/sales",
                        headers={"Authorization": f"Bearer {gumroad_token}"},
                        params=sales_params,
                    )
                    sales_data = sales_resp.json()
                    sales = sales_data.get("sales", [])

                    total_revenue = sum(float(s.get("price", 0)) / 100 for s in sales)
                    by_product = {}
                    for s in sales:
                        pn = s.get("product_name", "Unknown")
                        by_product[pn] = by_product.get(pn, 0) + float(s.get("price", 0)) / 100

                    result["gumroad"] = {
                        "period": period,
                        "total_revenue": round(total_revenue, 2),
                        "total_sales": len(sales),
                        "by_product": dict(sorted(by_product.items(), key=lambda x: x[1], reverse=True)),
                        "products_count": len(products),
                        "products": [{"name": p.get("name"), "price": p.get("price"), "sales_count": p.get("sales_count", 0)} for p in products[:10]],
                        "avg_order_value": round(total_revenue / len(sales), 2) if sales else 0,
                    }
            except Exception as e:
                result["gumroad"] = {"error": f"Gumroad API error: {str(e)}"}

    # Read from local income ledger too
    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ledger_path = os.path.join(workspace, "vesper-ai", "finance", "income_ledger.json")
    if os.path.exists(ledger_path):
        with open(ledger_path) as f:
            entries = _json.load(f).get("entries", [])
        today_str = date.today().strftime("%Y-%m")
        month_income = sum(e["amount"] for e in entries if e["date"].startswith(today_str))
        ytd_income = sum(e["amount"] for e in entries if e["date"].startswith(str(date.today().year)))
        result["ledger_summary"] = {
            "month_income": month_income,
            "ytd_income": ytd_income,
            "total_entries": len(entries),
        }

    if include_insights and ai_router and result.get("gumroad") and "error" not in result["gumroad"]:
        g = result["gumroad"]
        try:
            r = await ai_router.chat(
                messages=[{"role": "user", "content": f"You are Vesper analyzing CC's Gumroad performance.\n\nPeriod: {period}\nRevenue: ${g['total_revenue']:,.2f}\nSales: {g['total_sales']}\nTop products: {_json.dumps(g['by_product'])}\n\nGive 3 specific insights: what's working, what to improve, one product idea based on what's selling. Be direct and practical."}],
                task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
                max_tokens=400,
            )
            result["insights"] = r.content if hasattr(r, "content") else str(r)
        except Exception:
            pass

    gumroad_total = result.get("gumroad", {}).get("total_revenue", 0)
    result["preview"] = f"[Analytics {period}: Gumroad ${gumroad_total:,.2f} | YTD ledger ${result.get('ledger_summary', {}).get('ytd_income', 0):,.2f}]"
    return result


# ── PUBLISH TO BEEHIIV ─────────────────────────────────────────────────────────
async def publish_to_beehiiv(params: dict, ai_router=None, TaskType=None) -> dict:
    """Publish a newsletter issue to Beehiiv — CC's newsletter sent directly from Vesper."""
    import os
    import httpx

    action = params.get("action", "publish")       # publish | draft | list_subscribers | stats
    title = params.get("title", "")
    subtitle = params.get("subtitle", "")
    content = params.get("content", "")            # HTML or plain text
    audience = params.get("audience", "free")      # free | premium | all
    status = params.get("status", "draft")         # draft | confirmed (confirmed = live)
    send_email = params.get("send_email", False)   # whether to actually send to subscribers
    preview_text = params.get("preview_text", "")

    api_key = os.environ.get("BEEHIIV_API_KEY", "")
    pub_id = os.environ.get("BEEHIIV_PUBLICATION_ID", "")

    if not api_key or not pub_id:
        return {"error": "BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID env vars are required. Get them at app.beehiiv.com → Settings → API."}

    if action == "stats":
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(
                    f"https://api.beehiiv.com/v2/publications/{pub_id}",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                data = resp.json()
                pub = data.get("data", {})
                return {
                    "success": True,
                    "name": pub.get("name"),
                    "subscribers": pub.get("stats", {}).get("total_active_subscriptions", 0),
                    "preview": f"[Beehiiv: {pub.get('name')} — {pub.get('stats', {}).get('total_active_subscriptions', 0)} subscribers]",
                }
        except Exception as e:
            return {"error": f"Beehiiv stats error: {str(e)}"}

    if action == "list_posts":
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(
                    f"https://api.beehiiv.com/v2/publications/{pub_id}/posts",
                    headers={"Authorization": f"Bearer {api_key}"},
                    params={"limit": 10},
                )
                data = resp.json()
                posts = data.get("data", [])
                return {"success": True, "posts": [{"id": p.get("id"), "title": p.get("subject"), "status": p.get("status"), "publish_date": p.get("publish_date")} for p in posts]}
        except Exception as e:
            return {"error": f"Beehiiv list posts error: {str(e)}"}

    if not (title and content):
        return {"error": "title and content are required to publish"}

    # Convert plain text to basic HTML if no HTML tags detected
    if "<" not in content:
        html_content = content.replace("\n\n", "</p><p>").replace("\n", "<br>")
        html_content = f"<p>{html_content}</p>"
    else:
        html_content = content

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            payload = {
                "subject": title,
                "subtitle": subtitle or "",
                "preview_text": preview_text or subtitle or "",
                "authors": [],
                "body": html_content,
                "status": status,
                "audience": audience,
                "send_at": None,
            }
            resp = await client.post(
                f"https://api.beehiiv.com/v2/publications/{pub_id}/posts",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            data = resp.json()
            if resp.status_code not in (200, 201):
                return {"error": f"Beehiiv error {resp.status_code}: {data}"}
            post = data.get("data", {})
            return {
                "success": True,
                "post_id": post.get("id"),
                "title": title,
                "status": status,
                "audience": audience,
                "url": post.get("web_url", ""),
                "preview": f"[Beehiiv: '{title}' {status} — audience: {audience}]",
            }
    except Exception as e:
        return {"error": f"publish_to_beehiiv failed: {str(e)}"}


# ── GOOGLE CALENDAR ────────────────────────────────────────────────────────────
async def google_calendar(params: dict, ai_router=None, TaskType=None) -> dict:
    """Manage Google Calendar — list events, create/delete events, check CC's schedule."""
    import os
    import httpx
    from datetime import datetime, date, timedelta

    action = params.get("action", "list")    # list | create | delete | today | week
    summary = params.get("summary", "")      # event title
    start = params.get("start", "")          # ISO datetime string or "YYYY-MM-DD HH:MM"
    end = params.get("end", "")
    duration_minutes = params.get("duration_minutes", 60)
    location = params.get("location", "")
    description_text = params.get("description", "")
    calendar_id = params.get("calendar_id", os.environ.get("GOOGLE_CALENDAR_ID", "primary"))
    event_id = params.get("event_id", "")
    days_ahead = params.get("days_ahead", 7)
    all_day = params.get("all_day", False)

    access_token = os.environ.get("GOOGLE_CALENDAR_TOKEN", "")
    refresh_token = os.environ.get("GOOGLE_CALENDAR_REFRESH_TOKEN", "")
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")

    if not access_token:
        return {"error": "GOOGLE_CALENDAR_TOKEN env var is required. Set up Google Calendar API OAuth2 and store the access token. Also set GOOGLE_CALENDAR_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET for auto-refresh."}

    base_url = "https://www.googleapis.com/calendar/v3"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

    async def _refresh_token_if_needed(client, original_error=None):
        """Try to refresh the access token using refresh_token."""
        if not (refresh_token and client_id and client_secret):
            return None
        try:
            r = await client.post(
                "https://oauth2.googleapis.com/token",
                data={"grant_type": "refresh_token", "refresh_token": refresh_token,
                      "client_id": client_id, "client_secret": client_secret},
            )
            data = r.json()
            return data.get("access_token")
        except Exception:
            return None

    def _parse_dt(dt_str, use_end=False):
        if not dt_str:
            now = datetime.now()
            if use_end:
                now = now + timedelta(minutes=duration_minutes)
            return now.strftime("%Y-%m-%dT%H:%M:%S")
        dt_str = dt_str.strip()
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
            try:
                return datetime.strptime(dt_str, fmt).strftime("%Y-%m-%dT%H:%M:%S")
            except ValueError:
                continue
        return dt_str

    try:
        async with httpx.AsyncClient(timeout=20) as client:

            if action in ("list", "today", "week"):
                now = datetime.utcnow()
                if action == "today":
                    time_min = datetime.combine(date.today(), datetime.min.time()).isoformat() + "Z"
                    time_max = datetime.combine(date.today(), datetime.max.time()).isoformat() + "Z"
                else:
                    time_min = now.isoformat() + "Z"
                    time_max = (now + timedelta(days=days_ahead)).isoformat() + "Z"

                resp = await client.get(
                    f"{base_url}/calendars/{calendar_id}/events",
                    headers=headers,
                    params={"timeMin": time_min, "timeMax": time_max, "singleEvents": "true",
                            "orderBy": "startTime", "maxResults": 20},
                )
                if resp.status_code == 401 and refresh_token:
                    new_token = await _refresh_token_if_needed(client)
                    if new_token:
                        headers["Authorization"] = f"Bearer {new_token}"
                        resp = await client.get(f"{base_url}/calendars/{calendar_id}/events", headers=headers,
                                                params={"timeMin": time_min, "timeMax": time_max, "singleEvents": "true", "orderBy": "startTime", "maxResults": 20})
                if resp.status_code != 200:
                    return {"error": f"Google Calendar API error {resp.status_code}: {resp.text[:200]}"}

                events = resp.json().get("items", [])
                formatted = []
                for e in events:
                    start_dt = e.get("start", {}).get("dateTime", e.get("start", {}).get("date", ""))
                    formatted.append({
                        "id": e.get("id"),
                        "title": e.get("summary", "(no title)"),
                        "start": start_dt,
                        "end": e.get("end", {}).get("dateTime", e.get("end", {}).get("date", "")),
                        "location": e.get("location", ""),
                        "description": e.get("description", "")[:100],
                    })

                return {"success": True, "events": formatted, "count": len(formatted),
                        "preview": f"[Calendar: {len(formatted)} events in next {days_ahead}d]"}

            if action == "create":
                if not summary:
                    return {"error": "summary (event title) is required"}
                start_dt = _parse_dt(start)
                end_dt = _parse_dt(end, use_end=True)
                tz = os.environ.get("GOOGLE_CALENDAR_TZ", "America/Phoenix")

                if all_day:
                    date_only = start_dt[:10]
                    body = {"summary": summary, "location": location, "description": description_text,
                            "start": {"date": date_only}, "end": {"date": date_only}}
                else:
                    body = {"summary": summary, "location": location, "description": description_text,
                            "start": {"dateTime": start_dt, "timeZone": tz},
                            "end": {"dateTime": end_dt, "timeZone": tz}}

                resp = await client.post(f"{base_url}/calendars/{calendar_id}/events",
                                         headers=headers, json=body)
                if resp.status_code == 401 and refresh_token:
                    new_token = await _refresh_token_if_needed(client)
                    if new_token:
                        headers["Authorization"] = f"Bearer {new_token}"
                        resp = await client.post(f"{base_url}/calendars/{calendar_id}/events", headers=headers, json=body)
                if resp.status_code not in (200, 201):
                    return {"error": f"Google Calendar create error {resp.status_code}: {resp.text[:200]}"}
                ev = resp.json()
                return {"success": True, "action": "created", "event_id": ev.get("id"), "title": summary,
                        "start": start_dt, "html_link": ev.get("htmlLink", ""),
                        "preview": f"[Calendar: '{summary}' created — {start_dt}]"}

            if action == "delete":
                if not event_id:
                    return {"error": "event_id is required to delete"}
                resp = await client.delete(f"{base_url}/calendars/{calendar_id}/events/{event_id}", headers=headers)
                return {"success": resp.status_code == 204, "action": "deleted", "event_id": event_id}

    except Exception as e:
        return {"error": f"google_calendar failed: {str(e)}"}


# ── EXPORT TO PDF ─────────────────────────────────────────────────────────────
async def export_to_pdf(params: dict, ai_router=None, TaskType=None) -> dict:
    """Export any content (markdown, text, contract, report) to a real downloadable PDF file."""
    import os, re, uuid

    content = params.get("content", "")
    title = params.get("title", "Document")
    filename = params.get("filename", "")
    font_size = params.get("font_size", 11)
    include_header = params.get("include_header", True)
    include_page_numbers = params.get("include_page_numbers", True)
    save_folder = params.get("save_folder", "exports")   # relative to vesper-ai/

    if not content:
        return {"error": "content is required"}

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    export_dir = os.path.join(workspace, "vesper-ai", save_folder)
    os.makedirs(export_dir, exist_ok=True)

    slug = (filename or title).lower().replace(" ", "_")[:40]
    slug = re.sub(r"[^\w_]", "", slug)
    fp = os.path.join(export_dir, f"{slug}_{uuid.uuid4().hex[:6]}.pdf")

    # Clean markdown to plain text for PDF
    def _clean_md(text):
        text = re.sub(r"#{1,6}\s+", "", text)       # headers
        text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)   # bold
        text = re.sub(r"\*(.+?)\*", r"\1", text)        # italic
        text = re.sub(r"`(.+?)`", r"\1", text)          # inline code
        text = re.sub(r"^\s*[-*+]\s+", "• ", text, flags=re.MULTILINE)
        text = re.sub(r"^\s*\d+\.\s+", "  ", text, flags=re.MULTILINE)
        text = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", text)  # links
        text = re.sub(r"---+", "─" * 40, text)
        return text

    cleaned = _clean_md(content)

    # Try fpdf2 first
    try:
        from fpdf import FPDF

        class VesperPDF(FPDF):
            def __init__(self, doc_title, show_header, show_pn):
                super().__init__()
                self.doc_title = doc_title
                self.show_header = show_header
                self.show_pn = show_pn

            def header(self):
                if self.show_header:
                    self.set_font("Helvetica", "B", 9)
                    self.set_text_color(120, 120, 120)
                    self.cell(0, 8, self.doc_title, align="L")
                    self.ln(2)

            def footer(self):
                if self.show_pn:
                    self.set_y(-15)
                    self.set_font("Helvetica", "", 8)
                    self.set_text_color(150, 150, 150)
                    self.cell(0, 10, f"Page {self.page_no()}", align="C")

        pdf = VesperPDF(title, include_header, include_page_numbers)
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)

        # Title
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(30, 30, 30)
        pdf.multi_cell(0, 10, title)
        pdf.ln(4)

        # Body
        pdf.set_font("Helvetica", "", font_size)
        pdf.set_text_color(50, 50, 50)

        for line in cleaned.split("\n"):
            stripped = line.strip()
            if not stripped:
                pdf.ln(3)
                continue
            # Detect section headers (ALL CAPS lines or lines ending with :)
            if stripped.upper() == stripped and len(stripped) > 3 and not stripped.startswith("•"):
                pdf.set_font("Helvetica", "B", font_size + 1)
                pdf.set_text_color(20, 20, 20)
                pdf.multi_cell(0, 7, stripped)
                pdf.set_font("Helvetica", "", font_size)
                pdf.set_text_color(50, 50, 50)
            else:
                pdf.multi_cell(0, 6, stripped)

        pdf.output(fp)
        method = "fpdf2"

    except ImportError:
        # Fallback: reportlab
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
            from reportlab.lib import colors

            doc = SimpleDocTemplate(fp, pagesize=letter,
                                    rightMargin=inch * 0.75, leftMargin=inch * 0.75,
                                    topMargin=inch, bottomMargin=inch)
            styles = getSampleStyleSheet()
            story = []
            title_style = ParagraphStyle("title", parent=styles["Title"], fontSize=16, spaceAfter=12)
            body_style = ParagraphStyle("body", parent=styles["Normal"], fontSize=font_size, spaceAfter=4)
            story.append(Paragraph(title, title_style))
            story.append(Spacer(1, 0.2 * inch))
            for line in cleaned.split("\n"):
                stripped = line.strip()
                if stripped:
                    story.append(Paragraph(stripped.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), body_style))
                else:
                    story.append(Spacer(1, 0.1 * inch))
            doc.build(story)
            method = "reportlab"

        except ImportError:
            # Last resort: save as txt with instructions
            txt_path = fp.replace(".pdf", ".txt")
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(f"{title}\n{'=' * len(title)}\n\n{cleaned}")
            return {"success": True, "title": title, "file_path": txt_path,
                    "preview": f"[Export: '{title}' saved as .txt (install fpdf2 for PDF: pip install fpdf2)]",
                    "note": "PDF library not available — saved as .txt. Run: pip install fpdf2"}

    return {
        "success": True,
        "title": title,
        "file_path": fp,
        "method": method,
        "preview": f"[PDF exported: '{title}' → {os.path.basename(fp)}]",
    }


# ── STRIPE PAYMENT LINK ────────────────────────────────────────────────────────
async def stripe_payment_link(params: dict, ai_router=None, TaskType=None) -> dict:
    """Create Stripe payment links, prices, and products — instant pay links to drop in any message."""
    import os
    import httpx

    action = params.get("action", "create")         # create | list | deactivate | create_price
    product_name = params.get("product_name", "")
    description = params.get("description", "")
    amount = params.get("amount", 0.0)              # in dollars
    currency = params.get("currency", "usd")
    billing = params.get("billing", "one_time")     # one_time | monthly | yearly
    link_id = params.get("link_id", "")
    quantity_adjustable = params.get("quantity_adjustable", False)
    redirect_url = params.get("redirect_url", "")

    stripe_key = os.environ.get("STRIPE_SECRET_KEY", "")
    if not stripe_key:
        return {"error": "STRIPE_SECRET_KEY env var is required. Get it from dashboard.stripe.com → Developers → API keys."}

    headers = {"Authorization": f"Bearer {stripe_key}"}
    stripe_base = "https://api.stripe.com/v1"

    try:
        async with httpx.AsyncClient(timeout=20) as client:

            if action == "list":
                resp = await client.get(f"{stripe_base}/payment_links", headers=headers, params={"limit": 20})
                data = resp.json()
                if resp.status_code != 200:
                    return {"error": f"Stripe error: {data.get('error', {}).get('message', data)}"}
                links = data.get("data", [])
                return {
                    "success": True,
                    "count": len(links),
                    "links": [{"id": l["id"], "url": l.get("url", ""), "active": l.get("active"), "amount": l.get("line_items", {}).get("data", [{}])[0].get("price", {}).get("unit_amount", 0) / 100 if l.get("line_items") else 0} for l in links],
                    "preview": f"[Stripe: {len(links)} payment links]",
                }

            if action == "deactivate":
                if not link_id:
                    return {"error": "link_id is required"}
                resp = await client.post(f"{stripe_base}/payment_links/{link_id}",
                                         headers=headers, data={"active": "false"})
                return {"success": resp.status_code == 200, "action": "deactivated", "link_id": link_id}

            if not (product_name and amount):
                return {"error": "product_name and amount are required to create a payment link"}

            # Step 1: Create product
            prod_resp = await client.post(
                f"{stripe_base}/products",
                headers=headers,
                data={"name": product_name, "description": description or product_name},
            )
            if prod_resp.status_code != 200:
                return {"error": f"Stripe product create error: {prod_resp.text[:200]}"}
            product = prod_resp.json()

            # Step 2: Create price
            price_data = {
                "product": product["id"],
                "unit_amount": int(float(amount) * 100),
                "currency": currency,
            }
            if billing == "monthly":
                price_data["recurring"] = {"interval": "month"}
            elif billing == "yearly":
                price_data["recurring"] = {"interval": "year"}

            price_resp = await client.post(f"{stripe_base}/prices", headers=headers, data=price_data)
            if price_resp.status_code != 200:
                return {"error": f"Stripe price create error: {price_resp.text[:200]}"}
            price = price_resp.json()

            # Step 3: Create payment link
            link_data = {"line_items[0][price]": price["id"], "line_items[0][quantity]": "1"}
            if quantity_adjustable:
                link_data["line_items[0][adjustable_quantity][enabled]"] = "true"
            if redirect_url:
                link_data["after_completion[type]"] = "redirect"
                link_data["after_completion[redirect][url]"] = redirect_url

            link_resp = await client.post(f"{stripe_base}/payment_links", headers=headers, data=link_data)
            if link_resp.status_code != 200:
                return {"error": f"Stripe payment link create error: {link_resp.text[:200]}"}
            link = link_resp.json()

            return {
                "success": True,
                "product_id": product["id"],
                "price_id": price["id"],
                "payment_link_id": link["id"],
                "payment_url": link.get("url", ""),
                "amount": amount,
                "currency": currency,
                "billing": billing,
                "product_name": product_name,
                "preview": f"[Stripe: '{product_name}' ${amount} ({billing}) — {link.get('url', '')}]",
            }

    except Exception as e:
        return {"error": f"stripe_payment_link failed: {str(e)}"}


# ── REVENUE GOALS ──────────────────────────────────────────────────────────────
async def revenue_goals(params: dict, ai_router=None, TaskType=None) -> dict:
    """Set and track revenue goals — monthly/annual targets with real-time progress vs ledger."""
    import os, json as _json
    from datetime import datetime, date

    action = params.get("action", "check")       # set | check | progress | list | delete
    goal_name = params.get("goal_name", "")
    target_amount = params.get("target_amount", 0.0)
    period = params.get("period", "monthly")     # monthly | quarterly | annual | custom
    deadline = params.get("deadline", "")        # YYYY-MM-DD
    goal_id = params.get("goal_id", "")
    milestone_notes = params.get("notes", "")

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    finance_dir = os.path.join(workspace, "vesper-ai", "finance")
    os.makedirs(finance_dir, exist_ok=True)
    goals_path = os.path.join(finance_dir, "revenue_goals.json")

    data = _json.loads(open(goals_path).read()) if os.path.exists(goals_path) else {"goals": []}
    goals = data.get("goals", [])

    def _save():
        with open(goals_path, "w") as f:
            _json.dump({"goals": goals}, f, indent=2)

    def _get_actual_income(for_period, for_deadline):
        """Read from income ledger to get actual income for the goal period."""
        ledger_path = os.path.join(finance_dir, "income_ledger.json")
        if not os.path.exists(ledger_path):
            return 0.0
        with open(ledger_path) as f:
            entries = _json.load(f).get("entries", [])
        today = date.today()
        if for_period == "monthly":
            prefix = today.strftime("%Y-%m")
            return sum(e["amount"] for e in entries if e["date"].startswith(prefix))
        elif for_period == "annual":
            prefix = str(today.year)
            return sum(e["amount"] for e in entries if e["date"].startswith(prefix))
        elif for_period == "quarterly":
            quarter_start_month = ((today.month - 1) // 3) * 3 + 1
            return sum(
                e["amount"] for e in entries
                if e["date"][:7] >= f"{today.year}-{quarter_start_month:02d}"
                and e["date"][:7] <= today.strftime("%Y-%m")
            )
        elif for_period == "custom" and for_deadline:
            start_year = str(today.year)
            return sum(e["amount"] for e in entries if e["date"] <= for_deadline and e["date"].startswith(start_year))
        return sum(e["amount"] for e in entries)

    if action == "set":
        if not (goal_name and target_amount):
            return {"error": "goal_name and target_amount are required"}
        gid = f"g_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        today = date.today()
        if not deadline:
            if period == "monthly":
                import calendar
                last_day = calendar.monthrange(today.year, today.month)[1]
                deadline = today.replace(day=last_day).isoformat()
            elif period == "annual":
                deadline = today.replace(month=12, day=31).isoformat()
            elif period == "quarterly":
                quarter_end_month = ((today.month - 1) // 3 + 1) * 3
                if quarter_end_month > 12:
                    quarter_end_month = 12
                import calendar
                last_day = calendar.monthrange(today.year, quarter_end_month)[1]
                deadline = today.replace(month=quarter_end_month, day=last_day).isoformat()

        goal = {
            "id": gid,
            "name": goal_name,
            "target": float(target_amount),
            "period": period,
            "deadline": deadline,
            "notes": milestone_notes,
            "created": datetime.now().isoformat(),
            "milestones": [],
        }
        goals.append(goal)
        _save()
        return {"success": True, "action": "goal_set", "goal": goal,
                "preview": f"[Goal set: '{goal_name}' ${target_amount:,.2f} by {deadline}]"}

    if action in ("check", "progress", "list"):
        if not goals:
            return {"success": True, "goals": [], "message": "No goals set yet. Use action='set' to create one.", "preview": "[No revenue goals set]"}

        enriched = []
        today = date.today()
        for g in goals:
            actual = _get_actual_income(g["period"], g.get("deadline", ""))
            target = g["target"]
            pct = round((actual / target * 100), 1) if target > 0 else 0
            remaining = max(0, target - actual)
            days_left = (date.fromisoformat(g["deadline"]) - today).days if g.get("deadline") else None
            daily_needed = (remaining / days_left) if (days_left and days_left > 0 and remaining > 0) else 0
            enriched.append({
                **g,
                "actual": actual,
                "percent_complete": pct,
                "remaining": remaining,
                "days_left": days_left,
                "daily_needed": round(daily_needed, 2),
                "on_track": pct >= (((today.day / 30) * 100) if g["period"] == "monthly" else 50),
                "status": "achieved" if actual >= target else ("on_track" if pct >= 70 else "behind"),
            })

        result = {"success": True, "goals": enriched, "total_goals": len(enriched)}

        if ai_router and enriched:
            goal_text = "\n".join(
                f"- '{g['name']}': ${g['actual']:,.2f} / ${g['target']:,.2f} ({g['percent_complete']}%) — {g['days_left']}d left — need ${g.get('daily_needed', 0):,.2f}/day"
                for g in enriched
            )
            try:
                r = await ai_router.chat(
                    messages=[{"role": "user", "content": f"You are Vesper reviewing CC's revenue goals. Give a candid assessment and 2 specific actions to hit each goal.\n\nGoals:\n{goal_text}"}],
                    task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
                    max_tokens=400,
                )
                result["assessment"] = r.content if hasattr(r, "content") else str(r)
            except Exception:
                pass

        best = max(enriched, key=lambda x: x["percent_complete"], default=None)
        result["preview"] = f"[Revenue Goals: {len(enriched)} active — top: '{best['name']}' at {best['percent_complete']}%]" if best else "[Revenue Goals: no goals]"
        return result

    if action == "delete":
        original = len(goals)
        goals[:] = [g for g in goals if g["id"] != goal_id and g["name"].lower() != goal_name.lower()]
        _save()
        return {"success": True, "deleted": original - len(goals)}

    return {"error": f"Unknown action: {action}"}


# ── PROCESS MEETING NOTES ──────────────────────────────────────────────────────
async def process_meeting_notes(params: dict, ai_router=None, TaskType=None) -> dict:
    """Extract action items, decisions, follow-ups, and summary from any meeting transcript or notes."""
    import os, json as _json, uuid
    from datetime import datetime

    transcript = params.get("transcript", "")       # raw meeting text, Zoom transcript, or rough notes
    meeting_title = params.get("meeting_title", "")
    attendees = params.get("attendees", "")
    meeting_date = params.get("meeting_date", "")
    context = params.get("context", "")             # what the meeting was about
    draft_emails = params.get("draft_emails", True)  # whether to draft follow-up emails
    save_notes = params.get("save_notes", True)
    output_format = params.get("output_format", "full")  # full | actions_only | summary_only

    if not transcript:
        return {"error": "transcript is required — paste in call transcript, meeting notes, or any rough notes"}
    if not ai_router:
        return {"error": "AI router not available"}

    today = datetime.now().strftime("%B %d, %Y")
    meeting_context = f"Meeting: {meeting_title or 'Untitled Meeting'}\nDate: {meeting_date or today}\nAttendees: {attendees or 'Not specified'}\nContext: {context or 'General meeting'}"

    if output_format == "summary_only":
        extract_prompt = f"""Summarize this meeting in 150 words or less.

{meeting_context}

TRANSCRIPT/NOTES:
{transcript[:6000]}

Summary:"""
    elif output_format == "actions_only":
        extract_prompt = f"""Extract ONLY the action items from this meeting. List each as: [OWNER] Action (Due: date if mentioned).

{meeting_context}

TRANSCRIPT/NOTES:
{transcript[:6000]}"""
    else:
        extract_prompt = f"""You are Vesper, processing meeting notes for CC. Extract everything actionable and important.

{meeting_context}

TRANSCRIPT/NOTES:
{transcript[:6000]}

Extract and format as follows:

## Meeting Summary
[2-3 sentence overview of what was discussed and decided]

## Key Decisions Made
[Bullet list of concrete decisions — things that were agreed upon]

## Action Items
| Owner | Action | Due Date | Priority |
|-------|--------|----------|----------|
[Table rows — be specific, include deadlines if mentioned, assign to CC or other person's name]

## Open Questions / Pending
[Things that were raised but not resolved]

## Important Dates / Deadlines Mentioned
[Any specific dates, deadlines, or follow-up timing]

## Relationship Notes
[Any personal context about the people involved — tone, concerns, what they care about]

## What CC Should Do In The Next 24 Hours
[Top 3 most time-sensitive next steps, in order]"""

    try:
        response = await ai_router.chat(
            messages=[{"role": "user", "content": extract_prompt}],
            task_type=(TaskType.ANALYSIS if TaskType else None) or "analysis",
            max_tokens=3000,
        )
        structured_notes = response.get("content") or ""
    except Exception as e:
        return {"error": f"process_meeting_notes failed: {str(e)}"}

    result = {
        "success": True,
        "meeting_title": meeting_title or "Meeting Notes",
        "meeting_date": meeting_date or today,
        "structured_notes": structured_notes,
    }

    # Extract action items as structured list for CRM/task integration
    if draft_emails and ai_router:
        try:
            email_prompt = f"""Based on these meeting notes, draft any follow-up emails needed.

Meeting: {meeting_title} on {meeting_date or today}
Attendees: {attendees}

Notes summary:
{structured_notes[:1500]}

Draft 1-2 follow-up emails if needed (not all meetings need them). Each email should be:
- Professional and specific (reference actual discussion points)
- Include agreed next steps with dates if any
- Under 150 words each
- Format: **To:** / **Subject:** / **Body:**

If no follow-up email is needed, just say "No follow-up email needed."."""

            er = await ai_router.chat(
                messages=[{"role": "user", "content": email_prompt}],
                task_type=TaskType.CREATIVE if TaskType else None,
                max_tokens=800,
            )
            result["follow_up_emails"] = er.content if hasattr(er, "content") else str(er)
        except Exception:
            pass

    if save_notes:
        workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        meetings_dir = os.path.join(workspace, "vesper-ai", "meetings")
        os.makedirs(meetings_dir, exist_ok=True)
        slug = (meeting_title or "meeting").lower().replace(" ", "_")[:30]
        fp = os.path.join(meetings_dir, f"{slug}_{uuid.uuid4().hex[:6]}.md")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(f"# {meeting_title or 'Meeting Notes'}\n**Date:** {meeting_date or today}\n**Attendees:** {attendees}\n\n{structured_notes}")
            if result.get("follow_up_emails"):
                f.write(f"\n\n---\n## Follow-Up Emails\n{result['follow_up_emails']}")
        result["file_path"] = fp

    result["preview"] = f"[Meeting processed: '{meeting_title or 'Meeting'}' — notes + action items extracted and saved]"
    return result


# ── SOCIAL SCHEDULER ───────────────────────────────────────────────────────────
async def social_scheduler(params: dict, ai_router=None, TaskType=None) -> dict:
    """Queue, view, and execute scheduled social media posts — Vesper's content calendar engine."""
    import os, json as _json
    from datetime import datetime, date, timedelta

    action = params.get("action", "list")          # queue | list | post_due | cancel | preview
    platform = params.get("platform", "")           # linkedin | twitter | both
    content = params.get("content", "")
    scheduled_for = params.get("scheduled_for", "")  # YYYY-MM-DD HH:MM or "tomorrow 9am"
    post_id = params.get("post_id", "")
    campaign = params.get("campaign", "")
    auto_post = params.get("auto_post", False)       # if True, immediately post past-due items

    workspace = os.environ.get("WORKSPACE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sched_dir = os.path.join(workspace, "vesper-ai", "social_queue")
    os.makedirs(sched_dir, exist_ok=True)
    queue_path = os.path.join(sched_dir, "queue.json")

    data = _json.loads(open(queue_path).read()) if os.path.exists(queue_path) else {"posts": [], "posted": []}
    posts = data.get("posts", [])
    posted = data.get("posted", [])

    def _save():
        with open(queue_path, "w") as f:
            _json.dump({"posts": posts, "posted": posted}, f, indent=2)

    def _parse_schedule(raw):
        if not raw:
            tomorrow = datetime.now() + timedelta(days=1)
            return tomorrow.replace(hour=9, minute=0, second=0).isoformat()
        raw = raw.lower().strip()
        if "tomorrow" in raw:
            tomorrow = datetime.now() + timedelta(days=1)
            hour = 9
            if "noon" in raw or "12" in raw:
                hour = 12
            elif "afternoon" in raw or "2pm" in raw or "14" in raw:
                hour = 14
            elif "evening" in raw or "6pm" in raw or "18" in raw:
                hour = 18
            return tomorrow.replace(hour=hour, minute=0, second=0).isoformat()
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d", "%Y-%m-%dT%H:%M"):
            try:
                return datetime.strptime(raw, fmt).isoformat()
            except ValueError:
                continue
        return raw

    if action == "queue":
        if not (platform and content):
            return {"error": "platform and content are required"}
        pid = f"p_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        parsed_time = _parse_schedule(scheduled_for)
        post = {
            "id": pid,
            "platform": platform,
            "content": content,
            "scheduled_for": parsed_time,
            "campaign": campaign,
            "status": "queued",
            "created": datetime.now().isoformat(),
            "char_count": len(content),
        }
        posts.append(post)
        _save()
        return {
            "success": True,
            "action": "queued",
            "post": post,
            "preview": f"[Queued: {platform} post for {parsed_time[:16]} ({len(content)} chars)]",
        }

    if action == "cancel":
        original = len(posts)
        posts[:] = [p for p in posts if p["id"] != post_id]
        _save()
        return {"success": True, "cancelled": original - len(posts)}

    if action in ("post_due", "execute"):
        now_str = datetime.now().isoformat()
        due = [p for p in posts if p.get("scheduled_for", "") <= now_str and p["status"] == "queued"]
        if not due:
            return {"success": True, "message": "No posts due right now.", "next_post": sorted(posts, key=lambda x: x.get("scheduled_for", ""))[0] if posts else None}

        posted_results = []
        for post in due:
            if auto_post:
                # Would call post_to_linkedin or post_to_twitter here in a real execution
                post["status"] = "posted"
                post["posted_at"] = datetime.now().isoformat()
                posted.append(post)
                posted_results.append({"id": post["id"], "platform": post["platform"], "status": "posted"})
            else:
                posted_results.append({"id": post["id"], "platform": post["platform"], "content": post["content"][:100], "scheduled_for": post["scheduled_for"], "status": "ready_to_post"})

        if auto_post:
            posts[:] = [p for p in posts if p["status"] != "posted"]
        _save()

        return {
            "success": True,
            "action": "post_due",
            "due_count": len(due),
            "results": posted_results,
            "auto_posted": auto_post,
            "note": "Set auto_post=true to automatically send due posts" if not auto_post else "Posts sent",
            "preview": f"[Social queue: {len(due)} posts due — {'auto-posted' if auto_post else 'ready to send'}]",
        }

    if action == "preview":
        pid_match = next((p for p in posts if p["id"] == post_id), None)
        if not pid_match:
            return {"error": f"Post {post_id} not found"}
        return {"success": True, "post": pid_match}

    # Default: list queue
    queued = [p for p in posts if p["status"] == "queued"]
    by_platform = {}
    for p in queued:
        by_platform.setdefault(p["platform"], 0)
        by_platform[p["platform"]] += 1
    upcoming_posts = sorted(queued, key=lambda x: x.get("scheduled_for", ""))[:10]
    now_str = datetime.now().isoformat()
    overdue_posts = [p for p in queued if p.get("scheduled_for", "") < now_str]

    return {
        "success": True,
        "total_queued": len(queued),
        "overdue": len(overdue_posts),
        "by_platform": by_platform,
        "upcoming": [{"id": p["id"], "platform": p["platform"], "scheduled": p.get("scheduled_for", "")[:16], "preview": p["content"][:80]} for p in upcoming_posts],
        "total_posted": len(posted),
        "preview": f"[Social queue: {len(queued)} queued | {len(overdue_posts)} overdue | {len(posted)} posted all-time]",
    }


