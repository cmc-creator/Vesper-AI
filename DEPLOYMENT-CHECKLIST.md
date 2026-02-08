# ✅ Deployment Checklist - Follow These Steps

## Before You Start

- [ ] Have a GitHub account with your Vesper-AI repository
- [ ] Have an Anthropic API key (or get one from https://console.anthropic.com/)

---

## Step 1: Deploy Backend to Railway ⏱️ ~5 minutes

### Go to: https://railway.app/

- [ ] Click "Start a New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Choose your Vesper-AI repository
- [ ] Wait for Railway to detect the configuration
- [ ] Go to "Variables" tab
- [ ] Add: `ANTHROPIC_API_KEY` = `your-api-key-here`
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete (2-3 minutes)
- [ ] Copy your Railway URL (Settings → Domains)
- [ ] Save it here: `_________________________________`

✅ Backend is deployed!

---

## Step 2: Deploy Frontend to Vercel ⏱️ ~5 minutes

### Go to: https://vercel.com/

- [ ] Click "Add New..." → "Project"
- [ ] Select "Import Git Repository"
- [ ] Choose your Vesper-AI repository
- [ ] Set **Root Directory** to: `frontend`
- [ ] Set **Framework Preset** to: `Vite`
- [ ] Set **Build Command** to: `npm run build`
- [ ] Set **Output Directory** to: `dist`
- [ ] Click "Environment Variables"
- [ ] Add: `VITE_API_URL` = `your-railway-url-from-step-1`
- [ ] Click "Deploy"
- [ ] Wait for deployment (1-2 minutes)
- [ ] Copy your Vercel URL
- [ ] Save it here: `_________________________________`

✅ Frontend is deployed!

---

## Step 3: Test Your Deployment ⏱️ ~2 minutes

### Test Backend Health:
- [ ] Open in browser: `https://your-railway-url/health`
- [ ] Should see: `{"status":"healthy","service":"vesper-ai-backend"}`

### Test Frontend:
- [ ] Open in browser: `https://your-vercel-url`
- [ ] Should load the Vesper AI interface
- [ ] Try sending a message

✅ Everything works!

---

## Step 4: Share Your App 🎉

Your app is live at:
```
https://your-vercel-url.vercel.app
```

You can:
- [ ] Bookmark this URL
- [ ] Share with others
- [ ] Install as PWA (look for install icon in browser)
- [ ] Access from any device

---

## 🆘 Troubleshooting

### Backend won't deploy
- Check that `ANTHROPIC_API_KEY` is set in Railway
- View logs: Railway dashboard → Your service → "Logs"
- Verify the key starts with `sk-ant-`

### Frontend won't deploy
- Check that `VITE_API_URL` points to your Railway URL
- Verify Root Directory is set to `frontend`
- Check build logs: Vercel dashboard → Deployments → Latest

### Frontend loads but can't connect to backend
- Verify `VITE_API_URL` in Vercel matches your Railway URL
- Check Railway service is running
- Test backend health endpoint directly

### "CORS error" in browser console
- This is normal initially while backend starts
- Wait 30 seconds and refresh
- If persists, check Railway logs

---

## 📝 Important URLs to Save

| Service | URL | Purpose |
|---------|-----|---------|
| Railway Backend | `https://__________________________.railway.app` | API server |
| Vercel Frontend | `https://__________________________.vercel.app` | Your app |
| Railway Dashboard | https://railway.app/dashboard | Manage backend |
| Vercel Dashboard | https://vercel.com/dashboard | Manage frontend |
| Anthropic Console | https://console.anthropic.com/ | API keys |

---

## 💰 Cost Tracking

- Railway: Check usage at https://railway.app/account/usage
- Vercel: Always free for personal projects
- Anthropic: Check usage at https://console.anthropic.com/settings/billing

---

## 🎓 Next Steps

After deployment:
- [ ] Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
- [ ] Explore [DEPLOY.md](./DEPLOY.md) for advanced configuration
- [ ] Set up Firebase (optional) for real-time features
- [ ] Configure custom domain (optional)

---

## ✅ Deployment Complete!

Time spent: ~10-15 minutes  
Cost: ~$0-10/month  
Status: 🟢 LIVE

**Congratulations!** Your Vesper AI is now deployed and accessible from anywhere! 🚀

---

*Keep this checklist for future reference or redeployments*
