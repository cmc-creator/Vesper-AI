# Deploy script for Railway
Set-Location C:\Users\conni\VesperApp

Write-Host "Checking git status..." -ForegroundColor Cyan
git status

Write-Host "`nCommitting Dockerfile changes..." -ForegroundColor Cyan
git add Dockerfile
git commit -m "Fix Dockerfile - remove invalid shell redirections"
git push origin master

Write-Host "`nDeploying to Railway..." -ForegroundColor Cyan
railway up

Write-Host "`nDone!" -ForegroundColor Green
