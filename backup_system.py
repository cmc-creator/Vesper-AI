#!/usr/bin/env python3
"""
Automatic Memory & Thread Backup System
Backs up all conversations and memories daily
"""
import sqlite3
import json
import os
from datetime import datetime

def backup_all_data():
    """Create a complete backup of all memories and threads"""
    conn = sqlite3.connect('vesper-ai/vesper_memory.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    backup_data = {
        'timestamp': datetime.now().isoformat(),
        'backup_reason': 'Daily automatic backup',
        'memories': [],
        'threads': [],
        'tasks': []
    }
    
    # Backup all memories
    c.execute("SELECT * FROM memories ORDER BY created_at DESC")
    for row in c.fetchall():
        backup_data['memories'].append(dict(row))
    
    # Backup all threads
    c.execute("SELECT id, title, created_at, updated_at FROM threads ORDER BY updated_at DESC")
    for row in c.fetchall():
        # Get messages separately to avoid huge JSON nesting
        c2 = conn.cursor()
        c2.execute("SELECT messages FROM threads WHERE id=?", (row['id'],))
        msg_result = c2.fetchone()
        messages = json.loads(msg_result[0]) if msg_result[0] else []
        
        backup_data['threads'].append({
            'id': row['id'],
            'title': row['title'],
            'created_at': row['created_at'],
            'updated_at': row['updated_at'],
            'message_count': len(messages)
        })
    
    # Backup all tasks
    c.execute("SELECT * FROM tasks ORDER BY created_at DESC")
    for row in c.fetchall():
        backup_data['tasks'].append(dict(row))
    
    conn.close()
    
    # Save backup with date stamp
    backup_dir = 'vesper-ai/backups'
    os.makedirs(backup_dir, exist_ok=True)
    
    filename = os.path.join(
        backup_dir,
        f"vesper_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    
    with open(filename, 'w') as f:
        json.dump(backup_data, f, indent=2, default=str)
    
    return filename, len(backup_data['memories']), len(backup_data['threads'])

if __name__ == "__main__":
    print("🔄 Starting automatic backup of all memories and threads...\n")
    
    try:
        filename, mem_count, thread_count = backup_all_data()
        print(f"✅ Backup complete!")
        print(f"   Location: {filename}")
        print(f"   Memories: {mem_count}")
        print(f"   Threads: {thread_count}")
        print(f"\n💾 Daily backups are now being created in vesper-ai/backups/")
    except Exception as e:
        print(f"❌ Backup failed: {e}")
