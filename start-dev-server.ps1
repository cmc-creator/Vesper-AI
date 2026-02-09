#!/usr/bin/env pwsh
# Vesper AI - Development Server Launcher
# Starts both backend (FastAPI) and frontend (Vite) in parallel

Write-Host "🚀 Starting Vesper AI Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check if Python virtual environment exists
if (-not (Test-Path ".venv\Scripts\Activate.ps1")) {
    Write-Host "⚠️  Python virtual environment not found. Creating..." -ForegroundColor Yellow
    python -m venv .venv
    & .\.venv\Scripts\Activate.ps1
    Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
} else {
    & .\.venv\Scripts\Activate.ps1
}

Write-Host "✓ Python environment activated" -ForegroundColor Green

# Check if Node modules exist
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host "✓ Node modules ready" -ForegroundColor Green
Write-Host ""

# Ensure data directories exist
Write-Host "📁 Ensuring data directories exist..." -ForegroundColor Cyan
@("vesper-ai\knowledge", "vesper-ai\memory") | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

# Ensure initial JSON files exist
@("vesper-ai\knowledge\research.json", "vesper-ai\tasks.json") | ForEach-Object {
    if (-not (Test-Path $_)) {
        Set-Content -Path $_ -Value "[]"
    }
}

@("notes", "conversations", "sensory_experiences", "creative_moments", "emotional_bonds", "threads") | ForEach-Object {
    $path = "vesper-ai\memory\$_.json"
    if (-not (Test-Path $path)) {
        Set-Content -Path $path -Value "[]"
    }
}

Write-Host "✓ Data directories ready" -ForegroundColor Green
Write-Host ""

# Check for .env files
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Root .env not found - copying from example" -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
    }
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "⚠️  Frontend .env not found - copying from example" -ForegroundColor Yellow
    if (Test-Path "frontend\.env.example") {
        Copy-Item "frontend\.env.example" "frontend\.env"
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🌌 VESPER AI - Developer Console" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend (FastAPI):  http://localhost:8000" -ForegroundColor White
Write-Host "  Frontend (Vite):    http://localhost:5173" -ForegroundColor White
Write-Host "  Chat API:           http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C to stop all servers" -ForegroundColor Yellow
Write-Host ""
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Start backend in background
Write-Host "🔷 Starting Backend Server (Port 8000)..." -ForegroundColor Blue
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {
    `$host.UI.RawUI.WindowTitle = 'Vesper AI - Backend'
    Set-Location '$PWD'
    & .\.venv\Scripts\Activate.ps1
    Write-Host '🔷 Backend Server Starting...' -ForegroundColor Blue
    cd backend
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
}" -PassThru

Start-Sleep -Seconds 2

# Start frontend in background
Write-Host "🟢 Starting Frontend Server (Port 5173)..." -ForegroundColor Green
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {
    `$host.UI.RawUI.WindowTitle = 'Vesper AI - Frontend'
    Set-Location '$PWD\frontend'
    Write-Host '🟢 Frontend Server Starting...' -ForegroundColor Green
    npm run dev
}" -PassThru

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✓ All servers launched!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Opening browser in 3 seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Open browser
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Press Ctrl+C or close this window to stop all servers" -ForegroundColor Yellow
Write-Host ""

# Wait for user to press Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "🛑 Stopping all servers..." -ForegroundColor Red
    Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
    Write-Host "✓ Servers stopped" -ForegroundColor Green
}
