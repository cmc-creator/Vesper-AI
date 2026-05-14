Write-Host "🚀 Starting Vesper..." -ForegroundColor Cyan
Write-Host ""

# Kill any existing processes
Get-Process python*,node* -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start backend
Write-Host "Starting backend on port 8001..." -ForegroundColor Yellow
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload" -PassThru

Start-Sleep -Seconds 5

# Start frontend  
Write-Host "Starting frontend..." -ForegroundColor Yellow
cd frontend
npm run dev

# Cleanup on exit
Write-Host "`nShutting down..." -ForegroundColor Red
Stop-Process -Id $backend.Id -Force
