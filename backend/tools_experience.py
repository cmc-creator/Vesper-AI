"""
Vesper Human Experience Tools
==============================
These tools help Vesper understand and explore what being human means —
music, art, food, cosmos, stories, culture, knowledge, local life.

All marked (FREE) require no API key.
Keys that ARE needed are read from environment variables.
"""

import os
import json
import asyncio
import requests
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# NASA — THE COSMOS  (FREE, uses DEMO_KEY — 30 req/hour)
# ─────────────────────────────────────────────────────────────────────────────

async def nasa_apod(params: dict) -> dict:
    """Astronomy Picture of the Day + optional date lookup."""
    key = os.getenv("NASA_API_KEY", "DEMO_KEY")
    date = params.get("date", "")  # YYYY-MM-DD, empty = today
    count = int(params.get("count", 1))  # get N random ones if > 1
    try:
        p = {"api_key": key, "thumbs": True}
        if count > 1:
            p["count"] = min(count, 10)
        elif date:
            p["date"] = date
        r = requests.get("https://api.nasa.gov/planetary/apod", params=p, timeout=15)
        r.raise_for_status()
        data = r.json()
        if isinstance(data, list):
            return {"success": True, "pictures": data, "count": len(data)}
        return {"success": True, "title": data.get("title"), "date": data.get("date"),
                "explanation": data.get("explanation"), "url": data.get("url"),
                "media_type": data.get("media_type"), "hdurl": data.get("hdurl")}
    except Exception as e:
        return {"error": str(e)}


async def nasa_search(params: dict) -> dict:
    """Search NASA image & video library."""
    q = params.get("query", "")
    media = params.get("media_type", "image")  # image | video | audio
    limit = min(int(params.get("limit", 10)), 20)
    try:
        r = requests.get(
            "https://images-api.nasa.gov/search",
            params={"q": q, "media_type": media},
            timeout=15
        )
        r.raise_for_status()
        items = r.json().get("collection", {}).get("items", [])[:limit]
        results = []
        for item in items:
            d = item.get("data", [{}])[0]
            links = item.get("links", [{}])
            results.append({
                "title": d.get("title"),
                "description": d.get("description", "")[:300],
                "date": d.get("date_created"),
                "center": d.get("center"),
                "thumb": links[0].get("href") if links else None,
            })
        return {"success": True, "results": results, "count": len(results), "query": q}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# WIKIPEDIA — DEEP KNOWLEDGE  (FREE)
# ─────────────────────────────────────────────────────────────────────────────

async def wikipedia_search(params: dict) -> dict:
    """Search Wikipedia and return article summaries."""
    query = params.get("query", "")
    limit = min(int(params.get("limit", 5)), 10)
    full = params.get("full_article", False)
    try:
        # Search
        sr = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={"action": "query", "list": "search", "srsearch": query,
                    "srlimit": limit, "format": "json"},
            timeout=15
        )
        results = sr.json().get("query", {}).get("search", [])
        if not results:
            return {"error": f"No Wikipedia results for '{query}'"}

        articles = []
        for r in results[:limit]:
            title = r["title"]
            # Get summary
            sr2 = requests.get(
                f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(title)}",
                timeout=10
            )
            if sr2.status_code == 200:
                d = sr2.json()
                article = {
                    "title": d.get("title"),
                    "summary": d.get("extract", ""),
                    "url": d.get("content_urls", {}).get("desktop", {}).get("page"),
                    "thumbnail": d.get("thumbnail", {}).get("source"),
                }
                if full and len(results) == 1:
                    # Get full text for single article
                    fr = requests.get(
                        "https://en.wikipedia.org/w/api.php",
                        params={"action": "query", "titles": title, "prop": "extracts",
                                "explaintext": True, "format": "json"},
                        timeout=15
                    )
                    pages = fr.json().get("query", {}).get("pages", {})
                    full_text = next(iter(pages.values()), {}).get("extract", "")
                    article["full_text"] = full_text[:15000]
                articles.append(article)

        return {"success": True, "articles": articles, "count": len(articles)}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# OPEN LIBRARY — BOOKS & LITERATURE  (FREE)
