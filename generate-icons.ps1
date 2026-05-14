# Generate PWA Icons from SVG
# Requires: npm install -g sharp-cli

$iconSizes = @(72, 96, 128, 144, 152, 192, 384, 512)
$svgSource = "frontend/public/icons/icon-512x512.svg"
$outputDir = "frontend/public/icons"

Write-Host "Generating PWA icons..." -ForegroundColor Cyan

foreach ($size in $iconSizes) {
    $output = "$outputDir/icon-${size}x${size}.png"
    Write-Host "Creating $output" -ForegroundColor Green
    
    # Using sharp-cli (install with: npm install -g sharp-cli)
    & npx sharp-cli -i $svgSource -o $output resize $size $size
}

Write-Host ""
Write-Host "Icon generation complete!" -ForegroundColor Green
Write-Host "Icons created in: $outputDir" -ForegroundColor Cyan
