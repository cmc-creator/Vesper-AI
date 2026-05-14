@echo off
REM Vesper One-Click Launcher
echo Starting Vesper...
cd /d %~dp0

REM Start Backend
echo Starting backend server...
start "Vesper Backend" cmd /k "call .venv\Scripts\activate.bat && cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

REM Wait a moment for backend to start
TIMEOUT /T 3 >nul

REM Start Frontend
echo Starting frontend server...
start "Vesper Frontend" cmd /k "cd frontend && npm run dev"

REM Wait for frontend to start
TIMEOUT /T 5 >nul

REM Open browser
echo Opening Vesper in browser...
start http://localhost:5176

echo.
echo Vesper is starting! Check the terminal windows for any errors.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5176 (or check terminal for actual port)
pause
