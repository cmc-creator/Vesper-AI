from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
from datetime import datetime

app = FastAPI(title="Vesper AI Backend")

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MEMORY_DIR = os.path.join(os.path.dirname(__file__), 'memory')
CATEGORIES = [
    'conversations',
    'sensory_experiences',
    'creative_moments',
    'emotional_bonds'
]

os.makedirs(MEMORY_DIR, exist_ok=True)
for cat in CATEGORIES:
    path = os.path.join(MEMORY_DIR, f"{cat}.json")
    if not os.path.exists(path):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump([], f)

class MemoryEntry(BaseModel):
    timestamp: str
    content: str
    meta: Optional[Dict[str, Any]] = None

@app.get("/memory/{category}", response_model=List[MemoryEntry])
def get_memories(category: str):
    if category not in CATEGORIES:
        raise HTTPException(status_code=404, detail="Unknown category")
    path = os.path.join(MEMORY_DIR, f"{category}.json")
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

@app.post("/memory/{category}")
def add_memory(category: str, entry: MemoryEntry):
    if category not in CATEGORIES:
        raise HTTPException(status_code=404, detail="Unknown category")
    path = os.path.join(MEMORY_DIR, f"{category}.json")
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    data.append(entry.dict())
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}

@app.get("/memory/{category}/search")
def search_memory(category: str, q: str):
    if category not in CATEGORIES:
        raise HTTPException(status_code=404, detail="Unknown category")
    path = os.path.join(MEMORY_DIR, f"{category}.json")
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    results = [m for m in data if q.lower() in json.dumps(m).lower()]
    return results

@app.get("/categories")
def get_categories():
    return CATEGORIES

# Mood/Energy tracker (simple version)
mood_state = {"mood": "liminal", "energy": 0.5, "history": []}

@app.get("/mood")
def get_mood():
    return mood_state

@app.post("/mood")
def set_mood(mood: str, energy: float):
    mood_state["mood"] = mood
    mood_state["energy"] = energy
    mood_state["history"].append({"timestamp": datetime.now().isoformat(), "mood": mood, "energy": energy})
    return {"status": "ok"}

# Feature suggestion and growth (placeholder)
features = ["chat", "memory", "mood", "search", "self-growth"]

@app.get("/features")
def get_features():
    return features

@app.post("/features")
def add_feature(name: str):
    features.append(name)
    return {"status": "feature added", "feature": name}

@app.get("/")
def root():
    return {"message": "Vesper AI backend is running."}