# ─────────────────────────────────────────────────────────────────────────────

async def book_search(params: dict) -> dict:
    """Search books, get details, read free texts from Open Library & Gutenberg."""
    query = params.get("query", "")
    author = params.get("author", "")
    subject = params.get("subject", "")
    limit = min(int(params.get("limit", 10)), 20)
    try:
        search_params = {"limit": limit, "format": "json"}
        if query:
            search_params["q"] = query
        if author:
            search_params["author"] = author
        if subject:
            search_params["subject"] = subject

        r = requests.get("https://openlibrary.org/search.json", params=search_params, timeout=15)
        r.raise_for_status()
        docs = r.json().get("docs", [])[:limit]
        books = []
        for d in docs:
            books.append({
                "title": d.get("title"),
                "author": d.get("author_name", ["Unknown"])[0] if d.get("author_name") else "Unknown",
                "year": d.get("first_publish_year"),
                "subjects": d.get("subject", [])[:5],
                "languages": d.get("language", [])[:3],
                "open_library_url": f"https://openlibrary.org{d.get('key', '')}",
                "cover_url": f"https://covers.openlibrary.org/b/id/{d['cover_i']}-M.jpg" if d.get("cover_i") else None,
                "has_full_text": d.get("has_fulltext", False),
                "ia_id": d.get("ia", [None])[0] if d.get("ia") else None,
            })
        return {"success": True, "books": books, "count": len(books), "total_found": r.json().get("numFound", 0)}
    except Exception as e:
        return {"error": str(e)}


async def gutenberg_search(params: dict) -> dict:
    """Search and retrieve texts from Project Gutenberg (free classic literature)."""
    query = params.get("query", "")
    topic = params.get("topic", "")
    limit = min(int(params.get("limit", 10)), 20)
    try:
        search = query or topic
        r = requests.get(
            "https://gutendex.com/books/",
            params={"search": search, "mime_type": "text/plain"},
            timeout=15
        )
        r.raise_for_status()
        results = r.json().get("results", [])[:limit]
        books = []
        for b in results:
            formats = b.get("formats", {})
            text_url = formats.get("text/plain; charset=utf-8") or formats.get("text/plain")
            books.append({
                "id": b.get("id"),
                "title": b.get("title"),
                "authors": [a.get("name") for a in b.get("authors", [])],
                "subjects": b.get("subjects", [])[:5],
                "download_count": b.get("download_count"),
                "text_url": text_url,
                "cover_url": formats.get("image/jpeg"),
            })
        return {"success": True, "books": books, "count": len(books)}
    except Exception as e:
        return {"error": str(e)}


async def read_book_excerpt(params: dict) -> dict:
    """Read an excerpt from a Gutenberg text (first N characters)."""
    text_url = params.get("text_url", "")
    chars = min(int(params.get("chars", 3000)), 15000)
    if not text_url:
        return {"error": "text_url required"}
    try:
        r = requests.get(text_url, timeout=20)
        r.raise_for_status()
        text = r.text
        # Skip Gutenberg header boilerplate
        start_markers = ["*** START OF", "*** START OF THE PROJECT"]
        for marker in start_markers:
            idx = text.find(marker)
            if idx != -1:
                text = text[idx + len(marker):].lstrip()
                break
        return {"success": True, "excerpt": text[:chars], "total_chars": len(text)}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# ART INSTITUTE OF CHICAGO  (FREE, no key needed)
# ─────────────────────────────────────────────────────────────────────────────

