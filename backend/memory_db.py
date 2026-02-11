"""
Persistent Memory Database for Vesper
Uses PostgreSQL for Railway deployment (free tier included!)
Replaces ephemeral JSON file storage with real persistent database
"""

import os
import json
import datetime
from typing import List, Dict, Optional, Any
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool

Base = declarative_base()

class Thread(Base):
    """Conversation threads with messages"""
    __tablename__ = "threads"
    
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    messages = Column(JSON, default=list)  # Store messages as JSON array
    meta_data = Column(JSON, default=dict)

class Memory(Base):
    """Memory entries by category"""
    __tablename__ = "memories"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String, nullable=False, index=True)  # personal, technical, preferences, events, relationships
    content = Column(Text, nullable=False)
    importance = Column(Integer, default=5)  # 1-10 scale
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    tags = Column(JSON, default=list)
    meta_data = Column(JSON, default=dict)

class Task(Base):
    """Task management"""
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="inbox")  # inbox, doing, done
    priority = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    tags = Column(JSON, default=list)
    meta_data = Column(JSON, default=dict)

class ResearchItem(Base):
    """Research data"""
    __tablename__ = "research"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    source = Column(String)  # web, file, database, manual
    url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    tags = Column(JSON, default=list)
    meta_data = Column(JSON, default=dict)

class Pattern(Base):
    """Learned patterns from feedback"""
    __tablename__ = "patterns"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    pattern_type = Column(String, nullable=False)  # user_preference, interaction_style, error_correction
    pattern_data = Column(JSON, nullable=False)
    confidence = Column(Integer, default=5)  # 1-10 scale
    occurrences = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    meta_data = Column(JSON, default=dict)


