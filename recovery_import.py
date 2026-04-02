#!/usr/bin/env python3
"""
Conversation Recovery & Import Tool
Helps save today's conversations to the memory database
"""
import sqlite3
import json
from datetime import datetime

def add_conversation_to_memory(title, category, content, tags=None):
    """Add a recovered conversation to the memory database"""
    conn = sqlite3.connect('vesper-ai/vesper_memory.db')
    c = conn.cursor()
    
    try:
        # Insert into memories table
        tags_json = json.dumps(tags or [])
        c.execute("""
            INSERT INTO memories (category, content, created_at, updated_at, tags, importance)
            VALUES (?, ?, ?, ?, ?, 9)
        """, (
            category,
            content,
            datetime.now().isoformat(),
            datetime.now().isoformat(),
            tags_json
        ))
        
        conn.commit()
        mem_id = c.lastrowid
        print(f"✓ Saved to memory (ID: {mem_id})")
        conn.close()
        return mem_id
    except Exception as e:
        print(f"✗ Error: {e}")
        conn.close()
        return None

def add_thread_to_database(thread_id, title, messages):
    """Add a recovered conversation thread to threads table"""
    conn = sqlite3.connect('vesper-ai/vesper_memory.db')
    c = conn.cursor()
    
    try:
        messages_json = json.dumps(messages)
        now = datetime.now().isoformat()
        
        c.execute("""
            INSERT OR REPLACE INTO threads (id, title, created_at, updated_at, messages)
            VALUES (?, ?, ?, ?, ?)
        """, (
            thread_id,
            title,
            now,
            now,
            messages_json
        ))
        
        conn.commit()
        print(f"✓ Saved thread (ID: {thread_id}, {len(messages)} messages)")
        conn.close()
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        conn.close()
        return False

if __name__ == "__main__":
    print("""
    ┌─────────────────────────────────────────────────────────────────┐
    │  CONVERSATION RECOVERY TOOL                                     │
    │  Use this to import today's important conversation             │
    └─────────────────────────────────────────────────────────────────┘
    
    To use:
    1. Tell me what the conversation was about
    2. I'll format and save it to the database
    3. It will appear in your Memory Core with timestamp
    
    Example usage in Python:
    
    from recovery_import import add_conversation_to_memory, add_thread_to_database
    
    # Save as memory (short notes)
    add_conversation_to_memory(
        title="April 1 - 40 Features Added Today",
        category="achievements",
        content="We implemented 40+ features including...",
        tags=["features", "vesper", "april-1"]
    )
    
    # Save as thread (full conversation)
    add_thread_to_database(
        thread_id="important_conv_2026_04_01",
        title="Major Features Discussion - April 1 2026",
        messages=[
            {"role": "user", "content": "What features did we add?"},
            {"role": "assistant", "content": "We added..."}
        ]
    )
    """)
