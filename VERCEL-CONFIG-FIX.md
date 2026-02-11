# Vercel Configuration Fix

## Problem
Vercel is trying to build from root directory, but React app is in `frontend/` folder.

Error: `npm error path /vercel/path1/package.json` - looking in wrong place!

## Solution: Configure Vercel Project Settings

### Option 1: Vercel Dashboard (Recommended)
1. Go to https://vercel.com/cmc-creator/vesper-ai/settings/general
2. Find "Build & Development Settings"
3. Set **Root Directory**: `frontend`
4. Click "Save"
5. Trigger new deployment

### Option 2: Via Vercel CLI
```bash
cd C:\Users\conni\VesperApp
vercel --cwd frontend
```

### Option 3: Update vercel.json in frontend/
The `frontend/vercel.json` should remain as-is - it's already correct!

## After Fix
✅ Vercel will run `npm install` in `frontend/` folder
✅ Build command will find `package.json`
✅ Output `dist/` folder will be deployed

## Verification
After updating settings, commit any pending changes and push to trigger redeploy:
```bash
git add .
git commit -m "docs: add vercel config fix"
git push origin main
```

Vercel will auto-deploy and should succeed!
