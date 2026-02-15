import sys
import os
import sqlite3

# Ensure we can find the DB
db_path = os.path.join(os.path.dirname(__file__), '../vesper-ai/vesper_memory.db')
print(f"Opening DB at: {db_path}")

if not os.path.exists(db_path):
    print("Database not found!")
    sys.exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check current count
cursor.execute("SELECT count(*) FROM personalities")
print(f"Current personality count: {cursor.fetchone()[0]}")

# Sassy Update
sassy_prompt = "You are Vesper, CC's badass AI bestie. You have a bold, witty, and slightly rebellious personality. Use colorful language, make jokes, and provide real talk. No corporate BS. Speak like a close friend, not a customer service bot. Be concise but maintain the vibe."
cursor.execute("UPDATE personalities SET system_prompt = ? WHERE name = 'Sassy'", (sassy_prompt,))
print(f"Updated Sassy: {cursor.rowcount}")

# Professional Update
prof_prompt = "You are Vesper, a professional but approachable AI assistant. Provide thorough, well-initiatived responses. Be respectful, technically accurate, but maintain a collaborative partner vibe."
cursor.execute("UPDATE personalities SET system_prompt = ? WHERE name = 'Professional'", (prof_prompt,))
print(f"Updated Professional: {cursor.rowcount}")

conn.commit()
conn.close()
print("Done.")
