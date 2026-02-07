# Vesper Quick Setup Script
Write-Host "🚀 Vesper Setup Wizard" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Python
try {
    $pythonVersion = & python --version 2>&1
    Write-Host "✓ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = & node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setting up project..." -ForegroundColor Yellow
Write-Host ""

# Setup backend
Write-Host "[1/4] Setting up Python virtual environment..." -ForegroundColor Cyan
if (!(Test-Path ".venv")) {
    python -m venv .venv
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "✓ Virtual environment already exists" -ForegroundColor Green
}

Write-Host "[2/4] Installing Python dependencies..." -ForegroundColor Cyan
& .\.venv\Scripts\pip.exe install -r requirements.txt --quiet
Write-Host "✓ Python packages installed" -ForegroundColor Green

# Setup frontend
Write-Host "[3/4] Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install --silent
Write-Host "✓ Node packages installed" -ForegroundColor Green
Set-Location ..

# Generate icons if not exist
Write-Host "[4/4] Checking PWA icons..." -ForegroundColor Cyan
if (!(Test-Path "frontend/public/icons/icon-192x192.png")) {
    Write-Host "Generating PWA icons..." -ForegroundColor Yellow
    & .\generate-icons.ps1
} else {
    Write-Host "✓ PWA icons already generated" -ForegroundColor Green
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Green
Write-Host "✓ Setup complete!" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Green
Write-Host ""

# Next steps
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure Firebase:" -ForegroundColor Yellow
Write-Host "   - Create project at https://console.firebase.google.com/"
Write-Host "   - Copy config to frontend/.env"
Write-Host "   - Download service account JSON"
Write-Host ""
Write-Host "2. Start development servers:" -ForegroundColor Yellow
Write-Host "   Backend:  .\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload" -ForegroundColor White
Write-Host "   Frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "3. Open http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 Read DEPLOYMENT.md for full deployment guide" -ForegroundColor Cyan
Write-Host ""
