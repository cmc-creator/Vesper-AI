# 🚀 Production Deployment Guide

## Quick Deploy Summary

- **Backend:** Railway (with PostgreSQL)
- **Frontend:** Vercel
- **Auto-Deploy:** Push to `main` branch
- **Time:** ~5 minutes total

---

## 🔧 Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"

### 1.2 Deploy from GitHub
1. Click "Deploy from GitHub repo"
2. Select `cmc-creator/Vesper-AI`
3. Choose `main` branch
4. Railway will auto-detect Python

### 1.3 Add PostgreSQL Database
1. In your Railway project, click "New"
2. Click "Database" → "Add PostgreSQL"
3. Railway auto-generates `DATABASE_URL` environment variable

### 1.4 Configure Environment Variables
In Railway project → Variables tab, add:

```bash
# Required
PORT=8000
PYTHONPATH=/app

# AI API Keys (at least one recommended)
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=xxxxx

# Optional (Ollama works without keys!)
```

### 1.5 Deploy & Get URL
1. Railway auto-deploys (check "Deployments" tab)
2. Click "Settings" → "Generate Domain" to get public URL
3. Copy your URL (e.g., `https://vesper-ai-production.up.railway.app`)
4. Test health: `https://your-url.railway.app/health`

**Expected:** JSON response with `status: ok`

---

## 🎨 Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New..." → "Project"

### 2.2 Import GitHub Repo
1. Select `cmc-creator/Vesper-AI`
2. Click "Import"

### 2.3 Configure Build Settings
**Framework Preset:** Vite
**Root Directory:** Leave blank (Vercel will detect from vercel.json)
**Build Command:** `cd frontend && npm install && npm run build`
**Output Directory:** `frontend/dist`
**Install Command:** `npm install --prefix frontend`

### 2.4 Add Required Environment Variable
In Vercel project → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://your-railway-url.up.railway.app` |

Replace `your-railway-url` with the actual domain shown in your Railway project Settings → Domains.

> **This is required.** The frontend uses `VITE_API_URL` to know where to send API requests. Without it, chat, memory, research, and all backend features will not work.

### 2.5 Deploy
1. Click "Deploy"
2. Wait ~2 minutes for build
3. Visit your Vercel URL (e.g., `https://vesper-ai.vercel.app`)

---

## ✅ Step 3: Verify Deployment

### Backend Health Check
```bash
curl https://your-railway-url.up.railway.app/health
```

**Expected:**
```json
{
  "status": "ok",
  "database": "connected",
  "ollama": "available"
}
```

### Frontend Test
1. Open your Vercel URL in browser
2. Type a message in chat
3. Check browser DevTools → Network tab
4. Verify API calls go to Railway backend
5. Confirm messages save (create new thread, refresh page)

**If API calls fail:**
- Check `vercel.json` has correct Railway URL
- Check Railway backend logs for errors
- Verify Railway has environment variables set

---

## 🔄 Continuous Deployment

Both Railway and Vercel auto-deploy on push to `main`:

```bash
# Make changes
git add .
git commit -m "feat: your feature"
git push origin main

# Railway redeploys backend (~1 min)
# Vercel redeploys frontend (~2 min)
```

---

## 🌍 CORS Configuration (Important!)

If you get CORS errors, update [backend/main.py](backend/main.py):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://vesper-ai.vercel.app",  # Your Vercel URL
        "http://localhost:5174"  # Keep for local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit and push to update.

---

## 💰 Cost Estimation

| Service | Plan | Cost |
|---------|------|------|
| **Railway** | Hobby (500 hrs/month) | $5/month |
| **PostgreSQL** | Railway addon | Included |
| **Vercel** | Hobby (100 GB bandwidth) | Free |
| **Ollama** | Local AI on Railway | Free (uses CPU) |
| **Anthropic/OpenAI** | Pay-per-use | ~$1-5/month |

**Total:** ~$5-10/month for moderate usage

---

## 📊 Monitoring & Logs

### Railway Logs
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# View logs
railway logs
```

**Or** view in Railway dashboard → Deployments → Click latest → View Logs

### Vercel Logs
1. Go to Vercel dashboard
2. Click your project
3. Click "Deployments"
4. Click latest deployment
5. Click "View Function Logs"

---

## 🐛 Common Issues & Fixes

### 1. "Module not found" error on Railway
**Fix:** Add missing package to [backend/requirements.txt](backend/requirements.txt) and push

### 2. "Database connection failed"
**Fix:** Ensure PostgreSQL is added in Railway project (New → Database → PostgreSQL)

### 3. API calls return 404 on Vercel
**Fix:** Update `vercel.json` with correct Railway URL

### 4. "CORS error" in browser console
**Fix:** Add Vercel domain to CORS origins in [backend/main.py](backend/main.py)

### 5. Build fails on Vercel
**Fix:** Check build logs, ensure `frontend/package.json` has all dependencies

### 6. Railway backend won't start
**Fix:** Check logs for Python errors, verify `requirements.txt` has versions specified

---

## 🔐 Security Checklist

- [ ] API keys stored in Railway environment variables (not in code)
- [ ] CORS restricted to Vercel domain only
- [ ] PostgreSQL credentials auto-managed by Railway
- [ ] HTTPS enabled (auto by Railway + Vercel)
- [ ] `.env` files in `.gitignore`

---

## 🚀 Quick Commands Reference

```bash
# Deploy to production
git push origin main

# View Railway logs
railway logs

# View Railway status
railway status

# Rollback Railway deployment
railway rollback

# Redeploy Vercel (if needed)
vercel --prod
```

---

## 📞 Support Links

- **Railway Help:** [docs.railway.app](https://docs.railway.app)
- **Vercel Help:** [vercel.com/docs](https://vercel.com/docs)
- **Railway Discord:** [discord.gg/railway](https://discord.gg/railway)

---

## ✨ Post-Deployment

After successful deployment:

1. **Share Your App:** Your Vercel URL is shareable!
2. **Set Up Domain (Optional):** Add custom domain in Vercel settings
3. **Enable Analytics:** Vercel has built-in analytics
4. **Monitor Usage:** Check Railway metrics for resource usage

---

**Status:** 🟢 Production-Ready  
**Last Updated:** February 8, 2026
