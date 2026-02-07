# Vesper AI Assistant 🚀

> Your intelligent AI research and task management assistant - Now with PWA support and cloud deployment!

## ✨ Features

- **AI-Powered Chat** - Intelligent conversations with Anthropic Claude
- **Research Tools** - Web scraping, database queries, file processing
- **Task Management** - Organize and track your work
- **Memory System** - Persistent context and knowledge base
- **PWA Support** - Install on any device (Desktop, iOS, Android)
- **Real-time Sync** - Firebase Firestore integration
- **Offline Mode** - Works without internet connection
- **5 Color Themes** - Customizable futuristic UI

## 📱 Progressive Web App

Vesper is now a full PWA! Install it on:
- **Desktop**: Click install button in browser address bar
- **iOS**: Safari > Share > Add to Home Screen
- **Android**: Chrome > Menu > Install App

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" and follow the wizard
3. Enable Google Analytics (optional)

### 2. Get Web App Credentials

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click the Web icon (</>) to add a web app
4. Register app with nickname "Vesper Web"
5. Copy the firebaseConfig object values

### 3. Configure Frontend

Create `frontend/.env` with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_API_URL=http://localhost:8000
```

### 4. Enable Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development
4. Select your preferred region
5. Click "Enable"

### 5. Download Service Account (Backend)

1. Go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save JSON file as `firebase-service-account.json` in project root
4. Update `.env`:

```env
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
FIREBASE_PROJECT_ID=your_project_id
```

## 🚂 Railway Deployment (Backend)

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Deploy Backend

```bash
# Login to Railway
railway login

# Initialize project
railway init

# Add environment variables in Railway dashboard:
# - ANTHROPIC_API_KEY
# - FIREBASE_CREDENTIALS_PATH (paste entire JSON content)
# - FIREBASE_PROJECT_ID

# Deploy
railway up
```

### 3. Get Railway URL

After deployment, Railway will provide a URL like:
`https://your-app.railway.app`

Update `frontend/.env`:
```env
VITE_API_URL=https://your-app.railway.app
```

## ▲ Vercel Deployment (Frontend)

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy Frontend

```bash
# From project root
cd frontend

# Login
vercel login

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Copy all VITE_* variables from .env
```

### 3. Production Deployment

```bash
vercel --prod
```

## 🛠️ Local Development

### Prerequisites

- **Node.js 18+**
- **Python 3.10+**
- **Anthropic API Key** ([Get one here](https://console.anthropic.com/))

### Backend Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Visit `http://localhost:5173`

## 📦 Build for Production

### Frontend

```bash
cd frontend
npm run build
```

Output in `frontend/dist/`

### Backend

```bash
# Already Python - just deploy with requirements.txt
```

## 🎨 PWA Icons

Generate PNG icons from the SVG template:

```bash
# Install imagemagick or use online converter
# Convert icon-512x512.svg to PNGs:
# - icon-72x72.png
# - icon-96x96.png
# - icon-128x128.png
# - icon-144x144.png
# - icon-152x152.png
# - icon-192x192.png
# - icon-384x384.png
# - icon-512x512.png
```

Place in `frontend/public/icons/`

## 🔒 Security Rules (Firestore)

Update Firebase Security Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Chat messages
    match /chat_messages/{messageId} {
      allow read, write: if request.auth != null;
    }
    
    // Tasks
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    
    // Memory
    match /memory_vectors/{memoryId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📝 Environment Variables

### Backend (.env)
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `FIREBASE_CREDENTIALS_PATH` - Path to service account JSON
- `FIREBASE_PROJECT_ID` - Firebase project ID

### Frontend (frontend/.env)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_API_URL` - Backend URL

## 🧪 Testing PWA Locally

1. Run production build:
```bash
cd frontend
npm run build
npm run preview
```

2. Open in browser (must be HTTPS or localhost)
3. Check for install prompt
4. Test offline mode (DevTools > Network > Offline)

## 📱 Mobile Testing

### iOS
1. Open in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Test as standalone app

### Android
1. Open in Chrome
2. Tap menu (three dots)
3. Tap "Install App"
4. Test as standalone app

## 🐛 Troubleshooting

### PWA not installing
- Ensure HTTPS (or localhost)
- Check manifest.json is accessible
- Verify service worker registration
- Check browser DevTools > Application tab

### Firebase connection errors
- Verify API keys in .env
- Check Firestore rules
- Ensure billing enabled (Blaze plan for serverless)

### Railway deployment issues
- Check logs: `railway logs`
- Verify environment variables
- Ensure requirements.txt is up to date

## 📚 Tech Stack

- **Frontend**: React 18, Vite, Material-UI, Firebase SDK
- **Backend**: FastAPI, Python, Firebase Admin SDK
- **Database**: Firebase Firestore
- **AI**: Anthropic Claude
- **Deployment**: Railway (backend), Vercel (frontend)
- **PWA**: Vite PWA Plugin, Workbox

## 🤝 Contributing

This is a personal project, but feel free to fork and customize!

## 📄 License

MIT License - See LICENSE file for details

## 🌟 Credits

Built with ❤️ by Conni
Powered by Anthropic Claude

---

**Need help?** Check the [Firebase docs](https://firebase.google.com/docs) or [Railway docs](https://docs.railway.app/)
