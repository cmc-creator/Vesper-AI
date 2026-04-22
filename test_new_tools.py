"""
test_new_tools.py — End-to-end smoke tests for the 5 new Vesper tools.

Tests against the live Railway backend using the non-streaming /api/chat endpoint.
Prints PASS / FAIL for each case.

Usage:
    python test_new_tools.py [--url https://your-railway-url.up.railway.app]
"""

import argparse
import asyncio
import json
import sys
import time
import httpx

RAILWAY_URL = "https://vesper-backend-production-b486.up.railway.app"
CHAT_ENDPOINT = "/api/chat"
TIMEOUT = 60

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"


def ok(label: str, detail: str = "") -> None:
    print(f"  {GREEN}PASS{RESET}  {label}" + (f"  ({detail})" if detail else ""))


def fail(label: str, detail: str = "") -> None:
    print(f"  {RED}FAIL{RESET}  {label}" + (f"  — {detail}" if detail else ""))


async def chat(client: httpx.AsyncClient, base_url: str, message: str) -> dict:
    """POST a single-message conversation and return the parsed JSON response."""
    payload = {
        "messages": [{"role": "user", "content": message}],
        "thread_id": f"test-{int(time.time())}",
        "stream": False,
    }
    resp = await client.post(
        f"{base_url}{CHAT_ENDPOINT}",
        json=payload,
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


# ─── Individual tool tests ────────────────────────────────────────────────────

async def test_weather(client: httpx.AsyncClient, base_url: str) -> bool:
    print("\n[Weather]")
    try:
        r = await chat(client, base_url, "What's the current weather in New York City?")
        content = str(r.get("content", "") or r.get("response", "") or r)
        # We just need a temperature-like number somewhere in the response
        has_temp = any(ch.isdigit() for ch in content) and any(
            kw in content.lower() for kw in ["°", "temp", "feels", "humid", "wind", "new york"]
        )
        if has_temp:
            ok("current weather for NYC", content[:80].replace("\n", " "))
            return True
        fail("current weather for NYC", content[:120].replace("\n", " "))
        return False
    except Exception as e:
        fail("current weather for NYC", str(e))
        return False


async def test_code_sandbox(client: httpx.AsyncClient, base_url: str) -> bool:
    print("\n[Code Sandbox]")
    results = []

    # Basic execution
    try:
        r = await chat(client, base_url, "Run this Python code and tell me the output: print(2 ** 10)")
        content = str(r.get("content", "") or r.get("response", "") or r)
        if "1024" in content:
            ok("basic print(2**10)", "got 1024 in response")
            results.append(True)
        else:
            fail("basic print(2**10)", content[:120].replace("\n", " "))
            results.append(False)
    except Exception as e:
        fail("basic print(2**10)", str(e))
        results.append(False)

    # Math computation
    try:
        r = await chat(client, base_url, "Execute Python: import math; print(round(math.pi, 5))")
        content = str(r.get("content", "") or r.get("response", "") or r)
        if "3.14159" in content:
            ok("math.pi computation", "got 3.14159")
            results.append(True)
        else:
            fail("math.pi computation", content[:120].replace("\n", " "))
            results.append(False)
    except Exception as e:
        fail("math.pi computation", str(e))
        results.append(False)

    return all(results)


async def test_reminders(client: httpx.AsyncClient, base_url: str) -> bool:
    print("\n[Reminders]")
    results = []

    # Set a reminder
    try:
        r = await chat(client, base_url, "Set a reminder to take a break in 2 hours")
        content = str(r.get("content", "") or r.get("response", "") or r)
        if any(kw in content.lower() for kw in ["reminder", "remind", "set", "⏰", "break"]):
            ok("set reminder", content[:80].replace("\n", " "))
            results.append(True)
        else:
            fail("set reminder", content[:120].replace("\n", " "))
            results.append(False)
    except Exception as e:
        fail("set reminder", str(e))
        results.append(False)

    # List reminders
    try:
        r = await chat(client, base_url, "List my upcoming reminders")
        content = str(r.get("content", "") or r.get("response", "") or r)
        if any(kw in content.lower() for kw in ["reminder", "no reminders", "upcoming", "break", "due"]):
            ok("list reminders", content[:80].replace("\n", " "))
            results.append(True)
        else:
            fail("list reminders", content[:120].replace("\n", " "))
            results.append(False)
    except Exception as e:
        fail("list reminders", str(e))
        results.append(False)

    return all(results)


async def test_file_reader(client: httpx.AsyncClient, base_url: str) -> bool:
    """Read a small public text file by URL."""
    print("\n[File Reader]")
    try:
        r = await chat(
            client,
            base_url,
            "Read and summarize this URL: https://raw.githubusercontent.com/cmc-creator/Vesper-AI/main/README.md",
        )
        content = str(r.get("content", "") or r.get("response", "") or r)
        if any(kw in content.lower() for kw in ["vesper", "readme", "ai", "overview", "feature"]):
            ok("read public URL (README.md)", content[:80].replace("\n", " "))
            return True
        fail("read public URL (README.md)", content[:120].replace("\n", " "))
        return False
    except Exception as e:
        fail("read public URL (README.md)", str(e))
        return False


async def test_notion(client: httpx.AsyncClient, base_url: str) -> bool:
    """Notion requires a key — we just check that the tool responds (not errors with a crash)."""
    print("\n[Notion]")
    try:
        r = await chat(client, base_url, "Search Notion for anything related to 'project'")
        content = str(r.get("content", "") or r.get("response", "") or r)
        # With no key, should get a graceful 'not configured' message — not a 500
        graceful = any(kw in content.lower() for kw in [
            "notion", "api key", "not configured", "connect", "results", "page", "no results"
        ])
        if graceful:
            ok("notion graceful response (key may be absent)", content[:80].replace("\n", " "))
            return True
        fail("notion graceful response", content[:120].replace("\n", " "))
        return False
    except Exception as e:
        fail("notion graceful response", str(e))
        return False


async def test_health(client: httpx.AsyncClient, base_url: str) -> bool:
    """Check the /health endpoint first to fail fast if backend is down."""
    print("\n[Health Check]")
    try:
        r = await client.get(f"{base_url}/health", timeout=15)
        if r.status_code == 200:
            ok("/health endpoint", r.text[:60])
            return True
        fail("/health endpoint", f"HTTP {r.status_code}")
        return False
    except Exception as e:
        fail("/health endpoint", str(e))
        return False


# ─── Runner ───────────────────────────────────────────────────────────────────

async def main(base_url: str) -> None:
    print(f"\nVesper New Tools — End-to-End Test")
    print(f"Target: {base_url}")
    print("=" * 55)

    async with httpx.AsyncClient(follow_redirects=True) as client:
        health_ok = await test_health(client, base_url)
        if not health_ok:
            print(f"\n{RED}Backend appears down. Aborting.{RESET}")
            sys.exit(1)

        results = {
            "weather": await test_weather(client, base_url),
            "code_sandbox": await test_code_sandbox(client, base_url),
            "reminders": await test_reminders(client, base_url),
            "file_reader": await test_file_reader(client, base_url),
            "notion": await test_notion(client, base_url),
        }

    print("\n" + "=" * 55)
    passed = sum(results.values())
    total = len(results)
    for tool, result in results.items():
        icon = f"{GREEN}✓{RESET}" if result else f"{RED}✗{RESET}"
        print(f"  {icon}  {tool}")
    print(f"\n{GREEN if passed == total else YELLOW}{passed}/{total} tools passed{RESET}\n")

    if passed < total:
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Vesper new-tools smoke test")
    parser.add_argument("--url", default=RAILWAY_URL, help="Backend base URL")
    args = parser.parse_args()
    asyncio.run(main(args.url.rstrip("/")))
