# 🚀 Vesper AI - Deployment Guide

This guide provides step-by-step instructions to deploy Vesper AI to production.

## 📋 Overview

Vesper AI consists of:
- **Backend**: FastAPI Python application
- **Frontend**: React + Vite application
- **Database**: Firebase Firestore (optional)

### Recommended Architecture

```
Frontend (Vercel) → Backend (Railway) → Firebase/Anthropic
```

---

## 🔑 Prerequisites

Before deploying, ensure you have:

1. **Anthropic API Key** - [Get one here](https://console.anthropic.com/)
2. **Firebase Project** (optional) - [Create at Firebase Console](https://console.firebase.google.com/)
3. **Railway Account** - [Sign up](https://railway.app/)
4. **Vercel Account** - [Sign up](https://vercel.com/)
5. **Git repository** pushed to GitHub

---

## 🚂 Backend Deployment (Railway)

### Step 1: Create Railway Project

1. Go to [Railway](https://railway.app/)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `Vesper-AI` repository
5. Railway will auto-detect the configuration from `railway.json`

### Step 2: Configure Environment Variables

In the Railway dashboard, add these environment variables:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional - Firebase Integration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
```

**For Firebase credentials:**
1. Download your service account JSON from Firebase Console
2. Copy the entire JSON content
3. In Railway, create a new environment variable `FIREBASE_CREDENTIALS`
4. Paste the JSON content as the value
5. Update your backend code to use this environment variable

### Step 3: Deploy

Railway will automatically:
1. Build using the Dockerfile
2. Install Python dependencies from `requirements.txt`
3. Start the server with `uvicorn backend.main:app`
4. Expose the service with a public URL

Your backend will be available at: `https://your-app-name.railway.app`

### Step 4: Verify Deployment

Test your backend:
```bash
curl https://your-app-name.railway.app/health
# Should return: {"status":"healthy","service":"vesper-ai-backend"}
```

---

## ▲ Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

Update `frontend/.env` with your production backend URL:

```env
VITE_API_URL=https://your-app-name.railway.app
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Step 2: Deploy to Vercel

#### Option A: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables (all `VITE_*` variables)
6. Click **"Deploy"**

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd frontend

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Step 3: Verify Deployment

Visit your Vercel URL (e.g., `https://vesper-ai.vercel.app`)

---

## 🔥 Firebase Setup (Optional)

If you're using Firebase for real-time features:

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"**
3. Follow the setup wizard

### 2. Enable Firestore

1. In Firebase Console → **Firestore Database**
2. Click **"Create database"**
3. Choose **Production mode** (with security rules)
4. Select your region

### 3. Get Credentials

**For Frontend:**
1. Project Settings → General
2. Scroll to "Your apps" → Web app
3. Copy configuration values to `frontend/.env`

**For Backend:**
1. Project Settings → Service Accounts
2. Click **"Generate new private key"**
3. Save the JSON file
4. Add to Railway as `FIREBASE_CREDENTIALS` environment variable

### 4. Security Rules

Update Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /chat_messages/{messageId} {
      allow read, write: if request.auth != null;
    }
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    match /memory_vectors/{memoryId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🛠️ Alternative Deployment Options

### Deploy Both on Railway

You can deploy both frontend and backend on Railway:

1. **Backend Service**: Follow Railway instructions above
2. **Frontend Service**: Create a second Railway service
   - Use Nixpacks builder
   - Set build command: `cd frontend && npm install && npm run build`
   - Set start command: `cd frontend && npm run preview`

### Deploy Using Docker

Build and run locally:

```bash
# Build Docker image
docker build -t vesper-ai .

# Run container
docker run -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your-key \
  vesper-ai
```

Deploy to any Docker-compatible platform:
- Google Cloud Run
- AWS ECS/Fargate
- Azure Container Instances
- DigitalOcean App Platform

---

## 📱 Progressive Web App (PWA)

The frontend is PWA-ready! After deployment:

1. **Desktop**: Look for install icon in browser address bar
2. **iOS**: Safari → Share → Add to Home Screen
3. **Android**: Chrome → Menu → Install App

### PWA Features
- ✅ Offline mode
- ✅ Install to home screen
- ✅ Background sync
- ✅ Push notifications (ready)

---

## 🔒 Security Checklist

Before going to production:

- [ ] Set strong CORS policies (update origins in backend)
- [ ] Use environment variables for all secrets
- [ ] Enable Firebase security rules (if using Firebase)
- [ ] Add rate limiting to API endpoints
- [ ] Enable HTTPS (automatic on Railway/Vercel)
- [ ] Review and restrict Firebase service account permissions
- [ ] Add authentication (Firebase Auth or custom)

---

## 🐛 Troubleshooting

### Backend Issues

**Railway build fails:**
- Check `requirements.txt` is up to date
- Verify Python version compatibility (3.10+)
- Check Railway logs: Dashboard → Service → Logs

**Health check failing:**
- Verify `/health` endpoint returns 200 status
- Check Railway logs for startup errors
- Ensure PORT environment variable is used

**API errors:**
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check CORS settings in backend
- Review Railway logs

### Frontend Issues

**Build fails on Vercel:**
- Check all `VITE_*` environment variables are set
- Verify `frontend/dist` directory structure
- Check build logs in Vercel dashboard

**API calls failing:**
- Verify `VITE_API_URL` points to correct Railway URL
- Check CORS is allowing your Vercel domain
- Test backend health endpoint directly

**PWA not installing:**
- Must be served over HTTPS (Vercel does this automatically)
- Check manifest.json is accessible
- Verify service worker registration in DevTools

### Firebase Issues

**Connection errors:**
- Verify all Firebase config values in `.env`
- Check Firestore is enabled
- Verify security rules allow access

**Authentication failing:**
- Ensure Firebase Auth is enabled
- Check auth provider configuration
- Verify auth flow in frontend

---

## 📊 Monitoring & Logs

### Railway Logs

View real-time logs:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# View logs
railway logs
```

### Vercel Logs

1. Go to Vercel Dashboard
2. Select your project
3. Click **"Deployments"**
4. Select a deployment
5. View **"Build Logs"** and **"Function Logs"**

---

## 💰 Cost Estimates

### Free Tier Options

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Railway | $5 credit/month | ~500 hours of small instance |
| Vercel | Unlimited | 100GB bandwidth, 6000 build minutes |
| Firebase | Spark Plan | Limited reads/writes, no billing required |
| Anthropic | Pay-as-you-go | Cost per API call |

### Typical Costs (Light Usage)

- Railway Backend: $5-10/month
- Vercel Frontend: Free
- Firebase: Free (Spark) or ~$1-5/month (Blaze)
- Anthropic API: ~$0.01-0.10 per chat (depending on model)

---

## 🚀 Quick Deploy Script

Save this as `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying Vesper AI..."

# Backend
echo "📦 Deploying backend to Railway..."
railway up

# Frontend
echo "🎨 Deploying frontend to Vercel..."
cd frontend
vercel --prod
cd ..

echo "✅ Deployment complete!"
echo "Backend: Check Railway dashboard for URL"
echo "Frontend: Check Vercel dashboard for URL"
```

Make it executable:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Vite Production Build](https://vitejs.dev/guide/build.html)

---

## 🆘 Need Help?

1. Check the [Issues](https://github.com/cmc-creator/Vesper-AI/issues) on GitHub
2. Review [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Firebase setup
3. Consult platform-specific docs (Railway/Vercel)
4. Join our community (if applicable)

---

**Built with ❤️ by the Vesper AI team**

*Last updated: February 2026*