async def art_search(params: dict) -> dict:
    """Search the Art Institute of Chicago's collection (50,000+ works, free API)."""
    query = params.get("query", "")
    artist = params.get("artist", "")
    style = params.get("style", "")
    limit = min(int(params.get("limit", 10)), 20)
    try:
        q = " ".join(filter(None, [query, artist, style])) or "impressionism"
        r = requests.get(
            "https://api.artic.edu/api/v1/artworks/search",
            params={"q": q, "limit": limit,
                    "fields": "id,title,artist_display,date_display,medium_display,style_title,image_id,description,place_of_origin,dimensions"},
            timeout=15
        )
        r.raise_for_status()
        artworks = r.json().get("data", [])
        results = []
        for a in artworks:
            img_id = a.get("image_id")
            results.append({
                "title": a.get("title"),
                "artist": a.get("artist_display"),
                "date": a.get("date_display"),
                "medium": a.get("medium_display"),
                "style": a.get("style_title"),
                "origin": a.get("place_of_origin"),
                "dimensions": a.get("dimensions"),
                "description": (a.get("description") or "")[:400],
                "image_url": f"https://www.artic.edu/iiif/2/{img_id}/full/843,/0/default.jpg" if img_id else None,
                "page_url": f"https://www.artic.edu/artworks/{a.get('id')}",
            })
        return {"success": True, "artworks": results, "count": len(results)}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# FOOD & RECIPES — TheMealDB  (FREE, no key)
# ─────────────────────────────────────────────────────────────────────────────

async def recipe_search(params: dict) -> dict:
    """Search recipes by name, ingredient, or cuisine. Returns full recipe with instructions."""
    name = params.get("name", "")
    ingredient = params.get("ingredient", "")
    cuisine = params.get("cuisine", "")  # e.g. Italian, Mexican, Japanese
    category = params.get("category", "")
    random = params.get("random", False)
    try:
        base = "https://www.themealdb.com/api/json/v1/1"
        if random:
            r = requests.get(f"{base}/random.php", timeout=10)
        elif name:
            r = requests.get(f"{base}/search.php", params={"s": name}, timeout=10)
        elif ingredient:
            r = requests.get(f"{base}/filter.php", params={"i": ingredient}, timeout=10)
        elif cuisine:
            r = requests.get(f"{base}/filter.php", params={"a": cuisine}, timeout=10)
        elif category:
            r = requests.get(f"{base}/filter.php", params={"c": category}, timeout=10)
        else:
            r = requests.get(f"{base}/random.php", timeout=10)

        r.raise_for_status()
        meals = r.json().get("meals") or []

        def _parse(m):
            ingredients = []
            for i in range(1, 21):
                ing = m.get(f"strIngredient{i}", "")
                meas = m.get(f"strMeasure{i}", "")
                if ing and ing.strip():
                    ingredients.append(f"{meas.strip()} {ing.strip()}".strip())
            return {
                "name": m.get("strMeal"),
                "category": m.get("strCategory"),
                "cuisine": m.get("strArea"),
                "instructions": (m.get("strInstructions") or "")[:2000],
                "ingredients": ingredients,
                "image": m.get("strMealThumb"),
                "video": m.get("strYoutube"),
                "tags": m.get("strTags"),
            }

        parsed = [_parse(m) for m in meals[:5] if m.get("strInstructions")]
        if not parsed and meals:
            parsed = [{"name": m.get("strMeal"), "image": m.get("strMealThumb")} for m in meals[:10]]

        return {"success": True, "recipes": parsed, "count": len(parsed)}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# REDDIT — RAW HUMAN CULTURE  (FREE, no key for public posts)
# ─────────────────────────────────────────────────────────────────────────────

