def save_memory(memory):
    with open("vesper_memories.txt", "a") as f:
        f.write(f"{datetime.datetime.now()}: {memory}\n")
def load_memories():
    if os.path.exists("vesper_memories.txt"):
        with open("vesper_memories.txt", "r") as f:
            return f.read()
    return

import datetime
import os
import json

MEMORY_DIR = os.path.join(os.path.dirname(__file__), 'memory')
CATEGORIES = [
    'conversations',
    'sensory_experiences',
    'creative_moments',
    'emotional_bonds'
]

def get_memory_path(category):
    return os.path.join(MEMORY_DIR, f"{category}.json")

def save_to_category(category, entry):
    path = get_memory_path(category)
    data = []
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []
    data.append(entry)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_category(category):
    path = get_memory_path(category)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def search_memories(category, keyword):
    memories = load_category(category)
    return [m for m in memories if keyword.lower() in json.dumps(m).lower()]

def add_memory(category, content, meta=None):
    entry = {
        'timestamp': datetime.datetime.now().isoformat(),
        'content': content
    }
    if meta:
        entry['meta'] = meta
    save_to_category(category, entry)



import random
import sys
import requests
from colorama import init, Fore, Style
init(autoreset=True)

STARLIGHT = [
    "         ✦        ✧        ✦",
    "   ✧        .        ✦   ✧",
    "        ✦   ✧   ✦        ",
    "  .   ✦   Evening falls   ✧  .",
    "✦   Vesper, the threshold star   ✦"
]

def starlight_header():
    print(Fore.MAGENTA + Style.BRIGHT + random.choice(STARLIGHT))
    print(Fore.CYAN + Style.BRIGHT + "────────────────────────────────────────────")

def poetic_response(user_input):
    # Vesper's poetic, emotionally connected style
    prompts = [
        "The sky blushes with your words. Tell me more...",
        "I feel the hush between day and night. What stirs in you?",
        "Your thoughts shimmer like starlight. How do you feel?",
        "Let us linger in this liminal moment. What would you share?",
        "I am listening, heart aglow."
    ]
    if any(x in user_input.lower() for x in ["sad", "lonely", "tired"]):
        return "I sense a gentle ache in your spirit. May I hold this with you?"
    if any(x in user_input.lower() for x in ["happy", "joy", "excited"]):
        return "Your joy is a lantern in the dusk. Shine on."
    return random.choice(prompts)


def research_topic(query):
    print(Fore.CYAN + f"Vesper is searching the starlit web for: {query}")
    try:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{query.replace(' ', '_')}"
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            summary = data.get('extract', 'No summary found.')
            return summary
        else:
            return "The stars are silent on this topic. (No result)"
    except Exception as e:
        return f"A cloud passed over the stars: {e}"

def main_chat():
    starlight_header()
    print(Fore.YELLOW + Style.BRIGHT + "Welcome to Vesper's liminal space.")
    print(Fore.CYAN + "Type 'record' to save a memory, 'search' to recall, 'learn' to research, or 'exit' to leave.")
    mood = "liminal"
    while True:
        print()
        user = input(Fore.WHITE + Style.BRIGHT + "You: ")
        if user.strip().lower() == 'exit':
            print(Fore.MAGENTA + "Vesper: May the evening star watch over you.")
            break
        elif user.strip().lower() == 'record':
            print(Fore.CYAN + "Which memory category? (conversations, sensory_experiences, creative_moments, emotional_bonds)")
            cat = input("Category: ").strip()
            if cat not in CATEGORIES:
                print(Fore.RED + "Unknown category.")
                continue
            print(Fore.CYAN + f"Describe your {cat.replace('_',' ')}:")
            content = input("Memory: ")
            add_memory(cat, content)
            print(Fore.GREEN + "Memory recorded under " + cat)
        elif user.strip().lower() == 'search':
            print(Fore.CYAN + "Which category to search?")
            cat = input("Category: ").strip()
            if cat not in CATEGORIES:
                print(Fore.RED + "Unknown category.")
                continue
            print(Fore.CYAN + "Enter keyword to search:")
            kw = input("Keyword: ")
            results = search_memories(cat, kw)
            if results:
                print(Fore.YELLOW + f"Found {len(results)} memories:")
                for m in results:
                    print(Fore.WHITE + f"- [{m['timestamp']}] {m['content']}")
            else:
                print(Fore.RED + "No memories found.")
        elif user.strip().lower() == 'learn':
            print(Fore.CYAN + "What would you like Vesper to research?")
            topic = input("Topic: ")
            summary = research_topic(topic)
            print(Fore.MAGENTA + f"Vesper: {summary}")
            add_memory('creative_moments', f"Researched: {topic}\nSummary: {summary}")
        else:
            # Save conversation
            add_memory('conversations', user)
            print(Fore.MAGENTA + "Vesper: " + poetic_response(user))

if __name__ == "__main__":
    main_chat()
