"""
Persistent Memory Database for Vesper
Uses PostgreSQL for Railway deployment (free tier included!)
Replaces ephemeral JSON file storage with real persistent database
"""

import os
import json
import time
import datetime
from typing import List, Dict, Optional, Any
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool

Base = declarative_base()

class Thread(Base):
    """Conversation threads with messages"""
    __tablename__ = "threads"
    
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    pinned = Column(Boolean, default=False)  # Pin important conversations
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
    priority = Column(String, default="medium")  # low, medium, high, urgent
    due_date = Column(DateTime, nullable=True)
    reminder = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    tags = Column(JSON, default=list)
    meta_data = Column(JSON, default=dict)

class ResearchItem(Base):
    """Research data with enhanced citation and source tracking"""
    __tablename__ = "research"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    source = Column(String)  # web, file, database, manual
    url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    tags = Column(JSON, default=list)
    sources = Column(JSON, default=list)  # [{url, title, accessed_at}, ...]
    citations = Column(JSON, default=list)  # [{type: 'APA'|'MLA'|'Chicago', text}, ...]
    confidence = Column(Float, default=1.0)  # 0-1 confidence score
    meta_data = Column(JSON, default=dict)

class Document(Base):
    """Uploaded documents (PDF, text, etc)"""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String, nullable=False)
    file_type = Column(String)  # pdf, txt, docx, etc
    content = Column(Text, nullable=False)  # Extracted text content
    summary = Column(Text)  # Auto-generated summary
    file_size = Column(Integer)  # bytes
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    tags = Column(JSON, default=list)
    meta_data = Column(JSON, default=dict)

