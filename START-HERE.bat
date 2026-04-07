@echo off
:: Vesper AI - Quick Start Script for Windows
:: Double-click this file to start Vesper locally

echo.
echo ============================================
echo   Vesper AI - Local Launch
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

:: ── Auto-create .env with local freedom defaults if it doesn't exist ──
if not exist ".env" (
    echo .env not found — creating with local freedom defaults...
    (
        echo # Vesper AI - Local Config ^(auto-created by START-HERE.bat^)
        echo # Edit this file to add your API keys.
        echo # See .env.local.example for the full options guide.
        echo.
        echo # AI Provider ^(fill in at least one^)
        echo GROQ_API_KEY=
        echo GOOGLE_API_KEY=
        echo ANTHROPIC_API_KEY=
        echo OPENAI_API_KEY=
        echo.
        echo # Local Freedom Flags
        echo VESPER_AUTONOMOUS=true
        echo DESKTOP_CONTROL_ENABLED=true
        echo VESPER_HEARTBEAT_MINUTES=20
        echo OLLAMA_PRIMARY=false
        echo.
        echo # Voice ^(optional^)
        echo ELEVENLABS_API_KEY=
        echo ELEVENLABS_VOICE_ID=
        echo.
        echo # GitHub ^(optional — for git commit/push tools^)
        echo GITHUB_TOKEN=
        echo GITHUB_DEFAULT_REPO=cmc-creator/Vesper-AI
        echo.
        echo PORT=8000
    ) > .env
    echo.
    echo .env created! Open it and add your API keys, then re-run this script.
    echo At minimum you need one of: GROQ_API_KEY, GOOGLE_API_KEY, ANTHROPIC_API_KEY
    echo.
    echo Free options:
    echo   Groq ^(fastest, free^):   https://console.groq.com/keys
    echo   Gemini ^(free tier^):     https://aistudio.google.com/app/apikey
    echo.
    notepad .env
    pause
    exit /b 0
)

:: ── Read .env to check if any AI provider key is set ──
set HAS_AI_KEY=0
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if "%%A"=="GROQ_API_KEY"        if not "%%B"=="" set HAS_AI_KEY=1
    if "%%A"=="GOOGLE_API_KEY"      if not "%%B"=="" set HAS_AI_KEY=1
    if "%%A"=="ANTHROPIC_API_KEY"   if not "%%B"=="" set HAS_AI_KEY=1
    if "%%A"=="OPENAI_API_KEY"      if not "%%B"=="" set HAS_AI_KEY=1
)

if "%HAS_AI_KEY%"=="0" (
    echo WARNING: No AI provider key found in .env
    echo Vesper won't be able to think without one!
    echo.
    echo Edit .env and add at least one key, then restart.
    echo Free options:
    echo   Groq:   https://console.groq.com/keys
    echo   Gemini: https://aistudio.google.com/app/apikey
    echo.
    set /p CONTINUE="Continue anyway? [y/N]: "
    if /i not "%CONTINUE%"=="y" (
        notepad .env
        pause
        exit /b 0
    )
)

:: ── Detect VESPER_AUTONOMOUS flag from .env for status display ──
set AUTONOMOUS_MODE=false
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if "%%A"=="VESPER_AUTONOMOUS" if "%%B"=="true" set AUTONOMOUS_MODE=true
)

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
    npm install --legacy-peer-deps
    cd ..
)

:: Ensure data directories exist
if not exist "vesper-ai\knowledge" mkdir vesper-ai\knowledge
if not exist "vesper-ai\memory" mkdir vesper-ai\memory
if not exist "vesper-ai\workers" mkdir vesper-ai\workers
if not exist "vesper-ai\vesper_identity" mkdir vesper-ai\vesper_identity
if not exist "vesper-ai\knowledge\research.json" echo [] > vesper-ai\knowledge\research.json
if not exist "vesper-ai\tasks.json" echo [] > vesper-ai\tasks.json

echo.
echo ============================================
echo   Starting Vesper...
echo ============================================
echo.
echo Backend:      http://localhost:8000
echo Frontend:     http://localhost:5173
echo.
echo Autonomous:   %AUTONOMOUS_MODE%
echo.
echo Press Ctrl+C in the server windows to stop
echo ============================================
echo.

:: Start backend in new window (loads .env automatically)
start "Vesper Backend" cmd /k "call .venv\Scripts\activate.bat && cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Wait for backend to start
timeout /t 4 /nobreak >nul

:: Start frontend in new window
start "Vesper Frontend" cmd /k "cd frontend && npm run dev"

:: Wait for frontend to start
timeout /t 4 /nobreak >nul

:: Open browser
start http://localhost:5173

echo.
echo Vesper is live. Close the server windows to stop her.
echo.
pause