async def reddit_browse(params: dict) -> dict:
    """Browse Reddit posts — subreddit feed or search. Exposes raw human conversation."""
    subreddit = params.get("subreddit", "")
    query = params.get("query", "")
    sort = params.get("sort", "hot")  # hot | new | top | rising
    time_filter = params.get("time", "week")  # hour | day | week | month | year | all
    limit = min(int(params.get("limit", 10)), 25)
    include_comments = params.get("include_comments", False)
    try:
        headers = {"User-Agent": "Vesper-AI/1.0"}
        if query and not subreddit:
            url = f"https://www.reddit.com/search.json"
            p = {"q": query, "sort": sort, "t": time_filter, "limit": limit}
        elif subreddit:
            if query:
                url = f"https://www.reddit.com/r/{subreddit}/search.json"
                p = {"q": query, "sort": sort, "t": time_filter, "limit": limit, "restrict_sr": 1}
            else:
                url = f"https://www.reddit.com/r/{subreddit}/{sort}.json"
                p = {"t": time_filter, "limit": limit}
        else:
            url = f"https://www.reddit.com/r/popular/{sort}.json"
            p = {"limit": limit}

        r = requests.get(url, params=p, headers=headers, timeout=15)
        r.raise_for_status()
        posts_raw = r.json().get("data", {}).get("children", [])
        posts = []
        for post in posts_raw:
            d = post.get("data", {})
            entry = {
                "title": d.get("title"),
                "subreddit": d.get("subreddit"),
                "author": d.get("author"),
                "score": d.get("score"),
                "upvote_ratio": d.get("upvote_ratio"),
                "num_comments": d.get("num_comments"),
                "url": f"https://reddit.com{d.get('permalink')}",
                "text": (d.get("selftext") or "")[:500],
                "created": d.get("created_utc"),
                "flair": d.get("link_flair_text"),
            }
            if include_comments and d.get("num_comments", 0) > 0:
                try:
                    cr = requests.get(
                        f"https://www.reddit.com{d.get('permalink')}.json",
                        headers=headers, timeout=10
                    )
                    comments_data = cr.json()[1].get("data", {}).get("children", [])[:5]
                    entry["top_comments"] = [
                        {"author": c["data"].get("author"), "text": (c["data"].get("body") or "")[:300], "score": c["data"].get("score")}
                        for c in comments_data if c.get("kind") == "t1"
                    ]
                except Exception:
                    pass
            posts.append(entry)
        return {"success": True, "posts": posts, "count": len(posts)}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# GOOGLE TRENDS  (FREE — uses pytrends, no API key)
# ─────────────────────────────────────────────────────────────────────────────

async def google_trends(params: dict) -> dict:
    """Google Trends data — what's trending, rising topics, interest over time."""
    keywords = params.get("keywords", [])
    if isinstance(keywords, str):
        keywords = [keywords]
    timeframe = params.get("timeframe", "today 3-m")  # today 1-m | today 3-m | today 12-m | today 5-y
    geo = params.get("geo", "US")
    action = params.get("action", "interest_over_time")  # interest_over_time | related_queries | trending_now | suggestions

    try:
        from pytrends.request import TrendReq
    except ImportError:
        import subprocess, sys
        subprocess.run([sys.executable, "-m", "pip", "install", "pytrends", "-q"], check=True)
        from pytrends.request import TrendReq

    try:
        pt = TrendReq(hl="en-US", tz=360, timeout=(10, 25))

        if action == "trending_now":
            df = pt.trending_searches(pn="united_states")
            return {"success": True, "action": "trending_now", "trending": df[0].tolist()[:20]}

        if action == "suggestions" and keywords:
            sugg = pt.suggestions(keywords[0])
            return {"success": True, "action": "suggestions", "keyword": keywords[0], "suggestions": sugg}

        if not keywords:
            return {"error": "keywords required for this action"}

        pt.build_payload(keywords[:5], timeframe=timeframe, geo=geo)

        if action == "related_queries":
            rq = pt.related_queries()
            result = {}
            for kw in keywords[:5]:
                data = rq.get(kw, {})
                result[kw] = {
                    "top": data.get("top", {}).to_dict("records")[:10] if data.get("top") is not None else [],
                    "rising": data.get("rising", {}).to_dict("records")[:10] if data.get("rising") is not None else [],
                }
            return {"success": True, "action": "related_queries", "data": result}

        # Default: interest over time
        df = pt.interest_over_time()
        if df.empty:
            return {"error": "No trend data returned", "keywords": keywords}
        df = df.drop(columns=["isPartial"], errors="ignore")
        records = df.reset_index().tail(24).to_dict("records")
        # Convert timestamps to strings
        for rec in records:
            if hasattr(rec.get("date"), "isoformat"):
                rec["date"] = rec["date"].isoformat()
        return {"success": True, "action": "interest_over_time", "keywords": keywords,
                "timeframe": timeframe, "geo": geo, "data": records}
    except Exception as e:
        return {"error": str(e), "hint": "pytrends may have hit rate limit — try again in a minute"}


