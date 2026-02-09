# 🚀 Quick Deploy Reference

## One-Line Deployment Commands

### Using the deployment scripts:

**Unix/Mac/Linux:**
```bash
./deploy.sh
```

**Windows:**
```powershell
.\deploy.ps1
```

---

## Manual Deployment

### Backend to Railway

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize (first time only)
railway init

# 4. Deploy
railway up

# 5. Set environment variables in Railway dashboard
# - ANTHROPIC_API_KEY=your_key_here
```

### Frontend to Vercel

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Navigate to frontend
cd frontend

# 3. Login
vercel login

# 4. Deploy to production
vercel --prod

# 5. Set environment variables in Vercel dashboard
# - VITE_API_URL=https://your-railway-app.railway.app
# - VITE_FIREBASE_* (if using Firebase)
```

---

## Environment Variables

### Backend (.env)
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
FIREBASE_PROJECT_ID=your-project-id (optional)
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json (optional)
```

### Frontend (frontend/.env)
```env
VITE_API_URL=https://your-backend.railway.app
VITE_FIREBASE_API_KEY=your-api-key (optional)
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com (optional)
VITE_FIREBASE_PROJECT_ID=your-project-id (optional)
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com (optional)
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789 (optional)
VITE_FIREBASE_APP_ID=1:123456789:web:abc123 (optional)
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX (optional)
```

---

## Test Deployments

### Test Backend
```bash
curl https://your-app.railway.app/health
# Expected: {"status":"healthy","service":"vesper-ai-backend"}
```

### Test Frontend
Visit your Vercel URL: `https://your-app.vercel.app`

---

## Common Issues

### Railway deployment fails
- Check `requirements.txt` includes all dependencies
- Verify Python version is 3.10+
- Check Railway logs: `railway logs`

### Vercel build fails
- Ensure all `VITE_*` environment variables are set
- Check build command: `npm run build`
- Verify output directory: `dist`

### Health check fails
- Ensure `/health` endpoint exists in backend
- Check Railway service is running
- Verify PORT environment variable is being used

---

## Get Help

- 📖 Full guide: [DEPLOY.md](./DEPLOY.md)
- 📋 Detailed setup: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🐛 Report issues: [GitHub Issues](https://github.com/cmc-creator/Vesper-AI/issues)

---

**Quick Links:**
- [Railway Dashboard](https://railway.app/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Firebase Console](https://console.firebase.google.com/)
- [Anthropic Console](https://console.anthropic.com/)
