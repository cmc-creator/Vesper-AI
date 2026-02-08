# Vesper AI Deployment Script (PowerShell)
# This script helps deploy Vesper AI to Railway and Vercel

Write-Host "🌟 Vesper AI Deployment Tool" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Function to check if command exists
function Test-Command {
    param($Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

$missingTools = 0

if (!(Test-Command railway)) {
    Write-Host "✗ Railway CLI not found" -ForegroundColor Red
    Write-Host "  Install: npm install -g @railway/cli" -ForegroundColor Gray
    $missingTools++
} else {
    Write-Host "✓ Railway CLI found" -ForegroundColor Green
}

if (!(Test-Command vercel)) {
    Write-Host "✗ Vercel CLI not found" -ForegroundColor Red
    Write-Host "  Install: npm install -g vercel" -ForegroundColor Gray
    $missingTools++
} else {
    Write-Host "✓ Vercel CLI found" -ForegroundColor Green
}

if (!(Test-Command node)) {
    Write-Host "✗ Node.js not found" -ForegroundColor Red
    Write-Host "  Install from: https://nodejs.org/" -ForegroundColor Gray
    $missingTools++
} else {
    Write-Host "✓ Node.js found" -ForegroundColor Green
}

if (!(Test-Command python)) {
    Write-Host "✗ Python not found" -ForegroundColor Red
    Write-Host "  Install from: https://www.python.org/" -ForegroundColor Gray
    $missingTools++
} else {
    Write-Host "✓ Python found" -ForegroundColor Green
}

Write-Host ""

if ($missingTools -gt 0) {
    Write-Host "Please install missing tools before proceeding" -ForegroundColor Red
    exit 1
}

# Check environment variables
Write-Host "Checking environment variables..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path ".env") {
    Write-Host "✓ .env file found" -ForegroundColor Green
} else {
    Write-Host "! .env file not found" -ForegroundColor Yellow
    Write-Host "  Create one from .env.example" -ForegroundColor Gray
}

Write-Host ""

# Deployment menu
Write-Host "What would you like to deploy?" -ForegroundColor Cyan
Write-Host "1) Backend only (Railway)"
Write-Host "2) Frontend only (Vercel)"
Write-Host "3) Both (Backend + Frontend)"
Write-Host "4) Check deployment status"
Write-Host "5) Exit"
Write-Host ""
$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚂 Deploying Backend to Railway..." -ForegroundColor Cyan
        Write-Host "==================================" -ForegroundColor Cyan
        Write-Host ""
        
        # Check if Railway project is linked
        $railwayStatus = railway status 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Railway project linked" -ForegroundColor Green
        } else {
            Write-Host "! No Railway project linked" -ForegroundColor Yellow
            Write-Host "Initializing new Railway project..." -ForegroundColor Yellow
            railway init
        }
        
        Write-Host ""
        Write-Host "Deploying..." -ForegroundColor Yellow
        railway up
        
        Write-Host ""
        Write-Host "✓ Backend deployment complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Get your Railway URL:" -ForegroundColor Cyan
        Write-Host "  railway status" -ForegroundColor Gray
    }
    
    "2" {
        Write-Host ""
        Write-Host "▲ Deploying Frontend to Vercel..." -ForegroundColor Cyan
        Write-Host "==================================" -ForegroundColor Cyan
        Write-Host ""
        
        Set-Location frontend
        
        if (!(Test-Path "node_modules")) {
            Write-Host "Installing dependencies..." -ForegroundColor Yellow
            npm install
        }
        
        Write-Host ""
        Write-Host "Deploying to production..." -ForegroundColor Yellow
        vercel --prod
        
        Set-Location ..
        
        Write-Host ""
        Write-Host "✓ Frontend deployment complete!" -ForegroundColor Green
    }
    
    "3" {
        Write-Host ""
        Write-Host "🚀 Deploying Full Stack Application..." -ForegroundColor Cyan
        Write-Host "=======================================" -ForegroundColor Cyan
        Write-Host ""
        
        # Deploy backend first
        Write-Host "Step 1: Deploying Backend to Railway..." -ForegroundColor Yellow
        Write-Host ""
        
        $railwayStatus = railway status 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Railway project linked" -ForegroundColor Green
        } else {
            Write-Host "! No Railway project linked" -ForegroundColor Yellow
            Write-Host "Initializing new Railway project..." -ForegroundColor Yellow
            railway init
        }
        
        railway up
        Write-Host "✓ Backend deployed!" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Update your Railway URL in frontend/.env" -ForegroundColor Yellow
        Write-Host "   VITE_API_URL=https://your-app.railway.app" -ForegroundColor Gray
        Write-Host ""
        Read-Host "Press Enter after updating the URL"
        
        # Deploy frontend
        Write-Host ""
        Write-Host "Step 2: Deploying Frontend to Vercel..." -ForegroundColor Yellow
        Write-Host ""
        
        Set-Location frontend
        
        if (!(Test-Path "node_modules")) {
            Write-Host "Installing dependencies..." -ForegroundColor Yellow
            npm install
        }
        
        vercel --prod
        Set-Location ..
        
        Write-Host ""
        Write-Host "✓ Full deployment complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📱 Your application is live!" -ForegroundColor Cyan
    }
    
    "4" {
        Write-Host ""
        Write-Host "📊 Deployment Status" -ForegroundColor Cyan
        Write-Host "====================" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "Backend (Railway):" -ForegroundColor Yellow
        $railwayStatus = railway status 2>&1
        if ($LASTEXITCODE -eq 0) {
            railway status
        } else {
            Write-Host "! Not deployed or not linked" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "Frontend (Vercel):" -ForegroundColor Yellow
        Set-Location frontend
        $vercelStatus = vercel ls 2>&1
        if ($LASTEXITCODE -eq 0) {
            vercel ls
        } else {
            Write-Host "! Not deployed or not logged in" -ForegroundColor Yellow
        }
        Set-Location ..
    }
    
    "5" {
        Write-Host "Goodbye! 👋" -ForegroundColor Cyan
        exit 0
    }
    
    default {
        Write-Host "✗ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✨ Done!" -ForegroundColor Green
