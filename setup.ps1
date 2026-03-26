# Vesper Quick Setup Script
Write-Host "🚀 Vesper Setup Wizard" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Python - prefer 3.11, accept 3.12, reject everything else
$pythonExe = $null; $pythonExeArgs = @()
foreach ($candidate in @('py -3.11', 'py -3.12', 'python3.11', 'python3.12', 'python')) {
    try {
        $parts = $candidate -split ' '
        $verOut = & $parts[0] ($parts[1..99] + @('--version')) 2>&1
        if (([string]$verOut) -match 'Python (3\.(?:11|12))') {
            $pythonExe = $parts[0]
            $pythonExeArgs = if ($parts.Count -gt 1) { $parts[1..($parts.Count-1)] } else { @() }
            Write-Host "✓ Python: $([string]$verOut)  (via '$candidate')" -ForegroundColor Green
            break
        }
    } catch {}
}
if (-not $pythonExe) {
    Write-Host "✗ Python 3.11 or 3.12 not found." -ForegroundColor Red
    Write-Host "  Install from https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "  Tip: Python 3.14 is NOT supported — binary wheels are missing for key packages." -ForegroundColor Yellow
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
    & $pythonExe ($pythonExeArgs + @('-m', 'venv', '.venv'))
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "✓ Virtual environment already exists" -ForegroundColor Green
}

Write-Host "[2/4] Installing Python dependencies..." -ForegroundColor Cyan
& .\.venv\Scripts\pip.exe install -r backend\requirements.txt --quiet
Write-Host "✓ Python packages installed" -ForegroundColor Green

# Setup frontend
Write-Host "[3/4] Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install --legacy-peer-deps --silent
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
