# Vercel Frontend Setup Guide

## 🎯 Quick Fix - Set Root Directory

Your React frontend is in the `frontend/` folder, but Vercel is looking at the project root. This causes the "package.json not found" error.

### Steps to Fix:

1. **Go to Vercel Dashboard:**
   ```
   https://vercel.com/cmc-creator/vesper-ai/settings/general
   ```

2. **Find "Build & Development Settings" section**

3. **Set Root Directory:**
   - Find the "Root Directory" field
   - Enter: `frontend` (exactly this word)
   - Click "Edit" if needed
   - Click "Save"

4. **Trigger Redeploy:**
   - Go to Deployments tab
   - Click "..." menu on latest deployment
   - Click "Redeploy"
   - OR: Just push a new commit and it auto-deploys

### Why This Works:

```
VesperApp/
├── frontend/           ← Your React app is HERE
│   ├── package.json   ← Vercel needs to find THIS
│   ├── src/
│   ├── public/
│   └── vite.config.js
├── backend/           ← FastAPI is on Railway
└── README.md
```

By setting Root Directory to `frontend`, Vercel runs:
```bash
cd frontend              # Change to frontend folder
npm install             # Install dependencies
npm run build           # Build React app
```

### After It Works:

Your frontend will be live at:
```
https://vesper-ai-delta.vercel.app
```

And it will connect to your Railway backend at:
```
https://vesper-backend-production-b486.up.railway.app
```

### Troubleshooting:

**If build still fails:**
1. Check "Framework Preset" is set to "Vite"
2. Check "Build Command" is `npm run build` or `vite build`
3. Check "Output Directory" is `dist`
4. Make sure `frontend/package.json` has build script:
   ```json
   {
     "scripts": {
       "build": "vite build"
     }
   }
   ```

**If frontend loads but can't reach backend:**
- Check `frontend/src/firebase.js` or API config files
- Make sure backend URL points to Railway: 
  `https://vesper-backend-production-b486.up.railway.app`

---

## 🎉 Success Indicators:

- ✅ Vercel build completes without errors
- ✅ Frontend loads at vercel.app domain
- ✅ Chat sends messages to Railway backend
- ✅ You can see Vesper's responses
- ✅ Memory/Research/Tasks boards load data

Once working, Vesper will have:
- Frontend: Vercel (CDN, instant deploys, free SSL)
- Backend: Railway (persistent PostgreSQL, AI routing)
- Full stack deployed and operational! 🚀