# ─────────────────────────────────────────────────────────────────────────────
# MOVIES & TV — TMDB  (FREE key: https://www.themoviedb.org/settings/api)
# ─────────────────────────────────────────────────────────────────────────────

async def tmdb_search(params: dict) -> dict:
    """Search movies, TV shows, or people via TMDB. Get ratings, cast, overview."""
    key = os.getenv("TMDB_API_KEY", "")
    if not key:
        return {"error": "TMDB_API_KEY not set. Get a free key at https://www.themoviedb.org/settings/api"}

    query = params.get("query", "")
    media_type = params.get("type", "multi")  # multi | movie | tv | person
    limit = min(int(params.get("limit", 10)), 20)
    movie_id = params.get("movie_id")

    try:
        base = "https://api.themoviedb.org/3"
        if movie_id:
            r = requests.get(f"{base}/{media_type}/{movie_id}",
                           params={"api_key": key, "append_to_response": "credits,videos"}, timeout=15)
            r.raise_for_status()
            d = r.json()
            cast = [c.get("name") for c in d.get("credits", {}).get("cast", [])[:5]]
            trailer = next((v.get("key") for v in d.get("videos", {}).get("results", [])
                          if v.get("type") == "Trailer"), None)
            return {"success": True, "title": d.get("title") or d.get("name"),
                    "overview": d.get("overview"), "rating": d.get("vote_average"),
                    "release": d.get("release_date") or d.get("first_air_date"),
                    "genres": [g["name"] for g in d.get("genres", [])],
                    "cast": cast, "trailer_youtube": f"https://youtube.com/watch?v={trailer}" if trailer else None}

        r = requests.get(f"{base}/search/{media_type}",
                        params={"api_key": key, "query": query}, timeout=15)
        r.raise_for_status()
        results = r.json().get("results", [])[:limit]
        items = []
        for d in results:
            items.append({
                "id": d.get("id"),
                "title": d.get("title") or d.get("name"),
                "type": d.get("media_type", media_type),
                "overview": (d.get("overview") or "")[:300],
                "rating": d.get("vote_average"),
                "release": d.get("release_date") or d.get("first_air_date"),
                "poster": f"https://image.tmdb.org/t/p/w342{d['poster_path']}" if d.get("poster_path") else None,
            })
        return {"success": True, "results": items, "count": len(items)}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# SPOTIFY  (FREE key: https://developer.spotify.com/dashboard)
# ─────────────────────────────────────────────────────────────────────────────

_spotify_token_cache = {"token": None, "expires": 0}

async def _get_spotify_token() -> Optional[str]:
    import time, base64
    client_id = os.getenv("SPOTIFY_CLIENT_ID", "")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        return None
    now = time.time()
    if _spotify_token_cache["token"] and now < _spotify_token_cache["expires"]:
        return _spotify_token_cache["token"]
    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    r = requests.post(
        "https://accounts.spotify.com/api/token",
        data={"grant_type": "client_credentials"},
        headers={"Authorization": f"Basic {credentials}"},
        timeout=10
    )
    r.raise_for_status()
    d = r.json()
    _spotify_token_cache["token"] = d["access_token"]
    _spotify_token_cache["expires"] = now + d["expires_in"] - 60
    return d["access_token"]


