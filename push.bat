@echo off
cd C:\Users\conni\VesperApp
git add -A
git commit -m "Fix Dockerfile CMD syntax for PORT variable"
git push origin master
echo.
echo Push complete! Railway should auto-deploy now.
pause
