"""
Supabase Storage Configuration & Helpers
Used for storing generated files: images (DALL-E), canvas drawings, local videos
"""

import os
from typing import Optional
import base64
from datetime import datetime

# Supabase credentials from environment
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://maqxeaobrwopedogsdcf.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

# Initialize Supabase client safely
supabase = None
try:
    if SUPABASE_KEY:
        from supabase import create_client, Client  # type: ignore
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"[WARN] Supabase storage initialization failed: {e}")
    supabase = None

# Storage bucket names
IMAGES_BUCKET = "generated-images"
CANVAS_BUCKET = "canvas-drawings"
VIDEOS_BUCKET = "local-videos"

def ensure_buckets():
    """Create storage buckets if they don't exist"""
    if not supabase:
        return
    
    buckets = [IMAGES_BUCKET, CANVAS_BUCKET, VIDEOS_BUCKET]
    existing = supabase.storage.list_buckets()
    existing_names = [b['name'] for b in existing]
    
    for bucket in buckets:
        if bucket not in existing_names:
            supabase.storage.create_bucket(bucket, {"public": True})
            print(f"✅ Created storage bucket: {bucket}")

def upload_image(image_data: bytes, filename: str, bucket: str = IMAGES_BUCKET) -> Optional[str]:
    """
    Upload image to Supabase Storage
    Returns: Public URL of uploaded file
    """
    if not supabase:
        return None
    
    try:
        # Add timestamp to filename to avoid collisions
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{filename}"
        
        # Upload file
        supabase.storage.from_(bucket).upload(
            unique_filename,
            image_data,
            {"content-type": "image/png"}
        )
        
        # Get public URL
        public_url = supabase.storage.from_(bucket).get_public_url(unique_filename)
        return public_url
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return None

def upload_canvas(canvas_data: str, filename: str) -> Optional[str]:
    """
    Upload canvas drawing (base64) to Supabase Storage
    Returns: Public URL
    """
    if not supabase:
        return None
    
    try:
        # Decode base64 canvas data
        image_data = base64.b64decode(canvas_data.split(',')[1])
        return upload_image(image_data, filename, CANVAS_BUCKET)
    except Exception as e:
        print(f"❌ Canvas upload failed: {e}")
        return None

def upload_video(video_data: bytes, filename: str) -> Optional[str]:
    """
    Upload local video to Supabase Storage
    Returns: Public URL
    """
    if not supabase:
        return None
    
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{filename}"
        
        supabase.storage.from_(VIDEOS_BUCKET).upload(
            unique_filename,
            video_data,
            {"content-type": "video/mp4"}
        )
        
        public_url = supabase.storage.from_(VIDEOS_BUCKET).get_public_url(unique_filename)
        return public_url
    except Exception as e:
        print(f"❌ Video upload failed: {e}")
        return None

def list_files(bucket: str, folder: str = "") -> list:
    """List files in a storage bucket"""
    if not supabase:
        return []
    
    try:
        return supabase.storage.from_(bucket).list(folder)
    except Exception as e:
        print(f"❌ List files failed: {e}")
        return []

def delete_file(bucket: str, filename: str) -> bool:
    """Delete a file from storage"""
    if not supabase:
        return False
    
    try:
        supabase.storage.from_(bucket).remove([filename])
        return True
    except Exception as e:
        print(f"❌ Delete failed: {e}")
        return False
