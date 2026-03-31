# Video Avatar Generation - Setup Complete ✓

## What's Been Done

✅ **Video File Placed**
- Your ElevenLabs video is now at: `backend/media/source/vesper_base.mp4`
- Size: 3.45 MB
- Ready to use as source for video avatar generation

✅ **FFmpeg Installed**
- Downloaded portable FFmpeg v123767
- Location: `C:\tools\ffmpeg\ffmpeg-master-latest-win64-gpl\bin`
- All video muxing operations will use this

✅ **Backend Updated**
- New endpoint: `POST /api/video-avatar/generate`
- Commit: `2f132412` - ffmpeg PATH added to startup script
- Commit: `ce9db5c7` - video generation endpoint implemented
- Endpoint validates source video, generates TTS audio, muxes video+audio

✅ **Media Folders Created**
- Source: `backend/media/source/`
- Output: `backend/media/output/`
- Static serving: `/media` HTTP prefix

---

## How to Test

### Step 1: Start the Development Server
```powershell
.\START-HERE.bat
# Or manually:
.\start-dev-server.ps1
```

Wait for both backend and frontend to be ready (~10-20 seconds).

### Step 2: Run the Test
```powershell
.\test-video-avatar.ps1
```

This script will:
- Check if backend is running
- Send test request to `/api/video-avatar/generate`
- Generate a video with your voice
- Return video URL at `/media/output/vesper_video_TIMESTAMP.mp4`

### Expected Response
```json
{
  "status": "ok",
  "source_video": "vesper_base.mp4",
  "video_url": "/media/output/vesper_video_20260330_120315.mp4",
  "video_path": "backend/media/output/vesper_video_20260330_120315.mp4",
  "mode": "video"
}
```

---

## How to Use in Frontend

Once tested, you can integrate into React component:

```jsx
// Call the endpoint
const response = await fetch('http://localhost:8000/api/video-avatar/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Your speaking text here",
    voice: "",  // Uses default (Lily voice)
    source_video: "vesper_base.mp4",
    stability: 0.5,
    similarity_boost: 0.75
  })
});

const result = await response.json();

// Display video
const videoUrl = `http://localhost:8000${result.video_url}`;
// Show in <video> element
```

---

## API Endpoint Details

**URL:** `http://localhost:8000/api/video-avatar/generate`

**Method:** POST

**Request Body:**
```json
{
  "text": "speaking text (required)",
  "voice": "voice_id (optional, defaults to Lily)",
  "source_video": "vesper_base.mp4 (required)",
  "stability": 0.5,
  "similarity_boost": 0.75
}
```

**Response:**
```json
{
  "status": "ok|error",
  "source_video": "vesper_base.mp4",
  "video_url": "/media/output/vesper_video_TIMESTAMP.mp4",
  "video_path": "backend/media/output/vesper_video_TIMESTAMP.mp4",
  "mode": "video",
  "note": "optional details"
}
```

---

## Troubleshooting

### "ffmpeg: command not found"
- Solution: Run startup script in new PowerShell terminal (PATH update needs clean session)
- Or: Run `.\test-video-avatar.ps1` in a new terminal

### "source video not found"
- Check file exists: `backend/media/source/vesper_base.mp4`
- Ensure exact filename in request matches

### "ffmpeg error" in response
- Check output folder has write permissions
- Verify video format is compatible (H.264 MP4 works best)
- Check disk space available

### Backend not responding
- Verify startup script ran successfully
- Check Python environment is activated
- Look for errors in backend terminal window

---

## Next Steps

1. **Test the endpoint** with `.\test-video-avatar.ps1`
2. **Verify video is generated** in `backend/media/output/`
3. **Integrate into frontend** - replace 3D avatar with `<video>` element when in video mode
4. **Add UI controls** - button to switch between 3D and video modes
5. **Optional: Customize** - add different source videos, personalities, voice options

---

## File Locations

```
Vesper-AI/
├── backend/
│   ├── media/
│   │   ├── source/
│   │   │   └── vesper_base.mp4         ← Your source video
│   │   └── output/
│   │       └── vesper_video_*.mp4      ← Generated videos
│   └── main.py                         ← Video generation endpoint
├── test-video-avatar.ps1               ← Test script
└── start-dev-server.ps1                ← Updated with ffmpeg PATH
```

---

**Ready to test?** Run: `.\test-video-avatar.ps1`