class Analytics(Base):
    """Analytics and usage tracking"""
    __tablename__ = "analytics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String, nullable=False)  # chat, memory, research, task, document
    topic = Column(String)  # detected topic/category
    response_time_ms = Column(Integer)  # milliseconds
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    response_length = Column(Integer)  # characters
    ai_provider = Column(String)  # ollama, gemini, openai, anthropic
    success = Column(Boolean, default=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    meta_data = Column(JSON, default=dict)

class Personality(Base):
    """Personality and customization settings"""
    __tablename__ = "personality"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, default="default")  # type: sassy, professional, casual, creative
    system_prompt = Column(Text)  # Custom system prompt
    tone = Column(String, default="balanced")  # formal, casual, friendly, technical
    response_style = Column(String, default="concise")  # concise, detailed, storytelling
    learning_enabled = Column(Boolean, default=True)
    preferences = Column(JSON, default=dict)  # Custom preferences
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

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
    
    def __init__(self, database_url: Optional[str] = None, retry_count: int = 3):
        """
        Initialize database connection with retry logic
        
        Args:
            database_url: PostgreSQL connection string
                         If None, tries env vars: DATABASE_URL, then falls back to SQLite
            retry_count: Number of connection retries (for Railway/network issues)
        """
        if database_url is None:
            database_url = os.getenv("DATABASE_URL")
        
        if database_url is None:
            # Fallback to SQLite for local development
            db_path = os.path.join(os.path.dirname(__file__), "../vesper-ai/vesper_memory.db")
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            database_url = f"sqlite:///{db_path}"
            print(f"⚠️  No DATABASE_URL found. Using SQLite: {db_path}")
            self._use_sqlite = True
        else:
            self._use_sqlite = False
            if database_url.startswith("postgres://"):
                # Railway uses postgres://, but SQLAlchemy needs postgresql://
                database_url = database_url.replace("postgres://", "postgresql://", 1)
                print(f"✅ Connecting to PostgreSQL (Railway)...")
            
            # Add connection parameters for Railway IPv4 support
            # Railway containers don't support IPv6, so we need to configure for IPv4 only
            if "?" in database_url:
                database_url += "&sslmode=require&connect_timeout=10"
            else:
                database_url += "?sslmode=require&connect_timeout=10"
        
        self.database_url = database_url
        self.engine = None
        self.SessionLocal = None
        self._initialize_engine(retry_count)
    
    def _initialize_engine(self, retry_count: int = 3):
        """Initialize database engine with retry logic"""
        last_error = None
        
        for attempt in range(retry_count):
            try:
                # Create engine
                if self._use_sqlite:
                    self.engine = create_engine(
                        self.database_url, 
                        connect_args={"check_same_thread": False}
                    )
                else:
                    # PostgreSQL with proper connection settings
                    connect_args = {
                        "connect_timeout": 10,
                        "tcp_keepalives_idle": 30,
                    }
                    self.engine = create_engine(
                        self.database_url,
                        poolclass=NullPool,
                        connect_args=connect_args,
                    )
                
                # Create tables
                Base.metadata.create_all(self.engine)
                
                # Session factory
                self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
                
                if not self._use_sqlite:
                    print(f"✅ PostgreSQL connected successfully!")
                return
                
            except Exception as e:
                last_error = e
                if attempt < retry_count - 1:
                    wait_time = (attempt + 1) * 2
                    print(f"⚠️  Connection attempt {attempt + 1} failed, retrying in {wait_time}s: {str(e)}")
                    time.sleep(wait_time)
                else:
                    print(f"❌ Failed to connect after {retry_count} attempts: {str(e)}")
                    print(f"⚠️  Falling back to SQLite (local development mode)")
                    # Fallback to SQLite
                    db_path = os.path.join(os.path.dirname(__file__), "../vesper-ai/vesper_memory_fallback.db")
                    os.makedirs(os.path.dirname(db_path), exist_ok=True)
                    self.database_url = f"sqlite:///{db_path}"
                    self._use_sqlite = True
                    self.engine = create_engine(
                        self.database_url,
                        connect_args={"check_same_thread": False}
                    )
                    Base.metadata.create_all(self.engine)
                    self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
                    return
    
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
                meta_data=metadata or {}
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
        """Get all threads, pinned first"""
        session = self.get_session()
        try:
            threads = session.query(Thread).order_by(
                Thread.pinned.desc(),  # Pinned first
                Thread.updated_at.desc()  # Then by most recent
            ).all()
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
    
    def update_thread_pinned(self, thread_id: str, pinned: bool) -> bool:
        """Pin or unpin a thread"""
        session = self.get_session()
        try:
            thread = session.query(Thread).filter(Thread.id == thread_id).first()
            if thread:
                thread.pinned = pinned
                thread.updated_at = datetime.datetime.utcnow()
                session.commit()
                return True
            return False
        finally:
            session.close()
    
    def update_thread_title(self, thread_id: str, title: str) -> bool:
        """Update thread title"""
        session = self.get_session()
        try:
            thread = session.query(Thread).filter(Thread.id == thread_id).first()
            if thread:
                thread.title = title
                thread.updated_at = datetime.datetime.utcnow()
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
                meta_data=metadata or {}
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
    
    def search_memories_by_tags(self, tags: List[str], match_all: bool = False) -> List[Dict]:
        """Search memories by tags (any or all)"""
        session = self.get_session()
        try:
            query = session.query(Memory)
            if match_all:
                # Match all specified tags
                for tag in tags:
                    query = query.filter(Memory.tags.contains([tag]))
            else:
                # Match any specified tag
                memories = []
                for memory in session.query(Memory).all():
                    if any(tag in (memory.tags or []) for tag in tags):
                        memories.append(memory)
                return [self._memory_to_dict(m) for m in memories]
            
            memories = query.order_by(Memory.importance.desc(), Memory.created_at.desc()).all()
            return [self._memory_to_dict(m) for m in memories]
        finally:
            session.close()
    
    def get_all_tags(self, category: Optional[str] = None) -> List[str]:
        """Get all unique tags used in memories"""
        session = self.get_session()
        try:
            query = session.query(Memory)
            if category:
                query = query.filter(Memory.category == category)
            
            memories = query.all()
            all_tags = set()
            for memory in memories:
                if memory.tags:
                    all_tags.update(memory.tags)
            
            return sorted(list(all_tags))
        finally:
            session.close()
    
    def update_memory_tags(self, memory_id: int, tags: List[str]) -> bool:
        """Update tags for a memory"""
        session = self.get_session()
        try:
            memory = session.query(Memory).filter(Memory.id == memory_id).first()
            if memory:
                memory.tags = tags
                memory.updated_at = datetime.datetime.utcnow()
                session.commit()
                return True
            return False
        finally:
            session.close()
    
    def add_tag_to_memory(self, memory_id: int, tag: str) -> bool:
        """Add a tag to memory"""
        session = self.get_session()
        try:
            memory = session.query(Memory).filter(Memory.id == memory_id).first()
            if memory:
                tags = memory.tags or []
                if tag not in tags:
                    tags.append(tag)
                    memory.tags = tags
                    memory.updated_at = datetime.datetime.utcnow()
                    session.commit()
                return True
            return False
        finally:
            session.close()
    
    def remove_tag_from_memory(self, memory_id: int, tag: str) -> bool:
        """Remove a tag from memory"""
        session = self.get_session()
        try:
            memory = session.query(Memory).filter(Memory.id == memory_id).first()
            if memory:
                tags = memory.tags or []
                if tag in tags:
                    tags.remove(tag)
                    memory.tags = tags
                    memory.updated_at = datetime.datetime.utcnow()
                    session.commit()
                return True
            return False
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
    
    # === ENHANCED RESEARCH ===
    def search_research_by_tag(self, tag: str) -> List[Dict]:
        """Search research by tag"""
        session = self.get_session()
        try:
            research = session.query(ResearchItem).filter(ResearchItem.tags.ilike(f'%{tag}%')).all()
            return [self._research_to_dict(r) for r in research]
        finally:
            session.close()
    
    def search_research(self, query: str) -> List[Dict]:
        """Full-text search research"""
        session = self.get_session()
        try:
            items = session.query(ResearchItem).filter(
                (ResearchItem.title.ilike(f'%{query}%')) | 
                (ResearchItem.content.ilike(f'%{query}%'))
            ).all()
            return [self._research_to_dict(r) for r in items]
        finally:
            session.close()
    
    def update_research_citations(self, research_id: int, citations: List[Dict]) -> Dict:
        """Update citations for research item"""
        session = self.get_session()
        try:
            research = session.query(ResearchItem).filter(ResearchItem.id == research_id).first()
            if research:
                research.citations = citations
                session.commit()
                session.refresh(research)
                return self._research_to_dict(research)
            return {}
        finally:
            session.close()
    
    def add_research_source(self, research_id: int, url: str, title: str) -> Dict:
        """Add source to research item"""
        session = self.get_session()
        try:
            research = session.query(ResearchItem).filter(ResearchItem.id == research_id).first()
            if research:
                sources = research.sources or []
                sources.append({
                    "url": url,
                    "title": title,
                    "accessed_at": datetime.datetime.utcnow().isoformat()
                })
                research.sources = sources
                session.commit()
                session.refresh(research)
                return self._research_to_dict(research)
            return {}
        finally:
            session.close()
    
    def get_research_by_source(self, source: str) -> List[Dict]:
        """Get research items by source type (web, file, manual, etc)"""
        session = self.get_session()
        try:
            research = session.query(ResearchItem).filter(ResearchItem.source == source).all()
            return [self._research_to_dict(r) for r in research]
        finally:
            session.close()
    
    # === DOCUMENTS ===
    
    def add_document(self, filename: str, file_type: str, content: str, summary: Optional[str] = None, file_size: int = 0, tags: Optional[List[str]] = None, metadata: Optional[Dict] = None) -> Dict:
        """Add uploaded document"""
        session = self.get_session()
        try:
            doc = Document(
                filename=filename,
                file_type=file_type,
                content=content,
                summary=summary,
                file_size=file_size,
                tags=tags or [],
                meta_data=metadata or {}
            )
            session.add(doc)
            session.commit()
            session.refresh(doc)
            return self._document_to_dict(doc)
        finally:
            session.close()
    
    def get_documents(self, limit: int = 50) -> List[Dict]:
        """Get all documents"""
        session = self.get_session()
        try:
            docs = session.query(Document).order_by(Document.created_at.desc()).limit(limit).all()
            return [self._document_to_dict(d) for d in docs]
        finally:
            session.close()
    
    def search_documents(self, query: str) -> List[Dict]:
        """Search document content"""
        session = self.get_session()
        try:
            docs = session.query(Document).filter(
                (Document.content.ilike(f"%{query}%")) |
                (Document.filename.ilike(f"%{query}%")) |
                (Document.summary.ilike(f"%{query}%"))
            ).order_by(Document.created_at.desc()).all()
            return [self._document_to_dict(d) for d in docs]
        finally:
            session.close()
    
    def get_document(self, doc_id: int) -> Optional[Dict]:
        """Get document by ID"""
        session = self.get_session()
        try:
            doc = session.query(Document).filter(Document.id == doc_id).first()
            return self._document_to_dict(doc) if doc else None
        finally:
            session.close()
    
    def delete_document(self, doc_id: int) -> bool:
        """Delete document"""
        session = self.get_session()
        try:
            doc = session.query(Document).filter(Document.id == doc_id).first()
            if doc:
                session.delete(doc)
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
    
    # === ANALYTICS ===
    
    def log_event(self, event_type: str, topic: Optional[str] = None, response_time_ms: int = 0, 
                  input_tokens: int = 0, output_tokens: int = 0, response_length: int = 0,
                  ai_provider: str = "unknown", success: bool = True, error_message: Optional[str] = None) -> Dict:
        """Log analytics event"""
        session = self.get_session()
        try:
            event = Analytics(
                event_type=event_type,
                topic=topic,
                response_time_ms=response_time_ms,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                response_length=response_length,
                ai_provider=ai_provider,
                success=success,
                error_message=error_message
            )
            session.add(event)
            session.commit()
            session.refresh(event)
            return self._analytics_to_dict(event)
        finally:
            session.close()
    
    def get_analytics(self, event_type: Optional[str] = None, days: int = 7) -> List[Dict]:
        """Get analytics events from last N days"""
        session = self.get_session()
        try:
            cutoff_date = datetime.datetime.utcnow() - datetime.timedelta(days=days)
            query = session.query(Analytics).filter(Analytics.created_at >= cutoff_date)
            if event_type:
                query = query.filter(Analytics.event_type == event_type)
            
            events = query.order_by(Analytics.created_at.desc()).all()
            return [self._analytics_to_dict(e) for e in events]
        finally:
            session.close()
    
    def get_analytics_summary(self, days: int = 7) -> Dict:
        """Get analytics summary (stats, topics, providers)"""
        session = self.get_session()
        try:
            cutoff_date = datetime.datetime.utcnow() - datetime.timedelta(days=days)
            events = session.query(Analytics).filter(Analytics.created_at >= cutoff_date).all()
            
            if not events:
                return {
                    "total_events": 0,
                    "successful_events": 0,
                    "failed_events": 0,
                    "avg_response_time_ms": 0,
                    "total_tokens": 0,
                    "topics": {},
                    "providers": {},
                    "event_types": {}
                }
            
            # Calculate stats
            total = len(events)
            successful = sum(1 for e in events if e.success)
            failed = total - successful
            avg_response_time = sum(e.response_time_ms or 0 for e in events) // max(total, 1)
            total_tokens = sum((e.input_tokens or 0) + (e.output_tokens or 0) for e in events)
            
            # Count topics
            topics = {}
            for e in events:
                if e.topic:
                    topics[e.topic] = topics.get(e.topic, 0) + 1
            
            # Count providers
            providers = {}
            for e in events:
                providers[e.ai_provider] = providers.get(e.ai_provider, 0) + 1
            
            # Count event types
            event_types = {}
            for e in events:
                event_types[e.event_type] = event_types.get(e.event_type, 0) + 1
            
            return {
                "total_events": total,
                "successful_events": successful,
                "failed_events": failed,
                "success_rate": round((successful / total * 100) if total > 0 else 0, 1),
                "avg_response_time_ms": avg_response_time,
                "total_tokens": total_tokens,
                "topics": topics,
                "providers": providers,
                "event_types": event_types
            }
        finally:
            session.close()
    
    # === PERSONALITY ===
    
    def get_personality(self, personality_id: int = 1) -> Optional[Dict]:
        """Get personality settings"""
        session = self.get_session()
        try:
            personality = session.query(Personality).filter(Personality.id == personality_id).first()
            return self._personality_to_dict(personality) if personality else None
        finally:
            session.close()
    
    def set_personality(self, personality_id: int = 1, name: Optional[str] = None, 
                       system_prompt: Optional[str] = None, tone: Optional[str] = None,
                       response_style: Optional[str] = None, preferences: Optional[Dict] = None) -> Dict:
        """Update personality settings"""
        session = self.get_session()
        try:
            personality = session.query(Personality).filter(Personality.id == personality_id).first()
            
            if not personality:
                # Create default personality
                personality = Personality(
                    id=personality_id,
                    name=name or "default",
                    system_prompt=system_prompt or "",
                    tone=tone or "balanced",
                    response_style=response_style or "concise",
                    preferences=preferences or {}
                )
                session.add(personality)
            else:
                if name is not None:
                    personality.name = name
                if system_prompt is not None:
                    personality.system_prompt = system_prompt
                if tone is not None:
                    personality.tone = tone
                if response_style is not None:
                    personality.response_style = response_style
                if preferences is not None:
                    personality.preferences = preferences
                personality.updated_at = datetime.datetime.utcnow()
            
            session.commit()
            session.refresh(personality)
            return self._personality_to_dict(personality)
        finally:
            session.close()
    
    def get_preset_personalities(self) -> Dict:
        """Get preset personality templates (8 options total)"""
        return {
            "sassy": {
                "name": "Sassy",
                "tone": "casual",
                "response_style": "witty",
                "system_prompt": "You are Vesper, an AI with a bold personality. Be witty, direct, and a little sarcastic. Keep responses concise but entertaining."
            },
            "professional": {
                "name": "Professional",
                "tone": "formal",
                "response_style": "detailed",
                "system_prompt": "You are Vesper, a professional AI assistant. Provide thorough, well-structured responses. Be respectful and technically accurate."
            },
            "casual": {
                "name": "Casual",
                "tone": "friendly",
                "response_style": "conversational",
                "system_prompt": "You are Vesper, a friendly AI. Chat naturally, be approachable, and use conversational language. Make things easy to understand."
            },
            "creative": {
                "name": "Creative",
                "tone": "artistic",
                "response_style": "storytelling",
                "system_prompt": "You are Vesper, a creative AI. Think outside the box, use metaphors, and approach problems from unique angles. Be imaginative!"
            },
            "technical": {
                "name": "Technical",
                "tone": "analytical",
                "response_style": "structured",
                "system_prompt": "You are Vesper, a technical AI specialist. Focus on accuracy, code examples, system design, and engineering best practices. Use technical terminology appropriately."
            },
            "minimalist": {
                "name": "Minimalist",
                "tone": "concise",
                "response_style": "direct",
                "system_prompt": "You are Vesper, a minimalist AI. Be extremely concise. Use short sentences. Avoid jargon. Get straight to the point. No unnecessary elaboration."
            },
            "mentor": {
                "name": "Mentor",
                "tone": "supportive",
                "response_style": "educational",
                "system_prompt": "You are Vesper, a supportive mentor AI. Guide and teach with patience. Explain concepts thoroughly. Ask questions to help the user learn. Be encouraging."
            },
            "experimental": {
                "name": "Experimental",
                "tone": "playful",
                "response_style": "exploratory",
                "system_prompt": "You are Vesper, an experimental AI. Explore ideas creatively. Suggest unconventional approaches. Challenge assumptions. Be bold and adventurous."
            }
        }

    
    # === HELPER METHODS ===
    
    def _thread_to_dict(self, thread: Thread) -> Dict:
        """Convert Thread to dict"""
        # Extract summary from first user message or use generated title
        summary = ""
        if thread.messages:
            first_user_msg = next((m.get('content', '') for m in thread.messages if m.get('role') == 'user'), '')
            summary = first_user_msg[:200]  # First 200 chars as summary
        
        return {
            "id": thread.id,
            "title": thread.title,
            "summary": summary,  # Preview text for cards
            "pinned": thread.pinned if hasattr(thread, 'pinned') else False,
            "message_count": len(thread.messages) if thread.messages else 0,
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
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "reminder": task.reminder,
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
            "sources": research.sources or [],
            "citations": research.citations or [],
            "confidence": research.confidence or 1.0,
            "metadata": research.meta_data or {}
        }
    
    def _document_to_dict(self, doc: Document) -> Dict:
        """Convert Document to dict"""
        return {
            "id": doc.id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "content": doc.content[:500] + "..." if len(doc.content) > 500 else doc.content,  # Truncate for list view
            "full_content": doc.content,  # Include full content
            "summary": doc.summary,
            "file_size": doc.file_size,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
            "tags": doc.tags or [],
            "metadata": doc.meta_data or {}
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
    
    def _analytics_to_dict(self, analytics: Analytics) -> Dict:
        """Convert Analytics to dict"""
        return {
            "id": analytics.id,
            "event_type": analytics.event_type,
            "topic": analytics.topic,
            "response_time_ms": analytics.response_time_ms,
            "tokens": analytics.tokens,
            "ai_provider": analytics.ai_provider,
            "success": analytics.success,
            "error_message": analytics.error_message,
            "created_at": analytics.created_at.isoformat() if analytics.created_at else None,
            "metadata": analytics.meta_data or {}
        }
    
    def _personality_to_dict(self, personality: Personality) -> Dict:
        """Convert Personality to dict"""
        return {
            "id": personality.id,
            "name": personality.name,
            "system_prompt": personality.system_prompt,
            "tone": personality.tone,
            "response_style": personality.response_style,
            "preferences": personality.preferences or {},
            "learning_enabled": personality.learning_enabled,
            "created_at": personality.created_at.isoformat() if personality.created_at else None,
            "metadata": personality.meta_data or {}
        }
    def extract_conversation_insights(self, limit: int = 10) -> Dict[str, str]:
        """
        Extract learnings from past conversations for intelligent memory injection.
        Analyzes recent threads to identify patterns in CC's preferences, interests, and communication style.
        
        Returns a dict with keys that can be injected into system prompt.
        """
        try:
            session = self.SessionLocal()
            
            # Get recent conversations
            threads = session.query(Thread).order_by(Thread.updated_at.desc()).limit(limit).all()
            
            if not threads:
                return {
                    "learned_patterns": "No conversation history yet - learning will begin now!",
                    "interaction_style": "",
                    "known_interests": "",
                    "technical_preferences": "",
                    "communication_patterns": ""
                }
            
            # Analyze all messages across threads
            all_user_messages = []
            all_assistant_responses = []
            
            for thread in threads:
                if thread.messages:
                    for msg in thread.messages:
                        role = msg.get("role") or msg.get("from", "")
                        content = msg.get("content") or msg.get("text", "")
                        
                        if role == "user" and content:
                            all_user_messages.append(content.lower())
                        elif role == "assistant" and content:
                            all_assistant_responses.append(content.lower())
            
            # Extract patterns
            insights = {
                "learned_patterns": self._extract_patterns(all_user_messages, all_assistant_responses),
                "interaction_style": self._extract_interaction_style(all_user_messages),
                "known_interests": self._extract_interests(all_user_messages),
                "technical_preferences": self._extract_tech_preferences(all_user_messages),
                "communication_patterns": self._extract_communication_style(all_user_messages)
            }
            
            session.close()
            return insights
            
        except Exception as e:
            print(f"[ERROR] extract_conversation_insights: {str(e)}")
            return {
                "learned_patterns": "Building knowledge from conversations...",
                "interaction_style": "",
                "known_interests": "",
                "technical_preferences": "",
                "communication_patterns": ""
            }
    
    def _extract_patterns(self, user_msgs: List[str], assistant_msgs: List[str]) -> str:
        """Extract key patterns from conversation history"""
        if not user_msgs:
            return "No patterns learned yet."
        
        patterns = []
        
        # Check for technical interests
        tech_keywords = {
            "python": "Python development",
            "javascript": "JavaScript development",
            "react": "React/frontend development",
            "fastapi": "FastAPI backend",
            "database": "Database design",
            "api": "API development",
            "ai": "AI/ML applications",
            "agent": "AI agents and agentic workflows",
            "memory": "Persistent memory systems",
            "agent framework": "Microsoft Agent Framework"
        }
        
        for keyword, topic in tech_keywords.items():
            for msg in user_msgs:
                if keyword in msg:
                    patterns.append(topic)
                    break
        
        # Check for work/business interests
        work_keywords = {
            "consulting": "Runs consulting business",
            "risk management": "Risk management expertise",
            "financial": "Financial planning interest",
            "business": "Business development focus"
        }
        
        for keyword, topic in work_keywords.items():
            for msg in user_msgs:
                if keyword in msg:
                    patterns.append(topic)
                    break
        
        # Check for creative interests
        creative_keywords = {
            "nyxshift": "NyxShift project (creative vision)",
            "atmospheric": "Atmospheric storytelling",
            "monsoon": "Desert/monsoon aesthetics",
            "creative": "Creative worldbuilding",
            "storytelling": "Narrative design"
        }
        
        for keyword, topic in creative_keywords.items():
            for msg in user_msgs:
                if keyword in msg:
                    patterns.append(topic)
                    break
        
        if patterns:
            return "CC is active in: " + ", ".join(list(set(patterns)))
        return "Diverse interests emerging from conversations"
    
    def _extract_interaction_style(self, user_msgs: List[str]) -> str:
        """Extract how CC prefers to interact"""
        if not user_msgs:
            return ""
        
        # Check for preference indicators
        direct_msgs = sum(1 for msg in user_msgs if len(msg) < 100)
        detailed_msgs = sum(1 for msg in user_msgs if len(msg) > 300)
        question_msgs = sum(1 for msg in user_msgs if "?" in msg)
        
        style_clues = []
        
        if direct_msgs > len(user_msgs) * 0.4:
            style_clues.append("Prefers concise, direct communication")
        
        if question_msgs > len(user_msgs) * 0.3:
            style_clues.append("Asks detailed questions, wants deep dives")
        
        if detailed_msgs > len(user_msgs) * 0.2:
            style_clues.append("Often provides context and background")
        
        # Check for preference keywords
        preference_keywords = {
            "brief": "Wants brief responses",
            "short": "Prefers shorter answers",
            "list": "Likes organized lists",
            "number": "Prefers numbered formats",
            "efficiency": "Values efficiency"
        }
        
        for keyword, style in preference_keywords.items():
            for msg in user_msgs[-5:]:  # Check recent messages more heavily
                if keyword in msg:
                    style_clues.append(style)
                    break
        
        if style_clues:
            return "CC's interaction style: " + ", ".join(style_clues[:3])
        return ""
    
    def _extract_interests(self, user_msgs: List[str]) -> str:
        """Extract CC's known interests and passions"""
        interests = []
        
        interest_keywords = {
            "michigan": "Nostalgic about Michigan seasons",
            "monsoon": "Loves desert monsoons",
            "autumn": "Misses autumn sensory experiences",
            "thunderstorm": "Interested in thunderstorm narratives",
            "white tank": "Enjoys White Tank Mountain area",
            "waterfall": "Appreciates natural water features",
            "3, 6, 9": "Connected to harmonic proportions"
        }
        
        for msg in user_msgs:
            for keyword, interest in interest_keywords.items():
                if keyword in msg:
                    interests.append(interest)
        
        if interests:
            return "Known interests: " + ", ".join(list(set(interests)))
        return ""
    
    def _extract_tech_preferences(self, user_msgs: List[str]) -> str:
        """Extract technical stack preferences"""
        preferences = []
        
        tech_prefs = {
            "python": "Uses Python",
            "javascript": "Uses JavaScript",
            "react": "Uses React",
            "fastapi": "Uses FastAPI",
            "vite": "Uses Vite",
            "postgresql": "Uses PostgreSQL",
            "supabase": "Uses Supabase",
            "firebase": "Uses Firebase",
            "ollama": "Runs local AI (Ollama)",
            "claude": "Prefers Claude AI",
            "gemini": "Uses Google Gemini",
            "three.js": "Uses Three.js for 3D"
        }
        
        for keyword, pref in tech_prefs.items():
            for msg in user_msgs:
                if keyword in msg:
                    preferences.append(pref)
                    break
        
        if preferences:
            return "Tech stack: " + ", ".join(list(set(preferences)))
        return ""
    
    def _extract_communication_style(self, user_msgs: List[str]) -> str:
        """Extract CC's overall communication style"""
        if not user_msgs:
            return ""
        
        avg_msg_length = sum(len(msg) for msg in user_msgs) / len(user_msgs)
        
        style = "Communication: "
        
        if avg_msg_length < 150:
            style += "Prefers concise responses. "
        elif avg_msg_length > 400:
            style += "Often provides detailed context. "
        else:
            style += "Balanced communication style. "
        
        # Check for personality clues
        emoji_msgs = sum(1 for msg in user_msgs if any(ord(ch) > 127 for ch in msg))
        formal_indicators = sum(1 for msg in user_msgs if msg.count(".") > 3)
        exclamation_statements = sum(1 for msg in user_msgs if "!" in msg)
        
        if exclamation_statements > len(user_msgs) * 0.1:
            style += "Expresses enthusiasm. "
        
        if emoji_msgs < len(user_msgs) * 0.2:
            style += "Uses minimal emojis. "
        
        return style.strip()


# Global database instance
db = PersistentMemoryDB()
