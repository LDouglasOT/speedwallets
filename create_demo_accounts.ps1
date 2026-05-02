# PowerShell script to create demo accounts in the database
# This script starts the Next.js server and creates all demo accounts

Write-Host "Starting Next.js development server..." -ForegroundColor Green

# Start the Next.js dev server in the background
Start-Process "npm" -ArgumentList "run dev" -WindowStyle Hidden

# Wait for server to be ready (up to 30 seconds)
$maxAttempts = 30
$attempt = 0
$serverReady = $false

Write-Host "Waiting for server to start on port 3000..." -ForegroundColor Yellow

while ($attempt -lt $maxAttempts -and -not $serverReady) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
        }
    } catch {
        # Server not ready yet
    }
    Start-Sleep -Seconds 1
    $attempt++
}

if (-not $serverReady) {
    Write-Host "Error: Server did not start within 30 seconds" -ForegroundColor Red
    exit 1
}

Write-Host "Server is ready! Creating demo accounts..." -ForegroundColor Green

# Demo account types to create
$demoTypes = @("parent", "student", "staff", "admin")

foreach ($demo in $demoTypes) {
    Write-Host "Creating $demo account..." -ForegroundColor Cyan
    
    try {
        $body = @{ demo = $demo } | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/demo-login" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body
        
        $statusCode = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json
        
        if ($statusCode -eq 200) {
            Write-Host "  ✓ $demo account created successfully" -ForegroundColor Green
            if ($content.redirectUrl) {
                Write-Host "    Redirect URL: $($content.redirectUrl)" -ForegroundColor Gray
            }
        } else {
            Write-Host "  ✗ Failed to create $demo account: $($content.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Error creating $demo account: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nDemo account creation complete!" -ForegroundColor Green
Write-Host "You can now stop the server with Ctrl+C" -ForegroundColor Yellow

# Keep the script running so the server stays alive
Wait-Process -Id (Get-Process | Where-Object {$_.ProcessName -eq "node" -and $_.MainWindowTitle -eq ""} | Select-Object -First 1).Id