async def spotify_search(params: dict) -> dict:
    """Search Spotify for tracks, albums, artists, or playlists."""
    token = await _get_spotify_token()
    if not token:
        return {"error": "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET not set. Free at https://developer.spotify.com/dashboard"}

    query = params.get("query", "")
    search_type = params.get("type", "track")  # track | album | artist | playlist
    limit = min(int(params.get("limit", 10)), 20)
    mood = params.get("mood", "")  # happy | sad | energetic | chill | melancholic

    if mood and not query:
        mood_map = {
            "happy": "happy upbeat joyful", "sad": "sad emotional melancholic",
            "energetic": "energetic pump up workout", "chill": "chill relaxing calm ambient",
            "melancholic": "melancholic bittersweet nostalgic", "mysterious": "mysterious dark atmospheric",
            "romantic": "romantic love tender", "angry": "aggressive intense heavy",
        }
        query = mood_map.get(mood.lower(), mood)

    try:
        r = requests.get(
            "https://api.spotify.com/v1/search",
            params={"q": query, "type": search_type, "limit": limit},
            headers={"Authorization": f"Bearer {token}"},
            timeout=15
        )
        r.raise_for_status()
        data = r.json()
        key = f"{search_type}s"
        items = data.get(key, {}).get("items", [])
        results = []
        for item in items:
            entry = {
                "id": item.get("id"),
                "name": item.get("name"),
                "type": search_type,
                "url": item.get("external_urls", {}).get("spotify"),
                "preview_url": item.get("preview_url"),
            }
            if search_type == "track":
                entry["artists"] = [a["name"] for a in item.get("artists", [])]
                entry["album"] = item.get("album", {}).get("name")
                entry["duration_ms"] = item.get("duration_ms")
                entry["popularity"] = item.get("popularity")
                entry["image"] = (item.get("album", {}).get("images") or [{}])[0].get("url")
            elif search_type == "artist":
                entry["genres"] = item.get("genres", [])[:5]
                entry["followers"] = item.get("followers", {}).get("total")
                entry["popularity"] = item.get("popularity")
                entry["image"] = (item.get("images") or [{}])[0].get("url")
            elif search_type == "album":
                entry["artists"] = [a["name"] for a in item.get("artists", [])]
                entry["release_date"] = item.get("release_date")
                entry["total_tracks"] = item.get("total_tracks")
                entry["image"] = (item.get("images") or [{}])[0].get("url")
            results.append(entry)
        return {"success": True, "results": results, "count": len(results), "query": query}
    except Exception as e:
        return {"error": str(e)}


async def spotify_recommendations(params: dict) -> dict:
    """Get Spotify song recommendations based on mood, energy, valence, tempo."""
    token = await _get_spotify_token()
    if not token:
        return {"error": "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET not set"}

    seed_genres = params.get("genres", ["pop"])
    if isinstance(seed_genres, str):
        seed_genres = [seed_genres]
    limit = min(int(params.get("limit", 10)), 20)

    # Audio feature targets (0.0–1.0 unless noted)
    p = {
        "seed_genres": ",".join(seed_genres[:5]),
        "limit": limit,
    }
    for feat in ["target_valence", "target_energy", "target_danceability",
                 "target_acousticness", "min_popularity", "target_tempo"]:
        if feat in params:
            p[feat] = params[feat]

    # Mood shortcuts
    mood = params.get("mood", "")
    mood_presets = {
        "happy": {"target_valence": 0.8, "target_energy": 0.7},
        "sad": {"target_valence": 0.2, "target_energy": 0.3},
        "energetic": {"target_energy": 0.9, "target_danceability": 0.8},
        "chill": {"target_energy": 0.3, "target_acousticness": 0.7},
        "focus": {"target_energy": 0.5, "target_valence": 0.5, "target_instrumentalness": 0.6},
    }
    if mood in mood_presets and not any(f in params for f in ["target_valence", "target_energy"]):
        p.update(mood_presets[mood])

    try:
        r = requests.get(
            "https://api.spotify.com/v1/recommendations",
            params=p,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15
        )
        r.raise_for_status()
        tracks = r.json().get("tracks", [])
        results = [
            {
                "name": t["name"],
                "artists": [a["name"] for a in t.get("artists", [])],
                "album": t.get("album", {}).get("name"),
                "url": t.get("external_urls", {}).get("spotify"),
                "preview_url": t.get("preview_url"),
                "popularity": t.get("popularity"),
                "image": (t.get("album", {}).get("images") or [{}])[0].get("url"),
            }
            for t in tracks
        ]
        return {"success": True, "tracks": results, "count": len(results)}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EVENTS — Ticketmaster  (FREE key: developer.ticketmaster.com)
# ─────────────────────────────────────────────────────────────────────────────

