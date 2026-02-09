# 🌐 WHERE TO DEPLOY - Exact Steps & URLs

**Question:** "I do not know where to go to deploy...can you tell me?"

**Answer:** Go to these websites and follow these steps!

---

## 🚂 STEP 1: Deploy Backend to Railway

### Go Here First:
👉 **https://railway.app/** 👈

### What to Do:
1. Click **"Start a New Project"**
2. Click **"Deploy from GitHub repo"**
3. Select your `Vesper-AI` repository
4. Railway will automatically detect the configuration
5. Add your environment variable:
   - Variable name: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key (get it from https://console.anthropic.com/)
6. Click **"Deploy"**
7. Wait 2-3 minutes for deployment to complete
8. Copy your Railway URL (looks like: `https://your-app.railway.app`)

### Backend URL:
After deployment, you'll get a URL like:
```
https://vesper-ai-production-xxxx.railway.app
```
**Save this URL!** You'll need it for the frontend.

---

## ▲ STEP 2: Deploy Frontend to Vercel

### Go Here Second:
👉 **https://vercel.com/** 👈

### What to Do:
1. Click **"Add New..."** → **"Project"**
2. Import your `Vesper-AI` repository from GitHub
3. Configure the build settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variables:
   - Variable name: `VITE_API_URL`
   - Value: Your Railway URL from Step 1 (e.g., `https://vesper-ai-production-xxxx.railway.app`)
5. Click **"Deploy"**
6. Wait 1-2 minutes for deployment
7. Your app will be live!

### Frontend URL:
After deployment, you'll get a URL like:
```
https://vesper-ai.vercel.app
```
**This is your live app!** Share this URL to access Vesper AI.

---

## 🔑 Get Your API Keys

### Anthropic API Key (Required)
1. Go to: **https://console.anthropic.com/**
2. Sign up or log in
3. Click **"API Keys"** in the sidebar
4. Click **"Create Key"**
5. Copy the key (starts with `sk-ant-...`)
6. Use this in Railway environment variables

### Firebase (Optional)
1. Go to: **https://console.firebase.google.com/**
2. Click **"Add project"**
3. Follow the setup wizard
4. Enable **Firestore Database**
5. Get your config from **Project Settings** → **General** → **Your apps**

---

## 🎯 Quick Summary

| Step | Platform | URL | What You Deploy |
|------|----------|-----|-----------------|
| 1 | Railway | https://railway.app/ | Backend (Python/FastAPI) |
| 2 | Vercel | https://vercel.com/ | Frontend (React/Vite) |

**Cost:**
- Railway: $5 credit/month (enough for light use)
- Vercel: FREE forever for personal projects
- Total: ~$0-10/month

---

## 🆘 Need Help?

### "I can't find the Deploy button on Railway"
1. Make sure you're logged in
2. Look for **"New Project"** on the dashboard
3. Select **"Deploy from GitHub repo"**

### "I can't find my repository on Vercel"
1. Make sure your repository is on GitHub
2. On Vercel, click **"Import Git Repository"**
3. Click **"Add GitHub Account"** if needed
4. Authorize Vercel to access your repositories

### "Where do I put the Railway URL?"
1. After Railway deploys, copy the URL from the Railway dashboard
2. In Vercel, go to your project → **Settings** → **Environment Variables**
3. Add `VITE_API_URL` with your Railway URL as the value
4. Click **"Redeploy"** to apply the changes

### "I got an error during deployment"
1. Check Railway logs: Dashboard → Your Service → **Logs**
2. Check Vercel logs: Dashboard → Your Project → **Deployments** → Click on latest
3. Common issues:
   - Missing API key: Add `ANTHROPIC_API_KEY` in Railway
   - Wrong backend URL: Update `VITE_API_URL` in Vercel
   - Build errors: Check the logs for specific error messages

---

## ✅ Verify Deployment

### Check Backend Health:
Open in browser or use curl:
```bash
https://your-railway-url.railway.app/health
```
Should return: `{"status":"healthy","service":"vesper-ai-backend"}`

### Check Frontend:
Open in browser:
```bash
https://your-vercel-url.vercel.app
```
Should load the Vesper AI interface.

---

## 📚 More Documentation

- **Step-by-step Checklist**: [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md) ← Print this!
- **Quick Commands**: [QUICKSTART-DEPLOY.md](./QUICKSTART-DEPLOY.md)
- **Detailed Guide**: [DEPLOY.md](./DEPLOY.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Full Setup**: [DEPLOYMENT-READY.md](./DEPLOYMENT-READY.md)

---

## 🎉 That's It!

You now know exactly where to go:
1. **Railway** (https://railway.app/) for backend
2. **Vercel** (https://vercel.com/) for frontend

Both are free or very cheap to start, and the setup takes about 10-15 minutes total.

**Happy deploying!** 🚀

---

*Last updated: February 2026*
