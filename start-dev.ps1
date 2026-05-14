# Quick Start Script for Vesper
Write-Host "🚀 Starting Vesper..." -ForegroundColor Cyan
Write-Host ""

# Start backend in background
Write-Host "[1/2] Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start frontend
Write-Host "[2/2] Starting frontend dev server..." -ForegroundColor Yellow
Set-Location frontend
npm run dev