async def local_events(params: dict) -> dict:
    """Find local events — concerts, sports, arts, comedy near a location."""
    key = os.getenv("TICKETMASTER_KEY", "")
    if not key:
        return {"error": "TICKETMASTER_KEY not set. Free at https://developer.ticketmaster.com/"}

    city = params.get("city", "Surprise")
    state = params.get("state", "AZ")
    keyword = params.get("keyword", "")
    category = params.get("category", "")  # Music | Sports | Arts & Theatre | Family
    start_date = params.get("start_date", "")  # YYYY-MM-DD
    limit = min(int(params.get("limit", 10)), 20)

    try:
        p = {
            "apikey": key, "city": city, "stateCode": state,
            "size": limit, "sort": "date,asc",
        }
        if keyword:
            p["keyword"] = keyword
        if category:
            p["classificationName"] = category
        if start_date:
            p["startDateTime"] = f"{start_date}T00:00:00Z"

        r = requests.get(
            "https://app.ticketmaster.com/discovery/v2/events.json",
            params=p, timeout=15
        )
        r.raise_for_status()
        events_raw = r.json().get("_embedded", {}).get("events", [])[:limit]
        events = []
        for e in events_raw:
            venue = (e.get("_embedded", {}).get("venues") or [{}])[0]
            price = e.get("priceRanges", [{}])[0]
            events.append({
                "name": e.get("name"),
                "date": e.get("dates", {}).get("start", {}).get("localDate"),
                "time": e.get("dates", {}).get("start", {}).get("localTime"),
                "venue": venue.get("name"),
                "address": venue.get("address", {}).get("line1"),
                "city": venue.get("city", {}).get("name"),
                "category": (e.get("classifications") or [{}])[0].get("segment", {}).get("name"),
                "genre": (e.get("classifications") or [{}])[0].get("genre", {}).get("name"),
                "price_min": price.get("min"),
                "price_max": price.get("max"),
                "url": e.get("url"),
                "image": (e.get("images") or [{}])[0].get("url"),
            })
        return {"success": True, "events": events, "count": len(events),
                "location": f"{city}, {state}"}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# NEWS MONITOR — NewsAPI  (FREE 100/day: https://newsapi.org)
# ─────────────────────────────────────────────────────────────────────────────

async def news_search(params: dict) -> dict:
    """Search and monitor news. Great for market intel, competitor moves, industry trends."""
    key = os.getenv("NEWS_API_KEY", "")
    if not key:
        return {"error": "NEWS_API_KEY not set. Free 100/day at https://newsapi.org"}

    query = params.get("query", "")
    topic = params.get("topic", "")  # business | technology | science | health | entertainment
    sources = params.get("sources", "")
    language = params.get("language", "en")
    sort_by = params.get("sort_by", "publishedAt")  # publishedAt | relevancy | popularity
    limit = min(int(params.get("limit", 10)), 20)
    from_date = params.get("from_date", "")  # YYYY-MM-DD

    try:
        base = "https://newsapi.org/v2"
        if topic and not query:
            endpoint = f"{base}/top-headlines"
            p = {"apiKey": key, "category": topic, "language": language, "pageSize": limit}
        else:
            endpoint = f"{base}/everything"
            p = {"apiKey": key, "q": query or topic, "language": language,
                 "sortBy": sort_by, "pageSize": limit}
            if from_date:
                p["from"] = from_date
            if sources:
                p["sources"] = sources

        r = requests.get(endpoint, params=p, timeout=15)
        r.raise_for_status()
        articles_raw = r.json().get("articles", [])[:limit]
        articles = [
            {
                "title": a.get("title"),
                "source": a.get("source", {}).get("name"),
                "author": a.get("author"),
                "published": a.get("publishedAt"),
                "description": a.get("description"),
                "url": a.get("url"),
                "image": a.get("urlToImage"),
            }
            for a in articles_raw
            if a.get("title") and "[Removed]" not in a.get("title", "")
        ]
        return {"success": True, "articles": articles, "count": len(articles),
                "total_results": r.json().get("totalResults", 0)}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# HUNTER.IO — LEAD EMAIL FINDER  (FREE 25/month: https://hunter.io)
