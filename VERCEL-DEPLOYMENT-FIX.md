# Vercel Deployment Fix

## Issues Identified and Resolved

### 1. **Build Dependencies Issue** ✅ FIXED
**Problem**: The frontend build was failing due to missing `@rollup/rollup-linux-x64-gnu` native module.

**Root Cause**: The `frontend/package.json` had peer dependency conflicts between:
- `@react-three/fiber@^8.15.19` (installed)
- `@react-three/drei@^10.7.7` (requires `@react-three/fiber@^9.0.0`)

**Solution**: Updated `vercel.json` to use `--legacy-peer-deps` flag during npm install:
```json
{
  "installCommand": "cd frontend && npm install --legacy-peer-deps",
  "buildCommand": "cd frontend && npm install --legacy-peer-deps && npm run build"
}
```

**Verification**: Build tested locally and succeeds:
```bash
cd frontend
npm install --legacy-peer-deps
npm run build
# ✅ Build completes successfully with output in dist/
```

### 2. **Root Directory Confusion** ✅ FIXED
**Problem**: The repository has multiple entry points that could confuse Vercel:
- Root-level `package.json` (for simple Node.js server)
- Root-level `index.html` (standalone chat interface)
- `frontend/` directory (React/Vite application)

**Solution**: Updated `.vercelignore` to exclude all backend and root-level files:
```
backend/
vesper-ai/
vesper-web/
server.js
package.json
package-lock.json
Dockerfile
Procfile
railway.json
nixpacks.toml
requirements.txt
*.py
```

This ensures Vercel only deploys the `frontend/` React application.

### 3. **GitHub Actions Status**
**Status**: The deployment-check workflow requires manual approval for pull requests (standard security feature).

**Impact**: This should NOT block Vercel deployment. Vercel can deploy independently of GitHub Actions status.

**Note**: If Vercel is configured to require passing status checks, you may need to:
1. Approve and run the workflow in GitHub Actions, OR
2. Adjust Vercel's deployment settings to not require status checks for this workflow

---

## Current Configuration

### vercel.json
```json
{
  "buildCommand": "cd frontend && npm install --legacy-peer-deps && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "cd frontend && npm install --legacy-peer-deps",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "env": {
    "VITE_API_URL": "@vite_api_url",
    "VITE_CHAT_API_URL": "@vite_chat_api_url"
  }
}
```

### .vercelignore
```
.venv
__pycache__
node_modules
.git
.env.local
backend/
vesper-ai/
vesper-web/
*.log
server.js
package.json
package-lock.json
Dockerfile
Procfile
railway.json
nixpacks.toml
requirements.txt
*.py
```

---

## How to Deploy to Vercel

### Option 1: Vercel Dashboard (Recommended)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your `cmc-creator/Vesper-AI` repository

2. **Configure Project**
   - Vercel should auto-detect the configuration from `vercel.json`
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: Leave as `.` (root)
   - **Build Command**: Will use command from vercel.json
   - **Output Directory**: `frontend/dist` (from vercel.json)

3. **Set Environment Variables** (Optional)
   Add these in Vercel dashboard if you need API connectivity:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   VITE_CHAT_API_URL=https://your-backend-url.railway.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will run: `npm install --legacy-peer-deps && npm run build`
   - Output will be served from `frontend/dist/`

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from root directory
vercel

# For production deployment
vercel --prod
```

---

## Verification Steps

### 1. Test Build Locally
```bash
cd frontend
npm install --legacy-peer-deps
npm run build
ls -la dist/  # Should show built files
```

### 2. Test Build with Vercel Configuration
```bash
# From root directory
cd frontend && npm install --legacy-peer-deps && npm run build
# Should succeed
```

### 3. Check Vercel Build Logs
Once deployed, check the Vercel dashboard for build logs:
- Look for successful npm install
- Verify build completes without errors
- Check that output directory contains expected files

---

## Troubleshooting

### If Vercel Build Still Fails

1. **Check Build Logs** in Vercel dashboard for exact error
2. **Verify Node Version**: Ensure Vercel is using Node 20+ (specified in `frontend/package.json`)
3. **Clear Vercel Cache**: In project settings → Clear Cache & Redeploy
4. **Manual Override**: In Vercel project settings, you can override:
   - Build Command: `cd frontend && npm install --legacy-peer-deps && npm run build`
   - Output Directory: `frontend/dist`
   - Install Command: `cd frontend && npm install --legacy-peer-deps`

### If GitHub Actions is Blocking

If Vercel is configured to require passing status checks:

**Option A**: Approve the workflow
1. Go to the PR in GitHub
2. Click "Details" on the failing check
3. Click "Approve and run" for the workflow

**Option B**: Disable status check requirement
1. Go to Vercel project settings
2. Find "Git Integration" settings
3. Disable "Wait for checks to pass" or exclude the deployment-check workflow

---

## What Changed

Files modified in this fix:
- `vercel.json` - Added `--legacy-peer-deps` to install and build commands
- `.vercelignore` - Added exclusions for backend files and root-level config

These are minimal configuration changes that ensure:
1. Dependencies install correctly despite peer dependency conflicts
2. Only the frontend React app is deployed (not backend or other files)
3. Build completes successfully with proper output

---

## Next Steps

1. ✅ Configuration files updated
2. ✅ Build tested locally and succeeds
3. ⏳ **Push changes to trigger Vercel deployment**
4. ⏳ **Verify deployment in Vercel dashboard**
5. ⏳ **Test deployed site**

The repository is now properly configured for Vercel deployment!

---

## Additional Notes

### About the Build Warning
You may see this warning during build:
```
Some chunks are larger than 500 kB after minification.
```

This is expected due to Three.js and the game components. It's a warning, not an error, and doesn't affect deployment. The app will still work fine.

### Frontend vs Backend Separation
- **Frontend** (Vercel): React/Vite app in `frontend/` directory
- **Backend** (Railway): FastAPI Python app in `backend/` directory
- This separation is by design and follows the recommended architecture

---

**Status**: ✅ Ready for deployment
**Last Updated**: February 10, 2026
