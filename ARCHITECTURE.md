# Vesper AI - Deployment Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                    VESPER AI DEPLOYMENT                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘

                            USERS
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌───────────┐       ┌───────────┐
            │  Desktop  │       │  Mobile   │
            │  Browser  │       │  Browser  │
            └─────┬─────┘       └─────┬─────┘
                  │                   │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌─────────────────┐
                  │                 │
                  │     VERCEL      │
                  │   (Frontend)    │
                  │                 │
                  │  React + Vite   │
                  │     PWA         │
                  │                 │
                  └────────┬────────┘
                           │
                           │ HTTPS/REST API
                           │
                           ▼
                  ┌─────────────────┐
                  │                 │
                  │    RAILWAY      │
                  │   (Backend)     │
                  │                 │
                  │  FastAPI        │
                  │  Python 3.10+   │
                  │  /health ✓      │
                  │                 │
                  └────────┬────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │ Firebase │  │Anthropic │  │  Local   │
       │Firestore │  │  Claude  │  │  Files   │
       │          │  │   API    │  │          │
       │Optional  │  │ Required │  │  Memory  │
       └──────────┘  └──────────┘  └──────────┘

```

## Component Breakdown

### Frontend (Vercel)
- **Technology**: React 18, Vite 5
- **Hosting**: Vercel (Serverless)
- **Features**: PWA, Offline mode, Service worker
- **URL**: `https://your-app.vercel.app`
- **Build**: Automatic on git push
- **Cost**: Free tier available

### Backend (Railway)
- **Technology**: FastAPI, Python 3.10+
- **Hosting**: Railway (Container)
- **Features**: REST API, Health checks
- **URL**: `https://your-app.railway.app`
- **Build**: Automatic via Dockerfile
- **Cost**: $5-10/month (after free credits)

### Database (Firebase - Optional)
- **Technology**: Firestore (NoSQL)
- **Hosting**: Google Cloud
- **Features**: Real-time sync, Offline support
- **Cost**: Free tier available

### AI Service (Anthropic)
- **Technology**: Claude API
- **Hosting**: Anthropic Cloud
- **Features**: Chat, Analysis, Research
- **Cost**: Pay-per-use (~$0.01-0.10 per chat)

---

## Deployment Flow

```
Developer
    │
    │ git push
    │
    ▼
┌─────────────┐
│   GitHub    │
└──────┬──────┘
       │
       ├────────────────┐
       │                │
       ▼                ▼
┌────────────┐   ┌────────────┐
│  Vercel    │   │  Railway   │
│            │   │            │
│ Detects    │   │ Detects    │
│ Changes    │   │ Changes    │
│     ↓      │   │     ↓      │
│ Build      │   │ Build      │
│ Frontend   │   │ Backend    │
│     ↓      │   │     ↓      │
│ Deploy     │   │ Deploy     │
└────────────┘   └────────────┘
       │                │
       └────────┬───────┘
                │
                ▼
           PRODUCTION
            (Live!)
```

---

## Data Flow

```
┌──────────┐
│   User   │
└────┬─────┘
     │
     │ Opens App
     ▼
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────┬────────────┘
     │
     │ API Request
     ▼
┌─────────────────┐
│   Backend       │
│   (FastAPI)     │
└────┬────────────┘
     │
     ├──────────────────┐
     │                  │
     │ Chat Request     │ Data Query
     ▼                  ▼
┌─────────────┐   ┌──────────────┐
│ Anthropic   │   │  Firebase    │
│   Claude    │   │  Firestore   │
└─────┬───────┘   └──────┬───────┘
      │                  │
      │ AI Response      │ Data
      ▼                  ▼
┌─────────────────────────────┐
│       Backend               │
│   (Process & Format)        │
└───────────┬─────────────────┘
            │
            │ JSON Response
            ▼
┌─────────────────┐
│   Frontend      │
│   (Display)     │
└────┬────────────┘
     │
     ▼
┌──────────┐
│   User   │
└──────────┘
```

