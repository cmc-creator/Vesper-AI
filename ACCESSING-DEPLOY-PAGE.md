# Accessing the Deployment Manager

## Overview
Vesper AI includes a built-in **Deployment Manager** page that allows you to monitor and manage your deployments to Vercel (frontend) and Railway (backend).

## ✅ The Deploy Page Already Exists!

The DeployPage component is already integrated into the application. You can access it in three ways:

### Method 1: Keyboard Shortcut (Recommended)
Press **`Ctrl+D`** (Windows/Linux) or **`Cmd+D`** (Mac) from anywhere in the application.

### Method 2: Command Palette
1. Press **`Ctrl+K`** (or `Cmd+K` on Mac) to open the Command Palette
2. Type "Deploy" or select **"Deployment Manager"** from the list
3. Press Enter

### Method 3: Floating Action Button (FAB)
1. Look for the floating button in the bottom-right corner of the screen
2. Click it to open the action menu
3. Select **"Deploy"** from the menu

## What Does the Deploy Page Show?

The Deployment Manager displays real-time status for:

### 1. Backend Service (Railway)
- **API URL**: Your Railway backend endpoint
- **Status**: Health check (Healthy/Offline/Unknown)
- Shows if your FastAPI backend is running

### 2. Frontend App (Vercel)
- **App URL**: Your current frontend URL
- **Status**: Always shows "Active" when you're viewing it
- Displays the URL where your app is deployed

### 3. Firebase
- **Project ID**: Your Firebase project identifier
- **Status**: Connection status (Connected/Disconnected)
- Indicates if Firebase is properly configured

## Features Available

- **Refresh Status**: Updates the health checks for all services
- **View Docs**: Opens the DEPLOYMENT.md documentation
- **Deployment Guide**: Quick reference for Railway and Vercel CLI commands
- **Quick Actions**: Buttons for common deployment tasks

## Setting Up Deployments

### Prerequisites
The following configuration files are already in place:
- ✅ `vercel.json` - Vercel deployment configuration
- ✅ `railway.json` - Railway deployment configuration
- ✅ `Procfile` - Railway start command
- ✅ `DEPLOYMENT.md` - Complete deployment guide

### To Deploy Backend to Railway:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project (from repo root)
railway init

# Deploy
railway up

# Add environment variables in Railway dashboard:
# - ANTHROPIC_API_KEY
# - FIREBASE_CREDENTIALS_PATH (paste JSON content)
# - FIREBASE_PROJECT_ID
```

### To Deploy Frontend to Vercel:

```bash
# Install Vercel CLI
npm install -g vercel

# From project root, go to frontend
cd frontend

# Login to Vercel
vercel login

# Deploy for preview
vercel

# Deploy to production
vercel --prod

# Add environment variables in Vercel dashboard
# Copy all VITE_* variables from frontend/.env
```

## Troubleshooting

### "Backend shows Offline"
1. Make sure your Railway backend is deployed and running
2. Check that `VITE_API_URL` environment variable in Vercel points to your Railway URL
3. Verify the backend has a `/health` endpoint

### "Firebase shows Disconnected"  
1. Check that `VITE_FIREBASE_PROJECT_ID` is set in your environment variables
2. Verify all Firebase configuration variables are set correctly in `frontend/.env`
3. Make sure you've created a Firebase project and enabled Firestore

### "Deploy Page won't open"
1. Verify you're using the correct keyboard shortcut for your OS
2. Try accessing via Command Palette (`Ctrl+K`)
3. Check browser console for any JavaScript errors
4. Make sure you're running the frontend application

## Environment Variables Reference

### Frontend (frontend/.env)
Required for deployment monitoring:
```env
VITE_API_URL=https://your-railway-app.railway.app
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Backend (.env)
Required for Railway deployment:
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
FIREBASE_PROJECT_ID=your-firebase-project-id
```

## Current Build Status

✅ **Frontend**: Builds successfully (tested)
✅ **DeployPage Component**: Fully integrated
✅ **Keyboard Shortcuts**: Configured
✅ **Command Palette**: Includes Deploy option
✅ **Vercel Config**: Ready
✅ **Railway Config**: Ready

## Notes

- The build currently has PWA plugin temporarily disabled due to a dependency issue
- The 3D game world feature uses Three.js and may increase bundle size
- For detailed deployment instructions, see `DEPLOYMENT.md`

## Quick Start Checklist

- [ ] Install dependencies: `cd frontend && npm install --legacy-peer-deps`
- [ ] Configure Firebase credentials in `frontend/.env`
- [ ] Deploy backend to Railway: `railway up`
- [ ] Update `VITE_API_URL` with Railway URL
- [ ] Deploy frontend to Vercel: `vercel --prod`
- [ ] Press `Ctrl+D` to open Deployment Manager and verify all services are online

## Additional Resources

- **Main Documentation**: See `README.md`
- **Deployment Guide**: See `DEPLOYMENT.md`
- **Deploy Page Details**: See `DEPLOY_PAGE.md`

---

**Last Updated**: February 2026
**Status**: DeployPage is fully functional and ready to use!
