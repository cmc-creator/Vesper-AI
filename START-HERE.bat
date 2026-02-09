@echo off
:: Vesper AI - Quick Start Script for Windows
:: Double-click this file to start the development servers

echo.
echo ============================================
echo   Vesper AI - Quick Start
echo ============================================
echo.

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found! Please install Python 3.9+ first.
    pause
    exit /b 1
)

:: Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found! Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo Python: OK
echo Node.js: OK
echo.

:: Activate Python virtual environment
if not exist ".venv\Scripts\activate.bat" (
    echo Creating Python virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

:: Install Python dependencies if needed
if not exist ".venv\Lib\site-packages\fastapi" (
    echo Installing Python dependencies...
    pip install -r requirements.txt
)

:: Install Node dependencies if needed
if not exist "frontend\node_modules" (
    echo Installing Node.js dependencies...
    cd frontend
    npm install
    cd ..
)

:: Ensure data directories exist
if not exist "vesper-ai\knowledge" mkdir vesper-ai\knowledge
if not exist "vesper-ai\memory" mkdir vesper-ai\memory
if not exist "vesper-ai\knowledge\research.json" echo [] > vesper-ai\knowledge\research.json
if not exist "vesper-ai\tasks.json" echo [] > vesper-ai\tasks.json

echo.
echo ============================================
echo   Starting Servers...
echo ============================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press Ctrl+C to stop servers
echo ============================================
echo.

:: Start backend in new window
start "Vesper Backend" cmd /k "call .venv\Scripts\activate.bat && cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
start "Vesper Frontend" cmd /k "cd frontend && npm run dev"

:: Wait a moment for frontend to start
timeout /t 3 /nobreak >nul

:: Open browser
start http://localhost:5173

echo.
echo Servers started! Close this window when done.
echo (The server windows will remain open)
echo.
pause
