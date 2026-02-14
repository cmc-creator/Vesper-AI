# Supabase Storage Setup Guide

## ✅ What's Integrated

Your Vesper AI now supports cloud storage for:
- **DALL-E Generated Images** - Save AI-generated artwork
- **Canvas Drawings** - Backup your collaborative whiteboard creations
- **Local Videos** - Store generated video files (coming soon)

## 📦 Create Storage Buckets

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `maqxeaobrwopedogsdcf`

2. **Navigate to Storage**
   - Click **Storage** in the left sidebar
   - Click **"+ New bucket"** button

3. **Create 3 Buckets** (one at a time):

   **Bucket 1: generated-images**
   - Name: `generated-images`
   - Public bucket: ✅ YES (so images are accessible via URL)
   - Click "Create bucket"

   **Bucket 2: canvas-drawings**
   - Name: `canvas-drawings`
   - Public bucket: ✅ YES
   - Click "Create bucket"

   **Bucket 3: local-videos**
   - Name: `local-videos`
   - Public bucket: ✅ YES
   - Click "Create bucket"

4. **Add Environment Variable to Railway**
   - Go to Railway dashboard → Your backend service
   - Click **Variables** tab
   - Add:
     - Key: `SUPABASE_KEY`
     - Value: Your Supabase **anon** key (get from Supabase Settings → API)
   
5. **Deploy & Test**
   - Railway will auto-deploy with the new variable
   - Test by generating an image in Vesper
   - Click "Save to Cloud" button
   - You should see: ✅ Saved to cloud! with a URL

## 🎨 How to Use

### Save Generated Images
1. Open **Image Generator** tool
2. Generate an image with DALL-E
3. Click **"Save to Cloud"** button
4. Image is uploaded to Supabase Storage
5. Copy the public URL to share anywhere

### Save Canvas Drawings
1. Open **Canvas** tool
2. Create your drawing
3. Click the **Cloud Upload** icon ☁️ in toolbar
4. Drawing is saved as PNG in cloud storage

### Check Your Files
- Supabase Dashboard → Storage → Select bucket
- View all uploaded files with public URLs
- Delete old files to save space

## 🔧 Backend Endpoints

- `POST /api/storage/init` - Initialize buckets (auto-called on startup)
- `POST /api/storage/save-image` - Upload image from URL or base64
- `POST /api/storage/save-canvas` - Upload canvas drawing

## ⚙️ Environment Variables

```env
# Already configured in Railway:
SUPABASE_URL=https://maqxeaobrwopedogsdcf.supabase.co
DATABASE_URL=postgresql://postgres.maqxeaobrwopedogsdcf:...

# Need to add:
SUPABASE_KEY=your-anon-key-here
```

## 🆘 Troubleshooting

**"Storage not enabled" error:**
- Check that `SUPABASE_KEY` is set in Railway
- Redeploy after adding the variable

**"Upload failed" error:**
- Verify bucket names match exactly: `generated-images`, `canvas-drawings`, `local-videos`
- Ensure buckets are set to **public**
- Check Supabase Storage policies allow uploads

**Files not showing:**
- Wait 2-3 seconds for upload to complete
- Check Supabase Dashboard → Storage to confirm upload
- Verify network connection

---

**All set! 🚀** Once you create the 3 buckets and add `SUPABASE_KEY` to Railway, your Vesper will automatically save images and canvas drawings to the cloud!
