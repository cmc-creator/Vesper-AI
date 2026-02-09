# 🌌 Vesper AI - Quick Reference Card

## 💨 Fastest Start
```bash
START-HERE.bat          # Windows: Double-click this!
# OR
.\start-dev-server.ps1  # PowerShell alternative
```

## 🌐 URLs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health

## ⌨️ Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Ctrl/Cmd + K` | Command palette |
| `C` | Toggle 3D world |
| `V` (hold) | Voice input |
| `Enter` | Send message |
| `Shift + Enter` | New line |
| `Esc` | Close palettes |

## 📂 Project Structure
```
VesperApp/
├── frontend/          # React app
│   ├── App.jsx        # Main UI
│   ├── src/           # Components
│   └── .env           # Frontend config
├── backend/           # FastAPI
│   └── main.py        # All endpoints
├── vesper-ai/         # Data storage
│   ├── knowledge/     # Research
│   ├── memory/        # Memories
│   └── tasks.json     # Tasks
└── .env               # Backend config
```

## 🎨 Themes
1. **Cyan Matrix** - Default cyberpunk
2. **Neon Green** - Matrix vibes
3. **Purple Haze** - Dreamy purple
4. **Electric Blue** - Cool ocean
5. **Cyber Pink** - Hot magenta

*Click theme chips in sidebar to switch*

## 🔌 API Essentials

### Chat
```bash
POST /chat
{"message": "Hello Vesper"}
```

### Research
```bash
GET    /api/research
POST   /api/research {"title": "...", "summary": "..."}
```

### Memory
```bash
GET    /api/memory/notes
POST   /api/memory/notes {"content": "..."}
```

### Tasks
```bash
GET    /api/tasks
POST   /api/tasks {"title": "...", "status": "inbox"}
PUT    /api/tasks/0 {"status": "doing"}
DELETE /api/tasks/0
```

## 🐛 Quick Fixes

### Backend won't start
```bash
pip install -r requirements.txt --force-reinstall
```

### Frontend won't start
```bash
cd frontend
rm -rf node_modules
npm install
```

### Port in use
```bash
# Kill port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Kill port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Firebase warnings
Normal! App works offline. To enable:
```env
# frontend/.env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
# etc.
```

## 📦 Dependencies

**Python (backend):**
- fastapi, uvicorn
- anthropic (Claude)
- beautifulsoup4 (scraping)
- sqlalchemy, pymongo
- firebase-admin

**Node.js (frontend):**
- react, vite
- @mui/material (UI)
- three, @react-three/fiber (3D)
- framer-motion (animations)
- firebase (optional)

## 🚀 Development Flow

1. **Start servers** → `START-HERE.bat`
2. **Edit files** → Auto-reload active
3. **Test in browser** → http://localhost:5173
4. **Check logs** → Backend/Frontend terminals
5. **Build for prod** → `npm run build` in frontend

## 🎮 Game Controls
- `WASD` - Move character
- `Space` - Jump
- `E` - Interact
- `I` - Inventory
- `J` - Quest journal
- `M` - Map
- `Tab` - Character stats
- `C` - Exit world

## 📚 Documentation Files
- `DEV-GUIDE.md` - Full developer guide
- `SETUP-CHECKLIST.md` - Setup verification
- `README.md` - Project overview
- `.github/copilot-instructions.md` - Progress tracker

## ⚡ Pro Tips

1. **Hot Reload**: Both servers auto-reload on save
2. **API Testing**: Use `/docs` for interactive API docs
3. **Console Logs**: Press F12 for browser DevTools
4. **Data Location**: All data in `vesper-ai/` folder
5. **Theme Persist**: Selections saved to localStorage
6. **Offline Mode**: Everything works without AI keys
7. **Production**: Run `npm run build` before deploy

## 🎯 Feature Checklist
- [ ] Chat works (try typing a message)
- [ ] Research saves entries
- [ ] Memory stores notes
- [ ] Tasks show 3 columns
- [ ] Themes switch colors
- [ ] World toggles (press C)
- [ ] Sidebar navigates panels

## 🔧 Common Tasks

### Add new endpoint
1. Edit `backend/main.py`
2. Add FastAPI route
3. Reload happens automatically

### Add new component
1. Create in `frontend/src/components/`
2. Import in `App.jsx`
3. Use in render

### Change theme colors
Edit `THEMES` array in `App.jsx`:
```js
{ id: 'custom', label: 'My Theme', 
  accent: '#ff00ff', glow: '#ff00cc', sub: '#cc00ff' }
```

### Add new memory category
1. Update `CATEGORIES` in `backend/main.py`
2. Update category chips in `App.jsx`
3. File auto-created on first use

---

## ✅ Quick Health Check
```bash
# Test backend
curl http://localhost:8000/health

# Test frontend
curl http://localhost:5173

# Check if running
netstat -ano | findstr "8000 5173"
```

---

**Need more help?**
- `DEV-GUIDE.md` - Detailed docs
- `SETUP-CHECKLIST.md` - Step-by-step guide
- Backend logs - Server terminal
- Frontend logs - Browser console (F12)

**Built with 💙 Featuring a high-tech neural interface for AI ops**
