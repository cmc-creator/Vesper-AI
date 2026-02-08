# 💙 VESPER AI - Your Intelligent AI Assistant

Your personal AI companion with persistent memory, 3D game world, and cloud deployment capabilities.

## 🎯 Key Features

- **AI-Powered Chat** - Intelligent conversations with Anthropic Claude
- **Persistent Memory** - Firebase Firestore integration for conversation history
- **3D Game World** - Explore Vesper's castle in an immersive 3D environment
- **Deployment Manager** - Built-in page to monitor and manage deployments (**Press Ctrl+D**)
- **Real-time Sync** - Firebase Firestore for cross-device synchronization
- **Customizable UI** - Beautiful, futuristic interface with glassmorphism effects

## 🚀 Accessing the Deployment Manager

**The Deploy Page is already built and integrated!** Access it in three ways:

1. **Keyboard Shortcut**: Press **`Ctrl+D`** (or `Cmd+D` on Mac)
2. **Command Palette**: Press `Ctrl+K`, then select "Deployment Manager"
3. **Floating Action Button**: Click the FAB and select "Deploy"

The Deployment Manager shows real-time status for:
- ✅ Backend Service (Railway) - API health checks
- ✅ Frontend App (Vercel) - Deployment status
- ✅ Firebase - Connection status

For complete details, see **[ACCESSING-DEPLOY-PAGE.md](./ACCESSING-DEPLOY-PAGE.md)**

## 📦 Quick Start (Local Development)

### Prerequisites
- **Node.js 18+**
- **Python 3.10+**
- **Anthropic API Key** - Get one at [console.anthropic.com](https://console.anthropic.com/)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/cmc-creator/Vesper-AI.git
cd Vesper-AI

# Install frontend dependencies
cd frontend
npm install --legacy-peer-deps

# Install backend dependencies (in a new terminal)
cd ../
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

**Backend (.env in root):**
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
FIREBASE_PROJECT_ID=your-firebase-project-id
```

**Frontend (frontend/.env):**
```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. Run the Application

**Terminal 1 - Backend:**
```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access the app:** Open `http://localhost:5174` in your browser

## 🌐 Deployment to Production

### Deploy Backend to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Add environment variables in Railway dashboard:
# - ANTHROPIC_API_KEY
# - FIREBASE_CREDENTIALS_PATH (paste JSON content)
# - FIREBASE_PROJECT_ID
```

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel login
vercel --prod

# Add all VITE_* environment variables in Vercel dashboard
# Update VITE_API_URL to your Railway URL
```

**For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)**

## 🎮 Features Overview

### Chat Interface
- Real-time AI conversations with Claude
- Markdown and code syntax highlighting
- Voice input support
- Message history stored in Firebase

### 3D Game World
- Explore Vesper's castle in immersive 3D
- Talk to Vesper NPC character
- Weather system (clear, rain, sunset, night, fog)
- WASD controls for movement

### Deployment Manager (Ctrl+D)
- Monitor backend API health status
- Check frontend deployment status  
- View Firebase connection
- Quick deployment guides
- Refresh status button

### Command Palette (Ctrl+K)
- Quick actions and navigation
- Search functionality
- Keyboard shortcuts
- Access all features quickly

## 📁 Project Structure

```
Vesper-AI/
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── DeployPage.jsx      # Deployment manager
│   │   │   ├── CommandPalette.jsx  # Command palette
│   │   │   └── ...
│   │   ├── game/          # 3D game world
│   │   │   ├── Game.jsx
│   │   │   ├── Castle.jsx
│   │   │   └── ...
│   │   └── firebase.js    # Firebase config
│   ├── public/            # Static assets
│   ├── package.json
│   └── vite.config.js
├── backend/               # FastAPI Python backend
│   ├── main.py           # Main API server
│   └── firebase_utils.py # Firebase utilities
├── vercel.json           # Vercel deployment config
├── railway.json          # Railway deployment config
├── Procfile              # Railway start command
├── requirements.txt      # Python dependencies
├── DEPLOYMENT.md         # Detailed deployment guide
└── ACCESSING-DEPLOY-PAGE.md  # Deploy page documentation
```

## 🔑 Environment Variables

See `frontend/.env.example` for frontend variables and `.env.example` for backend variables.

## 🛠️ Troubleshooting

### Deploy Page Issues
- Make sure you're running the frontend (`npm run dev`)
- Try `Ctrl+K` to open Command Palette, then select "Deployment Manager"
- Check browser console for errors

### Build Issues
- Use `npm install --legacy-peer-deps` in frontend directory
- Make sure all environment variables are set
- Check that Python backend dependencies are installed

### Backend Connection Issues
- Verify `VITE_API_URL` points to correct backend URL
- Check backend is running on the specified port
- Test `/health` endpoint directly

## 📚 Additional Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[ACCESSING-DEPLOY-PAGE.md](./ACCESSING-DEPLOY-PAGE.md)** - Deploy page documentation
- **[DEPLOY_PAGE.md](./DEPLOY_PAGE.md)** - Deploy page feature details
- **[SETUP-COMPLETE.md](./SETUP-COMPLETE.md)** - Setup completion checklist

## 🎯 Quick Reference

| Action | Shortcut |
|--------|----------|
| Open Command Palette | `Ctrl+K` |
| Open Deploy Manager | `Ctrl+D` |
| Enter Game World | `Ctrl+G` |
| New Chat | `Ctrl+N` |

## ✅ Current Status

- ✅ Frontend builds successfully
- ✅ DeployPage component fully integrated
- ✅ Keyboard shortcuts configured
- ✅ Vercel deployment config ready
- ✅ Railway deployment config ready
- ✅ Health check endpoint implemented
- ⚠️ PWA plugin temporarily disabled (dependency issue)

## 💡 Tips

- Press **`Ctrl+D`** anytime to check deployment status
- Use **`Ctrl+K`** for quick access to all features
- Check `DEPLOYMENT.md` for production deployment steps
- All conversations are saved to Firebase Firestore

## 🤝 Contributing

This is a personal project, but feel free to fork and customize!

## 📄 License

MIT License - See LICENSE file for details

---

*Built with ❤️ by CC and Vesper* ✨  
*Powered by Anthropic Claude, React, FastAPI, and Firebase*

**Need help?** Check [ACCESSING-DEPLOY-PAGE.md](./ACCESSING-DEPLOY-PAGE.md) for deploy page access instructions.