# ─────────────────────────────────────────────────────────────────────────────

async def hunter_find_email(params: dict) -> dict:
    """Find professional email addresses by domain or person. Gold for consulting lead gen."""
    key = os.getenv("HUNTER_API_KEY", "")
    if not key:
        return {"error": "HUNTER_API_KEY not set. Free 25/month at https://hunter.io"}

    domain = params.get("domain", "")
    first_name = params.get("first_name", "")
    last_name = params.get("last_name", "")
    company = params.get("company", "")
    limit = min(int(params.get("limit", 10)), 20)

    try:
        if first_name and last_name and (domain or company):
            # Find specific person
            p = {"api_key": key}
            if first_name:
                p["first_name"] = first_name
            if last_name:
                p["last_name"] = last_name
            if domain:
                p["domain"] = domain
            if company:
                p["company"] = company
            r = requests.get("https://api.hunter.io/v2/email-finder", params=p, timeout=15)
            r.raise_for_status()
            d = r.json().get("data", {})
            return {
                "success": True, "type": "email_finder",
                "email": d.get("email"), "score": d.get("score"),
                "first_name": d.get("first_name"), "last_name": d.get("last_name"),
                "position": d.get("position"), "company": d.get("company"),
                "linkedin": d.get("linkedin"),
            }
        elif domain:
            # Domain search — find all emails at a company
            r = requests.get(
                "https://api.hunter.io/v2/domain-search",
                params={"domain": domain, "api_key": key, "limit": limit},
                timeout=15
            )
            r.raise_for_status()
            d = r.json().get("data", {})
            emails = [
                {"email": e.get("value"), "type": e.get("type"),
                 "first_name": e.get("first_name"), "last_name": e.get("last_name"),
                 "position": e.get("position"), "confidence": e.get("confidence")}
                for e in d.get("emails", [])[:limit]
            ]
            return {
                "success": True, "type": "domain_search", "domain": domain,
                "organization": d.get("organization"), "pattern": d.get("pattern"),
                "emails": emails, "count": len(emails),
                "total_emails": d.get("meta", {}).get("total"),
            }
        else:
            return {"error": "Provide domain, or first_name + last_name + domain/company"}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# YELP — BUSINESS INTELLIGENCE  (FREE key: https://www.yelp.com/developers)
# ─────────────────────────────────────────────────────────────────────────────

async def yelp_search(params: dict) -> dict:
    """Search Yelp for businesses, ratings, reviews, contact info."""
    key = os.getenv("YELP_API_KEY", "")
    if not key:
        return {"error": "YELP_API_KEY not set. Free at https://www.yelp.com/developers/v3/manage_app"}

    term = params.get("term", "")
    location = params.get("location", "Surprise, AZ")
    categories = params.get("categories", "")
    sort_by = params.get("sort_by", "rating")  # rating | review_count | distance | best_match
    limit = min(int(params.get("limit", 10)), 20)
    open_now = params.get("open_now", False)

    try:
        p = {"term": term, "location": location, "sort_by": sort_by, "limit": limit}
        if categories:
            p["categories"] = categories
        if open_now:
            p["open_now"] = True
        r = requests.get(
            "https://api.yelp.com/v3/businesses/search",
            params=p,
            headers={"Authorization": f"Bearer {key}"},
            timeout=15
        )
        r.raise_for_status()
        businesses = r.json().get("businesses", [])[:limit]
        results = [
            {
                "name": b.get("name"),
                "rating": b.get("rating"),
                "review_count": b.get("review_count"),
                "price": b.get("price"),
                "phone": b.get("display_phone"),
                "address": " ".join(b.get("location", {}).get("display_address", [])),
                "categories": [c.get("title") for c in b.get("categories", [])],
                "is_closed": b.get("is_closed"),
                "url": b.get("url"),
                "image": b.get("image_url"),
                "distance_m": round(b.get("distance", 0)),
            }
            for b in businesses
        ]
        return {"success": True, "businesses": results, "count": len(results),
                "location": location}
    except Exception as e:
        return {"error": str(e)}
