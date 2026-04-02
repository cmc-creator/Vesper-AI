#!/usr/bin/env pwsh
# Vesper AI - Development Server Launcher
# Starts both backend (FastAPI) and frontend (Vite) in parallel

Write-Host ">>> Starting Vesper AI Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Auto-detect supported Python (3.11 preferred, 3.12 accepted)
$pythonExe = $null; $pythonExeArgs = @()
foreach ($candidate in @('py -3.11', 'py -3.12', 'python3.11', 'python3.12', 'python')) {
    try {
        $parts = $candidate -split ' '
        $verOut = & $parts[0] ($parts[1..99] + @('--version')) 2>&1
        if (([string]$verOut) -match 'Python (3\.(?:11|12))') {
            $pythonExe = $parts[0]
            $pythonExeArgs = if ($parts.Count -gt 1) { $parts[1..($parts.Count-1)] } else { @() }
            Write-Host "[OK] Python: $([string]$verOut)  (via '$candidate')" -ForegroundColor Green
            break
        }
    } catch {}
}
if (-not $pythonExe) {
    Write-Host "[!] Python 3.11 or 3.12 not found." -ForegroundColor Red
    Write-Host "[!] Install from https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "[!] Python 3.14 is NOT supported — binary wheels are missing for key packages." -ForegroundColor Yellow
    exit 1
}

# Check if Python virtual environment exists
if (-not (Test-Path ".venv\Scripts\Activate.ps1")) {
    Write-Host "[!] Python virtual environment not found. Creating..." -ForegroundColor Yellow
    & $pythonExe ($pythonExeArgs + @('-m', 'venv', '.venv'))
    Write-Host "[+] Installing Python dependencies..." -ForegroundColor Yellow
    & .\.venv\Scripts\pip install -r backend\requirements.txt
}

Write-Host "[OK] Python environment check complete" -ForegroundColor Green

# Check if Node modules exist
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "[+] Installing Node.js dependencies..." -ForegroundColor Yellow
    Push-Location frontend
    npm install --legacy-peer-deps
    Pop-Location
}

Write-Host "[OK] Node modules ready" -ForegroundColor Green
Write-Host ""

# Ensure data directories exist
Write-Host "[+] Ensuring data directories exist..." -ForegroundColor Cyan
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

@("notes", "conversations", "sensory_experiences", "creative_moments", "emotional_bonds", "threads", "personal", "work", "milestones") | ForEach-Object {
    $path = "vesper-ai\memory\$_.json"
    if (-not (Test-Path $path)) {
        Set-Content -Path $path -Value "[]"
    }
}

Write-Host "[OK] Data directories ready" -ForegroundColor Green
Write-Host ""

# Check for .env files
if (-not (Test-Path ".env")) {
    Write-Host "[!] Root .env not found - copying from example" -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
    }
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "[!] Frontend .env not found - copying from example" -ForegroundColor Yellow
    if (Test-Path "frontend\.env.example") {
        Copy-Item "frontend\.env.example" "frontend\.env"
    }
}

# Launch readiness validation
Write-Host "[+] Running launch readiness checks..." -ForegroundColor Cyan
$envText = if (Test-Path ".env") { Get-Content ".env" -Raw } else { "" }
$hasElevenKey = $envText -match '(?m)^ELEVENLABS_API_KEY\s*=\s*.+$'
$hasElevenVoice = $envText -match '(?m)^ELEVENLABS_VOICE_ID\s*=\s*.+$'
$ffmpegCmd = Get-Command ffmpeg -ErrorAction SilentlyContinue

if (-not $hasElevenKey) {
    Write-Host "[WARN] ELEVENLABS_API_KEY is not configured locally. Voice features will fall back or fail." -ForegroundColor Yellow
}
if (-not $hasElevenVoice) {
    Write-Host "[WARN] ELEVENLABS_VOICE_ID is not configured locally. Premium voice selection will not be reliable." -ForegroundColor Yellow
}
if (-not $ffmpegCmd) {
    Write-Host "[WARN] ffmpeg is not on PATH. Video speech generation will be unavailable." -ForegroundColor Yellow
}
if ($hasElevenKey -and $hasElevenVoice -and $ffmpegCmd) {
    Write-Host "[OK] Launch readiness: voice + video prerequisites detected" -ForegroundColor Green
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  VESPER AI - Developer Console" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend (FastAPI):  http://localhost:8000" -ForegroundColor White
Write-Host "  Frontend (Vite):    http://localhost:5173" -ForegroundColor White
Write-Host "  Chat API:           http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C to stop all servers" -ForegroundColor Yellow
Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# Start backend in background
Write-Host "[+] Starting Backend Server (Port 8000)..." -ForegroundColor Blue
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {
    `$host.UI.RawUI.WindowTitle = 'Vesper AI - Backend'
    Set-Location '$PWD'
    # Add ffmpeg to PATH
    `$env:Path = 'C:\tools\ffmpeg\ffmpeg-master-latest-win64-gpl\bin;' + `$env:Path
    & .\.venv\Scripts\Activate.ps1
    Write-Host '[+] Backend Server Starting... (Managed Mode)' -ForegroundColor Blue
    Set-Location backend
    python restart_manager.py
}" -PassThru

Start-Sleep -Seconds 2

# Start frontend in background
Write-Host "[+] Starting Frontend Server (Port 5173)..." -ForegroundColor Green
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {
    `$host.UI.RawUI.WindowTitle = 'Vesper AI - Frontend'
    Set-Location '$PWD\frontend'
    Write-Host '[+] Frontend Server Starting...' -ForegroundColor Green
    npm run dev
}" -PassThru

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "[OK] All servers launched!" -ForegroundColor Green
Write-Host ""
Write-Host "[*] Opening browser in 3 seconds..." -ForegroundColor Cyan
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
    Write-Host "[!] Stopping all servers..." -ForegroundColor Red
    Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
    Write-Host "[OK] Servers stopped" -ForegroundColor Green
}