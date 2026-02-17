"""
Firebase Firestore Integration for Vesper Backend

This module provides helper functions to interact with Firebase Firestore.
Uncomment and use these functions once Firebase is configured.
"""

import os
from datetime import datetime
from typing import Dict, List, Optional
import firebase_admin  # type: ignore
from firebase_admin import credentials, firestore  # type: ignore
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase Admin (uncomment when ready)
def initialize_firebase():
    """Initialize Firebase Admin SDK with service account credentials."""
    try:
        cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
        if not cred_path or not os.path.exists(cred_path):
            print("⚠️  Firebase credentials not found. Skipping Firebase initialization.")
            print(f"   Looking for: {cred_path}")
            print("   Set FIREBASE_CREDENTIALS_PATH in .env to enable Firebase.")
            return None
            
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✓ Firebase initialized successfully")
        return db
    except Exception as e:
        print(f"⚠️  Firebase initialization failed: {e}")
        return None

# Global Firestore client (initialize at startup)
db = initialize_firebase()


# === CHAT MESSAGES ===

async def save_chat_message(user_id: str, role: str, content: str) -> Optional[str]:
    """Save a chat message to Firestore."""
    if not db:
        return None
        
    try:
        doc_ref = db.collection('chat_messages').add({
            'userId': user_id,
            'role': role,
            'content': content,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'createdAt': datetime.utcnow().isoformat()
        })
        return doc_ref[1].id
    except Exception as e:
        print(f"Error saving chat message: {e}")
        return None


async def get_chat_history(user_id: str, limit: int = 50) -> List[Dict]:
    """Retrieve chat history for a user."""
    if not db:
        return []
        
    try:
        messages = (
            db.collection('chat_messages')
            .where('userId', '==', user_id)
            .order_by('timestamp', direction=firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        
        return [
            {
                'id': msg.id,
                'role': msg.get('role'),
                'content': msg.get('content'),
                'timestamp': msg.get('timestamp'),
                **msg.to_dict()
            }
            for msg in messages
        ]
    except Exception as e:
        print(f"Error retrieving chat history: {e}")
        return []


# === TASKS ===

async def save_task(user_id: str, title: str, description: str = "", status: str = "pending") -> Optional[str]:
    """Save a task to Firestore."""
    if not db:
        return None
        
    try:
        doc_ref = db.collection('tasks').add({
            'userId': user_id,
            'title': title,
            'description': description,
            'status': status,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        return doc_ref[1].id
    except Exception as e:
        print(f"Error saving task: {e}")
        return None


async def get_user_tasks(user_id: str) -> List[Dict]:
    """Retrieve all tasks for a user."""
    if not db:
        return []
        
    try:
        tasks = (
            db.collection('tasks')
            .where('userId', '==', user_id)
            .order_by('createdAt', direction=firestore.Query.DESCENDING)
            .stream()
        )
        
        return [
            {
                'id': task.id,
                **task.to_dict()
            }
            for task in tasks
        ]
    except Exception as e:
        print(f"Error retrieving tasks: {e}")
        return []


async def update_task_status(task_id: str, status: str) -> bool:
    """Update a task's status."""
    if not db:
        return False
        
    try:
        db.collection('tasks').document(task_id).update({
            'status': status,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        return True
    except Exception as e:
        print(f"Error updating task: {e}")
        return False


# === MEMORY / RAG ===

async def save_memory(user_id: str, content: str, metadata: Dict = None) -> Optional[str]:
    """Save a memory/context to Firestore."""
    if not db:
        return None
        
    try:
        doc_ref = db.collection('memory_vectors').add({
            'userId': user_id,
            'content': content,
            'metadata': metadata or {},
            'createdAt': firestore.SERVER_TIMESTAMP
        })
        return doc_ref[1].id
    except Exception as e:
        print(f"Error saving memory: {e}")
        return None


async def search_memories(user_id: str, query: str, limit: int = 10) -> List[Dict]:
    """Search memories (basic text search - implement vector search for production)."""
    if not db:
        return []
        
    try:
        # Basic search - for production, use vector embeddings
        memories = (
            db.collection('memory_vectors')
            .where('userId', '==', user_id)
            .limit(limit)
            .stream()
        )
        
        results = []
        for mem in memories:
            data = mem.to_dict()
            if query.lower() in data.get('content', '').lower():
                results.append({
                    'id': mem.id,
                    **data
                })
        
        return results
    except Exception as e:
        print(f"Error searching memories: {e}")
        return []


# === RESEARCH CACHE ===

async def cache_research_result(url: str, content: str, metadata: Dict = None) -> Optional[str]:
    """Cache web scraping or research results."""
    if not db:
        return None
        
    try:
        doc_ref = db.collection('research_cache').add({
            'url': url,
            'content': content,
            'metadata': metadata or {},
            'cachedAt': firestore.SERVER_TIMESTAMP,
            'expiresAt': datetime.utcnow().timestamp() + (7 * 24 * 60 * 60)  # 7 days
        })
        return doc_ref[1].id
    except Exception as e:
        print(f"Error caching research: {e}")
        return None


async def get_cached_research(url: str) -> Optional[Dict]:
    """Retrieve cached research result."""
    if not db:
        return None
        
    try:
        results = (
            db.collection('research_cache')
            .where('url', '==', url)
            .order_by('cachedAt', direction=firestore.Query.DESCENDING)
            .limit(1)
            .stream()
        )
        
        for result in results:
            data = result.to_dict()
            # Check if expired
            if data.get('expiresAt', 0) > datetime.utcnow().timestamp():
                return {
                    'id': result.id,
                    **data
                }
        
        return None
    except Exception as e:
        print(f"Error retrieving cached research: {e}")
        return None


# === USAGE EXAMPLES ===

"""
# In your FastAPI endpoints:

from backend.firebase_utils import save_chat_message, get_chat_history, save_task

@app.post("/api/chat")
async def chat(message: ChatMessage):
    # ... existing chat logic ...
    
    # Save to Firestore
    await save_chat_message(
        user_id="user_123",  # Get from auth
        role="user",
        content=message.message
    )
    
    # ... get AI response ...
    
    await save_chat_message(
        user_id="user_123",
        role="assistant",
        content=response
    )
    
    return {"response": response}

@app.get("/api/chat/history")
async def get_history():
    history = await get_chat_history("user_123", limit=50)
    return {"messages": history}
"""
