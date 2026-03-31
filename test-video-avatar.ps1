#!/usr/bin/env pwsh
# Test the video avatar generation endpoint

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Vesper AI - Video Avatar Generation Test" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
$backendUrl = "http://localhost:8000/health"
$maxRetries = 30
$retryCount = 0

Write-Host "[>] Checking if backend is running..." -ForegroundColor Yellow
while ($retryCount -lt $maxRetries) {
    try {
        $statusCode = curl.exe -s -o NUL -w "%{http_code}" $backendUrl
        if ($statusCode -eq "200") {
            Write-Host "[OK] Backend is running!" -ForegroundColor Green
            break
        }
        throw "Backend returned status $statusCode"
    } catch {
        $retryCount++
        if ($retryCount -eq 1) {
            Write-Host "    Waiting for backend..." -ForegroundColor Gray
        }
        if ($retryCount % 5 -eq 0) {
            Write-Host "    Still waiting... ($retryCount/30)" -ForegroundColor Gray
        }
        Start-Sleep -Seconds 1
    }
}

if ($retryCount -eq $maxRetries) {
    Write-Host "[X] Backend did not start. Please run: .\start-dev-server.ps1" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[>] Making test request to /api/video-avatar/generate..." -ForegroundColor Yellow
Write-Host ""

$testRequest = @{
    text = "Hello! I'm Vesper, your AI assistant, speaking from a video now."
    voice = ""
    source_video = "vesper_base.mp4"
    stability = 0.5
    similarity_boost = 0.75
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:8000/api/video-avatar/generate" `
        -Method POST `
        -Body $testRequest `
        -Headers $headers `
        -TimeoutSec 300 `
        -ErrorAction Stop

    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "[OK] Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host "  Status: $($result.status)" -ForegroundColor White
    Write-Host "  Video URL: $($result.video_url)" -ForegroundColor White
    Write-Host "  Video Path: $($result.video_path)" -ForegroundColor White
    Write-Host "  Mode: $($result.mode)" -ForegroundColor White
    
    if ($result.PSObject.Properties['note']) {
        Write-Host "  Note: $($result.note)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Video generated successfully!" -ForegroundColor Green
    Write-Host "You can access it at: http://localhost:8000$($result.video_url)" -ForegroundColor Cyan
    
} catch {
    Write-Host "[X] Request failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
    
    # Try to parse error details
    if ($_.Exception.Response) {
        try {
            $errorContent = $_.Exception.Response.Content.ReadAsStream() | Out-String
            if ($errorContent) {
                Write-Host ""
                Write-Host "Response body:" -ForegroundColor Yellow
                Write-Host $errorContent
            }
        } catch {}
    }
    
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
