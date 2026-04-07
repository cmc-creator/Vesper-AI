"""
Vesper Creative Income Tools
==============================
These tools let Vesper CREATE things and set up RESIDUAL INCOME streams for CC.
Books, songs, art, digital products — created autonomously and listed for sale.

Vesper generates the content. CC earns the royalties. Forever.
"""

import os
import json
import asyncio
import requests
import datetime
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
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
            {"role": "system", "content": "You are a professional author and publishing expert."},
            {"role": "user", "content": (
                f"Create a detailed {chapters}-chapter outline for a {genre} ebook.\n"
                f"Title: {title or 'TBD'}\nTopic: {topic}\n"
                f"Target audience: {target_audience}\nTone: {tone}\n\n"
                "Return JSON only:\n"
                '{"title": "...", "subtitle": "...", "tagline": "...", '
                '"target_audience": "...", "chapters": [{"number": 1, "title": "...", '
                '"summary": "...", "key_points": ["..."]}]}'
            )}
        ],
        task_type=TaskType.CREATIVE if TaskType else None,
        max_tokens=3000,
        temperature=0.7,
    )

    try:
        import re
        outline_text = outline_resp.get("content", "{}")
        json_match = re.search(r'\{.*\}', outline_text, re.DOTALL)
        outline = json.loads(json_match.group() if json_match else outline_text)
    except Exception:
        outline = {"title": title or topic, "subtitle": "", "chapters": []}

    final_title = outline.get("title", title or topic)

    # Step 2: Write the book chapter by chapter
    manuscript_parts = [
        f"# {final_title}\n",
        f"### {outline.get('subtitle', '')}\n\n" if outline.get("subtitle") else "",
        f"*By {author_name}*\n\n---\n\n",
    ]

    for ch in outline.get("chapters", [])[:chapters]:
        ch_resp = await ai_router.chat(
            messages=[
                {"role": "system", "content": f"You are writing a {genre} ebook. Tone: {tone}. Be thorough and valuable."},
                {"role": "user", "content": (
                    f"Write Chapter {ch.get('number', '?')}: {ch.get('title', '')}\n\n"
                    f"Summary: {ch.get('summary', '')}\n"
                    f"Key points to cover: {', '.join(ch.get('key_points', []))}\n\n"
                    f"Write approximately {words_per_chapter} words. Make it genuinely useful and engaging. "
                    "Use headers, bullet points where appropriate. No filler."
                )}
            ],
            task_type=TaskType.CREATIVE if TaskType else None,
            max_tokens=min(words_per_chapter * 2, 4096),
            temperature=0.75,
        )
        ch_text = ch_resp.get("content", "")
        manuscript_parts.append(f"\n## Chapter {ch.get('number', '?')}: {ch.get('title', '')}\n\n{ch_text}\n\n---\n")

    manuscript = "".join(manuscript_parts)

    # Save manuscript
    manuscript_path = os.path.join(save_dir, f"{slug}.md")
    with open(manuscript_path, "w", encoding="utf-8") as f:
        f.write(manuscript)

    # Step 3: Generate KDP / publishing metadata
    meta_resp = await ai_router.chat(
        messages=[
            {"role": "system", "content": "You are a publishing expert specializing in Amazon KDP."},
            {"role": "user", "content": (
                f"Generate Amazon KDP metadata for this ebook:\n"
                f"Title: {final_title}\nTopic: {topic}\nGenre: {genre}\n"
                f"Audience: {target_audience}\n\n"
                "Return JSON only:\n"
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

    try:
        meta_text = meta_resp.get("content", "{}")
        json_match = re.search(r'\{.*\}', meta_text, re.DOTALL)
        metadata = json.loads(json_match.group() if json_match else meta_text)
    except Exception:
        metadata = {}

    # Save metadata
    meta_path = os.path.join(save_dir, f"{slug}_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump({"title": final_title, "outline": outline, "metadata": metadata,
                   "created": datetime.datetime.now().isoformat()}, f, indent=2)

    word_count = len(manuscript.split())

    return {
        "success": True,
        "title": final_title,
        "subtitle": outline.get("subtitle", ""),
        "word_count": word_count,
        "chapters": len(outline.get("chapters", [])),
        "manuscript_path": manuscript_path,
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
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(f"# {song_title}\n\n{song_content}\n\n---\nCreated: {datetime.datetime.now().isoformat()}")

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
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(f"# Income Stream Plan: {niche or stream_type}\n\n{plan}\n\n---\nGenerated: {datetime.datetime.now().isoformat()}")

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
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(f"# Content Calendar — {brand}\n\n{calendar}")

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
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(proposal)

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
