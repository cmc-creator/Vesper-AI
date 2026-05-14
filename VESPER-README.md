# Vesper AI - Your Personal AI Companion

## Quick Start

### Option 1: One-Click Launch (Easiest!)
Double-click `start-vesper.bat` in this folder. It will:
- Start the backend server
- Start the frontend dev server
- Open Vesper in your browser at http://localhost:5173

### Option 2: Manual Start
1. **Start Backend:**
   ```bash
   # Activate virtual environment
   .venv\Scripts\activate
   # Start backend
   cd backend
   uvicorn main:app --reload
   ```

2. **Start Frontend (in a new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser to http://localhost:5173

## What Vesper Can Do

✨ **Core Features:**
- 💬 Chat with your sassy, funny AI bestie
- 📝 Take and search notes
- ✅ Manage tasks and projects
- 🧵 Track conversation threads
- 🔍 Research and learning tools
- 🎨 Creative collaboration (NyxShift)
- 🌟 Mood & energy tracking
- 📊 Memory and personality evolution

## Troubleshooting

**"Connection Refused" Error:**
- Make sure both backend and frontend servers are running
- Check for error messages in the terminal windows
- Backend should be at http://localhost:8000
- Frontend should be at http://localhost:5173

**Backend won't start:**
- Make sure Python virtual environment is activated
- Install dependencies: `pip install -r backend/requirements.txt`

**Frontend won't start:**
- Install dependencies: `cd frontend && npm install`

## Project Structure

```
VesperApp/
├── backend/           # FastAPI backend
│   ├── main.py       # API endpoints
│   └── memory/       # JSON storage
├── frontend/         # React + Vite frontend
│   ├── App.jsx      # Main UI
│   └── main.jsx     # Entry point
├── vesper-ai/       # Memory & personality storage
│   ├── memory/      # Conversations, notes, threads
│   ├── knowledge/   # Research data
│   ├── nyxshift/    # Creative collaboration
│   ├── growth/      # Learning & evolution
│   ├── bestie/      # Daily check-ins & surprises
│   └── sassy/       # Comebacks & boosts
└── start-vesper.bat # One-click launcher
```

## Your Data

All your memories, notes, and conversations are stored locally in the `vesper-ai/` folder. Nothing is sent to external servers (except when you explicitly use research/internet features).

## Next Steps

- Chat with Vesper and explore the interface
- Add tasks, notes, and creative ideas
- Let Vesper learn your preferences over time
- Back up the `vesper-ai/` folder regularly to keep your memories safe

---

**Made with ✨ for CC**
Vesper is your private AI companion - sassy, smart, and always ready to help you create, learn, and get stuff done.