---

## Health Check Flow

```
Railway Platform
       │
       │ Every 20 seconds
       ▼
┌─────────────────┐
│  GET /health    │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│   Backend       │
│  health_check() │
└────┬────────────┘
     │
     ▼
┌─────────────────────────────┐
│ {"status": "healthy",       │
│  "service": "vesper-ai"}    │
└────┬────────────────────────┘
     │
     │ 200 OK
     ▼
Railway Platform
     │
     │ If healthy: Keep running
     │ If unhealthy: Restart
     ▼
```

---

## File Structure for Deployment

```
Vesper-AI/
│
├── backend/              → Deployed to Railway
│   ├── main.py          (API endpoints + /health)
│   └── ...
│
├── frontend/            → Deployed to Vercel
│   ├── src/            (React components)
│   ├── public/         (Static assets)
│   └── dist/           (Build output)
│
├── deploy.sh           (Deployment script)
├── deploy.ps1          (Windows script)
│
├── railway.json        → Railway config
├── vercel.json         → Vercel config
├── Dockerfile          → Container definition
│
└── .env.deployment     (Environment variables template)
```

---

## Environment Variables Flow

```
Development:
    .env (local file)
         ↓
    process.env.ANTHROPIC_API_KEY
    
Production:

    Railway Dashboard       Vercel Dashboard
           ↓                       ↓
    ANTHROPIC_API_KEY        VITE_API_URL
           ↓                       ↓
    Backend Container        Frontend Build
           ↓                       ↓
    process.env              import.meta.env
```

---

## Scaling Architecture

```
Current (Free/Starter):
    Frontend: 1 instance (Vercel)
    Backend: 1 container (Railway)
    
Growth (As needed):
    Frontend: Auto-scaled by Vercel
    Backend: Scale horizontally on Railway
              │
              ├─── Container 1
              ├─── Container 2
              └─── Container N
                   (Load balanced automatically)
```

---

## Security Layers

```
┌─────────────────────────────────────┐
│           SSL/TLS (HTTPS)           │ ← Vercel/Railway auto
├─────────────────────────────────────┤
│      CORS (Cross-Origin)            │ ← Backend config
├─────────────────────────────────────┤
│      API Key Validation             │ ← Anthropic
├─────────────────────────────────────┤
│    Environment Variables            │ ← No secrets in code
├─────────────────────────────────────┤
│    Firebase Security Rules          │ ← Optional
└─────────────────────────────────────┘
```

---

## Cost Breakdown (Monthly)

```
Free Tier (Development):
├─ Vercel Frontend:      $0 (unlimited)
├─ Railway Backend:      $5 credit
├─ Firebase:             $0 (Spark plan)
└─ Anthropic API:        Pay per use
   Total: ~$0-5 for light usage

Production Tier:
├─ Vercel Frontend:      $0 (still free!)
├─ Railway Backend:      $5-10
├─ Firebase:             $1-5 (Blaze plan)
└─ Anthropic API:        $10-50 (varies)
   Total: ~$16-65/month for moderate usage
```

---

## Deployment Timeline

```
Initial Setup:
├─ Install CLIs          (5 min)
├─ Configure Railway     (5 min)
├─ Configure Vercel      (5 min)
└─ Set env variables     (10 min)
   Total: ~25 minutes

Subsequent Deploys:
├─ git push              (30 sec)
├─ Automatic build       (2-5 min)
└─ Automatic deploy      (1 min)
   Total: ~3-7 minutes (fully automated)
```

---

For detailed deployment instructions, see:
- [DEPLOYMENT-READY.md](./DEPLOYMENT-READY.md) - Overview
- [DEPLOY.md](./DEPLOY.md) - Step-by-step guide
- [QUICKSTART-DEPLOY.md](./QUICKSTART-DEPLOY.md) - Quick reference
