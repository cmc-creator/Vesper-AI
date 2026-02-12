"""
Test PostgreSQL connection
Run this after setting DATABASE_URL in backend/.env
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment
load_dotenv(backend_dir / ".env")

database_url = os.getenv("DATABASE_URL")

if not database_url:
    print("❌ DATABASE_URL not found in .env file")
    sys.exit(1)

if not database_url.startswith("postgresql://"):
    print(f"❌ DATABASE_URL doesn't start with postgresql://")
    print(f"   Current: {database_url[:20]}...")
    sys.exit(1)

print(f"🔍 Testing connection to PostgreSQL...")
print(f"   Host: {database_url.split('@')[1].split('/')[0] if '@' in database_url else 'unknown'}")

try:
    # Create engine
    engine = create_engine(database_url)
    
    # Test connection
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version();"))
        version = result.fetchone()[0]
        print(f"\n✅ PostgreSQL connection successful!")
        print(f"   Version: {version.split(',')[0]}")
        
        # Check if tables exist
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        tables = [row[0] for row in result]
        
        if tables:
            print(f"   Existing tables: {', '.join(tables)}")
        else:
            print(f"   No tables yet (will be created on first run)")
            
    print(f"\n🚀 Ready to start backend with PostgreSQL!")
    
except Exception as e:
    print(f"\n❌ Connection failed: {e}")
    print(f"\n💡 Check your DATABASE_URL format:")
    print(f"   postgresql://username:password@host:port/database_name")
    sys.exit(1)