class PersistentMemoryDB:
    """Database manager for persistent memory"""
    
    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize database connection
        
        Args:
            database_url: PostgreSQL connection string
                         If None, tries env vars: DATABASE_URL, then falls back to SQLite
        """
        if database_url is None:
            database_url = os.getenv("DATABASE_URL")
        
        if database_url is None:
            # Fallback to SQLite for local development
            db_path = os.path.join(os.path.dirname(__file__), "../vesper-ai/vesper_memory.db")
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            database_url = f"sqlite:///{db_path}"
            print(f"⚠️  No DATABASE_URL found. Using SQLite: {db_path}")
        elif database_url.startswith("postgres://"):
            # Railway uses postgres://, but SQLAlchemy needs postgresql://
            database_url = database_url.replace("postgres://", "postgresql://", 1)
            print(f"✅ Connected to PostgreSQL (Railway)")
        
        # Create engine
        if database_url.startswith("sqlite"):
            self.engine = create_engine(database_url, connect_args={"check_same_thread": False})
        else:
            self.engine = create_engine(database_url, poolclass=NullPool)
        
        # Create tables
        Base.metadata.create_all(self.engine)
        
        # Session factory
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def get_session(self) -> Session:
        """Get database session"""
        return self.SessionLocal()
    
    # === THREADS ===
    
    def create_thread(self, thread_id: str, title: str, metadata: Optional[Dict] = None) -> Dict:
        """Create new conversation thread"""
        session = self.get_session()
        try:
            thread = Thread(
                id=thread_id,
                title=title,
                messages=[],
                metadata=metadata or {}
            )
            session.add(thread)
            session.commit()
            session.refresh(thread)
            return self._thread_to_dict(thread)
        finally:
            session.close()
    
    def get_thread(self, thread_id: str) -> Optional[Dict]:
        """Get thread by ID"""
        session = self.get_session()
        try:
            thread = session.query(Thread).filter(Thread.id == thread_id).first()
            return self._thread_to_dict(thread) if thread else None
        finally:
            session.close()
    
    def get_all_threads(self) -> List[Dict]:
        """Get all threads"""
        session = self.get_session()
        try:
            threads = session.query(Thread).order_by(Thread.updated_at.desc()).all()
            return [self._thread_to_dict(t) for t in threads]
        finally:
            session.close()
    
    def add_message_to_thread(self, thread_id: str, message: Dict) -> Optional[Dict]:
        """Add message to thread"""
        session = self.get_session()
        try:
            thread = session.query(Thread).filter(Thread.id == thread_id).first()
            if not thread:
                return None
            
            messages = thread.messages or []
            messages.append(message)
            thread.messages = messages
            thread.updated_at = datetime.datetime.utcnow()
            session.commit()
            session.refresh(thread)
            return self._thread_to_dict(thread)
        finally:
            session.close()
    
    def delete_thread(self, thread_id: str) -> bool:
        """Delete thread"""
        session = self.get_session()
        try:
            thread = session.query(Thread).filter(Thread.id == thread_id).first()
            if thread:
                session.delete(thread)
                session.commit()
                return True
            return False
        finally:
            session.close()
    
    # === MEMORY ===
    
    def add_memory(self, category: str, content: str, importance: int = 5, tags: Optional[List[str]] = None, metadata: Optional[Dict] = None) -> Dict:
        """Add memory entry"""
        session = self.get_session()
        try:
            memory = Memory(
                category=category,
                content=content,
                importance=importance,
                tags=tags or [],
                metadata=metadata or {}
            )
            session.add(memory)
            session.commit()
            session.refresh(memory)
            return self._memory_to_dict(memory)
        finally:
            session.close()
    
    def get_memories(self, category: Optional[str] = None, limit: int = 100) -> List[Dict]:
        """Get memories, optionally filtered by category"""
        session = self.get_session()
        try:
            query = session.query(Memory)
            if category:
                query = query.filter(Memory.category == category)
            memories = query.order_by(Memory.created_at.desc()).limit(limit).all()
            return [self._memory_to_dict(m) for m in memories]
        finally:
            session.close()
    
    def search_memories(self, query: str, category: Optional[str] = None) -> List[Dict]:
        """Search memories by content"""
        session = self.get_session()
        try:
            q = session.query(Memory).filter(Memory.content.ilike(f"%{query}%"))
            if category:
                q = q.filter(Memory.category == category)
            memories = q.order_by(Memory.importance.desc(), Memory.created_at.desc()).all()
            return [self._memory_to_dict(m) for m in memories]
        finally:
            session.close()
    
    def delete_memory(self, memory_id: int) -> bool:
        """Delete memory"""
        session = self.get_session()
        try:
            memory = session.query(Memory).filter(Memory.id == memory_id).first()
            if memory:
                session.delete(memory)
                session.commit()
                return True
            return False
        finally:
            session.close()
    
    # === TASKS ===
    
    def create_task(self, title: str, description: str = "", status: str = "inbox", priority: int = 0, tags: Optional[List[str]] = None) -> Dict:
        """Create new task"""
        session = self.get_session()
        try:
            task = Task(
                title=title,
                description=description,
                status=status,
                priority=priority,
                tags=tags or []
            )
            session.add(task)
            session.commit()
            session.refresh(task)
            return self._task_to_dict(task)
        finally:
            session.close()
    
    def get_tasks(self, status: Optional[str] = None) -> List[Dict]:
        """Get tasks, optionally filtered by status"""
        session = self.get_session()
        try:
            query = session.query(Task)
            if status:
                query = query.filter(Task.status == status)
            tasks = query.order_by(Task.priority.desc(), Task.created_at.desc()).all()
            return [self._task_to_dict(t) for t in tasks]
        finally:
            session.close()
    
    def update_task(self, task_id: int, **kwargs) -> Optional[Dict]:
        """Update task fields"""
        session = self.get_session()
        try:
            task = session.query(Task).filter(Task.id == task_id).first()
            if not task:
                return None
            
            for key, value in kwargs.items():
                if hasattr(task, key):
                    setattr(task, key, value)
            
            if kwargs.get("status") == "done" and not task.completed_at:
                task.completed_at = datetime.datetime.utcnow()
            
            session.commit()
            session.refresh(task)
            return self._task_to_dict(task)
        finally:
            session.close()
    
    def delete_task(self, task_id: int) -> bool:
        """Delete task"""
        session = self.get_session()
        try:
            task = session.query(Task).filter(Task.id == task_id).first()
            if task:
                session.delete(task)
                session.commit()
                return True
            return False
        finally:
            session.close()
    
    # === RESEARCH ===
    
    def add_research(self, title: str, content: str, source: str = "manual", url: Optional[str] = None, tags: Optional[List[str]] = None) -> Dict:
        """Add research item"""
        session = self.get_session()
        try:
            research = ResearchItem(
                title=title,
                content=content,
                source=source,
                url=url,
                tags=tags or []
            )
            session.add(research)
            session.commit()
            session.refresh(research)
            return self._research_to_dict(research)
        finally:
            session.close()
    
    def get_research(self, limit: int = 100) -> List[Dict]:
        """Get research items"""
        session = self.get_session()
        try:
            research = session.query(ResearchItem).order_by(ResearchItem.created_at.desc()).limit(limit).all()
            return [self._research_to_dict(r) for r in research]
        finally:
            session.close()
    
    def delete_research(self, research_id: int) -> bool:
        """Delete research item"""
        session = self.get_session()
        try:
            research = session.query(ResearchItem).filter(ResearchItem.id == research_id).first()
            if research:
                session.delete(research)
                session.commit()
                return True
            return False
        finally:
            session.close()
    
    # === PATTERNS ===
    
    def add_pattern(self, pattern_type: str, pattern_data: Dict, confidence: int = 5) -> Dict:
        """Add learned pattern"""
        session = self.get_session()
        try:
            pattern = Pattern(
                pattern_type=pattern_type,
                pattern_data=pattern_data,
                confidence=confidence
            )
            session.add(pattern)
            session.commit()
            session.refresh(pattern)
            return self._pattern_to_dict(pattern)
        finally:
            session.close()
    
    def get_patterns(self, pattern_type: Optional[str] = None) -> List[Dict]:
        """Get learned patterns"""
        session = self.get_session()
        try:
            query = session.query(Pattern)
            if pattern_type:
                query = query.filter(Pattern.pattern_type == pattern_type)
            patterns = query.order_by(Pattern.confidence.desc(), Pattern.occurrences.desc()).all()
            return [self._pattern_to_dict(p) for p in patterns]
        finally:
            session.close()
    
    # === HELPER METHODS ===
    
    def _thread_to_dict(self, thread: Thread) -> Dict:
        """Convert Thread to dict"""
        return {
            "id": thread.id,
            "title": thread.title,
            "created_at": thread.created_at.isoformat() if thread.created_at else None,
            "updated_at": thread.updated_at.isoformat() if thread.updated_at else None,
            "messages": thread.messages or [],
            "metadata": thread.meta_data or {}
        }
    
    def _memory_to_dict(self, memory: Memory) -> Dict:
        """Convert Memory to dict"""
        return {
            "id": memory.id,
            "category": memory.category,
            "content": memory.content,
            "importance": memory.importance,
            "created_at": memory.created_at.isoformat() if memory.created_at else None,
            "updated_at": memory.updated_at.isoformat() if memory.updated_at else None,
            "tags": memory.tags or [],
            "metadata": memory.meta_data or {}
        }
    
    def _task_to_dict(self, task: Task) -> Dict:
        """Convert Task to dict"""
        return {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "priority": task.priority,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "updated_at": task.updated_at.isoformat() if task.updated_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "tags": task.tags or [],
            "metadata": task.meta_data or {}
        }
    
    def _research_to_dict(self, research: ResearchItem) -> Dict:
        """Convert ResearchItem to dict"""
        return {
            "id": research.id,
            "title": research.title,
            "content": research.content,
            "source": research.source,
            "url": research.url,
            "created_at": research.created_at.isoformat() if research.created_at else None,
            "updated_at": research.updated_at.isoformat() if research.updated_at else None,
            "tags": research.tags or [],
            "metadata": research.meta_data or {}
        }
    
    def _pattern_to_dict(self, pattern: Pattern) -> Dict:
        """Convert Pattern to dict"""
        return {
            "id": pattern.id,
            "pattern_type": pattern.pattern_type,
            "pattern_data": pattern.pattern_data,
            "confidence": pattern.confidence,
            "occurrences": pattern.occurrences,
            "created_at": pattern.created_at.isoformat() if pattern.created_at else None,
            "last_seen": pattern.last_seen.isoformat() if pattern.last_seen else None,
            "metadata": pattern.meta_data or {}
        }


# Global database instance
db = PersistentMemoryDB()
