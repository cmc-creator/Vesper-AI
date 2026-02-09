# ✅ Vesper AI - Setup Checklist

Follow this checklist to get Vesper AI running locally.

## Prerequisites ✓
- [ ] Python 3.9+ installed (`python --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

## Step 1: Clone & Navigate ✓
```bash
git clone <your-repo-url>
cd VesperApp
```

## Step 2: Backend Setup ✓
```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r requirements.txt
```

## Step 3: Frontend Setup ✓
```bash
cd frontend
npm install
cd ..
```

## Step 4: Environment Configuration ✓

### Root `.env` (Backend)
```bash
# Copy example file
copy .env.example .env

# Edit .env and add:
OPENAI_API_KEY=sk-...           # Optional: for OpenAI models
ANTHROPIC_API_KEY=sk-ant-...    # Optional: for Claude models
```

### Frontend `.env`
```bash
# Copy example file
copy frontend\.env.example frontend\.env

# Edit frontend\.env and set:
VITE_API_URL=http://localhost:8000
VITE_CHAT_API_URL=http://localhost:3000

# Firebase (optional - skip for local-only mode):
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
# etc...
```

## Step 5: Verify Data Directories ✓
These should be auto-created, but verify:
- [ ] `vesper-ai/knowledge/` exists
- [ ] `vesper-ai/memory/` exists
- [ ] `vesper-ai/tasks.json` exists

## Step 6: Start Servers ✓

### Option A: Automated (Recommended)
```bash
.\start-dev-server.ps1
```
This opens:
- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- Browser automatically

### Option B: Manual (Two terminals)

**Terminal 1 - Backend:**
```bash
.\.venv\Scripts\Activate.ps1
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Step 7: Verify It Works ✓
- [ ] Open http://localhost:5173 in browser
- [ ] See Vesper AI interface with hex grid background
- [ ] Type a message in chat (works even without AI keys)
- [ ] Click sidebar items (Research, Memory, Tasks)
- [ ] Backend API docs available at http://localhost:8000/docs

## Common Issues & Fixes

### ❌ Backend won't start
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# If yes, kill it:
taskkill /PID <process_id> /F

# Or use different port:
uvicorn main:app --reload --port 8001
```

### ❌ Frontend won't start
```bash
# Check if port 5173 is in use
netstat -ano | findstr :5173

# Clear cache and retry
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### ❌ "Module not found" errors
```bash
# Backend:
pip install -r requirements.txt --force-reinstall

# Frontend:
cd frontend
npm install
```

### ❌ Chat not working
- Backend must be running on port 8000 or port set in `VITE_API_URL`
- Check browser console (F12) for network errors
- Verify `.env` files are in correct locations

### ⚠️ Firebase warnings
If you see "Firebase config missing" - this is normal!
- App runs in offline mode if Firebase not configured
- Chat, Research, Memory, and Tasks all work locally
- Only multi-device sync requires Firebase

## Quick Test Commands

```bash
# Test backend health
curl http://localhost:8000/health

# Test task API
curl http://localhost:8000/api/tasks

# Test research API
curl http://localhost:8000/api/research

# Frontend build test
cd frontend
npm run build
```

## Next Steps After Setup ✓

1. **Customize Theme**: Click theme chips in sidebar (5 themes available)
2. **Add Research**: Click "Research Tools" → Add entries
3. **Create Tasks**: Click "Task Matrix" → Add tasks
4. **Store Memories**: Click "Memory Core" → Select category → Add
5. **Enter World**: Press 'C' or click "Enter World" to explore 3D environment
6. **Try Commands**: Press `Ctrl+K` to open command palette

## Feature Checklist

After setup, verify these features work:
- [ ] Chat interface sends/receives messages
- [ ] Research tool saves and displays entries
- [ ] Memory core stores notes in categories
- [ ] Task matrix shows Inbox/Doing/Done columns
- [ ] Theme switching changes colors instantly
- [ ] World toggle (press C) shows/hides 3D scene
- [ ] Sidebar navigation switches panels

## Production Build

When ready to deploy:
```bash
# Build frontend
cd frontend
npm run build

# Output in frontend/dist/

# Deploy backend + frontend/dist/ to your host
# Already configured for Railway, Render, Vercel
```

---

## Summary

**Minimum to run:**
1. Install Python & Node.js
2. Run `pip install -r requirements.txt`
3. Run `npm install` in frontend folder
4. Run `.\start-dev-server.ps1`
5. Open http://localhost:5173

**Optional enhancements:**
- Add API keys to `.env` for AI features
- Configure Firebase for cloud sync
- Customize themes and styles

---

✅ **All set!** You should now have Vesper AI running locally.

Need help? Check `DEV-GUIDE.md` for detailed documentation.
