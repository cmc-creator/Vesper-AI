#!/usr/bin/env python3
"""Recover all threads from conversation database"""
import sqlite3
import json
from datetime import datetime

conn = sqlite3.connect('vesper-ai/vesper_memory.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Get all threads
print("=== ALL CONVERSATION THREADS ===\n")
c.execute("""
SELECT id, title, created_at, updated_at, messages 
FROM threads 
ORDER BY updated_at DESC 
LIMIT 50
""")

rows = c.fetchall()
print(f"Total threads found: {len(rows)}\n")

all_threads = []
for r in rows:
    thread_id, title, created_at, updated_at, messages_json = r
    
    # Parse messages
    try:
        messages = json.loads(messages_json) if messages_json else []
    except:
        messages = []
    
    thread = {
        'id': thread_id,
        'title': title,
        'created_at': created_at,
        'updated_at': updated_at,
        'message_count': len(messages),
        'messages': messages
    }
    all_threads.append(thread)
    
    print(f"\n{'='*80}")
    print(f"THREAD: {title}")
    print(f"ID: {thread_id}")
    print(f"Created: {created_at}")
    print(f"Updated: {updated_at}")
    print(f"Messages: {len(messages)}")
    print(f"{'='*80}")
    
    # Show first few messages
    for i, msg in enumerate(messages[:5]):
        role = msg.get('role', '?').upper()
        content = msg.get('content', '')[:100]
        print(f"\n  [{i+1}] {role}: {content}")
    
    if len(messages) > 5:
        print(f"\n  ... and {len(messages) - 5} more messages")

conn.close()

# Save recovered threads to file
with open('recovered_threads.json', 'w') as f:
    json.dump(all_threads, f, indent=2)

print(f"\n\n{'='*80}")
print(f"SAVED: Recovered {len(all_threads)} threads to recovered_threads.json")
print(f"{'='*80}")
