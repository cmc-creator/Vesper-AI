# 🌌 Vesper AI - Development Guide

## Quick Start

### Prerequisites
- **Python 3.9+** with pip
- **Node.js 18+** with npm
- **Git**

### 1. Clone and Setup

```bash
git clone <repository-url>
cd VesperApp
```

### 2. Install Dependencies

**Backend (Python):**
```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows PowerShell
pip install -r requirements.txt
```

**Frontend (Node.js):**
```bash
cd frontend
npm install
cd ..
```

### 3. Configure Environment

**Backend `.env` (root directory):**
```env
# Copy from .env.example and fill in your values
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

**Frontend `.env` (frontend directory):**
```env
# Copy from frontend/.env.example
VITE_API_URL=http://localhost:8000
VITE_CHAT_API_URL=http://localhost:3000

# Firebase (optional - for cloud sync)
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... etc
```

### 4. Start Development Servers

**Option A: Automated Startup (Recommended)**
```bash
.\start-dev-server.ps1
```

**Option B: Manual Startup**

Terminal 1 - Backend:
```bash
.\.venv\Scripts\Activate.ps1
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## Features

### ✨ Core Features
- 🧠 **Neural Chat** - AI-powered conversations with Vesper
- 🔬 **Research Tools** - Web scraping, database access, file processing
- 💾 **Memory Core** - Persistent memory with categorization
- ✅ **Task Matrix** - Multi-status task management (Inbox → Doing → Done)
- 🎨 **Theme System** - 5 cyberpunk themes (Cyan Matrix, Neon Green, etc.)
- 🌍 **3D World** - Explorable game environment with NPCs

### 🎮 Game Features
- Character customization
- Horse riding & unicorn flying
- Fishing, crafting, gathering systems
- Combat & magic abilities
- Quest system with achievements
- Day/night cycle & seasonal changes
- Castle & player home interiors

### 🔥 Tech Stack
- **Frontend**: React 18, Vite, Three.js, Material-UI, Framer Motion
- **Backend**: FastAPI, Python 3.9+
- **Database**: JSON files (dev) / Firebase (optional)
- **AI**: OpenAI GPT, Claude (Anthropic)

---

## Architecture

```
VesperApp/
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── game/          # 3D game components
│   │   ├── firebase.js    # Firebase config
│   │   └── enhancements.css
│   ├── App.jsx            # Main app component
│   ├── App.css            # Core styles
│   └── package.json
│
├── backend/               # FastAPI backend
│   ├── main.py            # API endpoints
│   └── firebase_utils.py  # Firestore helpers
│
├── vesper-ai/             # Data & AI logic
│   ├── knowledge/         # Research data
│   ├── memory/            # Memory categories
│   ├── style/             # Avatar & themes
│   ├── sassy/             # Personality upgrades
│   ├── growth/            # Learning system
│   └── tasks.json         # Task storage
│
└── start-dev-server.ps1   # Dev server launcher
```

---

## API Endpoints

### Chat & Messages
- `POST /chat` - Send message to AI
- `GET /api/threads` - Get conversation threads
- `POST /api/threads` - Create new thread

### Research
- `GET /api/research` - List research entries
- `POST /api/research` - Add research entry
- `GET /api/research/search?q=query` - Search research

### Memory
- `GET /api/memory/{category}` - Get memories (notes, conversations, etc.)
- `POST /api/memory/{category}` - Add memory
- `GET /api/search/{category}?q=query` - Search memories

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{idx}` - Update task status
- `DELETE /api/tasks/{idx}` - Delete task

### Utilities
- `GET /api/search-web?q=query` - Web search via DuckDuckGo
- `POST /api/scrape` - Scrape URL content

---

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Open command palette
- `C` - Toggle game world
- `V` (hold) - Voice input
- `Enter` - Send message
- `Shift + Enter` - New line in message

---

## Troubleshooting

### Backend won't start
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check Python version
python --version  # Should be 3.9+
```

### Frontend build errors
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Firebase not working
- Ensure all `VITE_FIREBASE_*` variables are set in `frontend/.env`
- If skipping Firebase, app runs in offline mode automatically

### Port already in use
```bash
# Kill process on port 8000 (backend)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Kill process on port 5173 (frontend)
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

## Development Tips

### Hot Reload
Both servers support hot reload:
- Backend: FastAPI auto-reloads on Python file changes
- Frontend: Vite HMR updates on save

### Adding New Endpoints
1. Add route in `backend/main.py`
2. Create data file in `vesper-ai/` if needed
3. Update frontend fetch calls in `App.jsx`

### Adding New Themes
Update `THEMES` array in `frontend/App.jsx`:
```javascript
{ id: 'orange', label: 'Orange Blaze', accent: '#ff8800', glow: '#ff9920', sub: '#ff6600' }
```

### Debugging
- Backend logs: Check terminal running uvicorn
- Frontend logs: Browser DevTools console (F12)
- API testing: http://localhost:8000/docs (Swagger UI)

---

## Production Build

### Frontend
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

### Deploy
Configured for Railway/Render deployment via:
- `Procfile` - Process definitions
- `railway.json` - Railway config
- `nixpacks.toml` - Build config

---

## Contributing

1. Create feature branch
2. Make changes
3. Test locally with `start-dev-server.ps1`
4. Submit PR with description

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues or questions:
- Check troubleshooting section above
- Review API docs: http://localhost:8000/docs
- Check console logs (browser F12)

---

**Built with 💙 by the Vesper AI Team**
