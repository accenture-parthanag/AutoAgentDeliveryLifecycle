# A-ADLC Platform - Multi-Process Launcher
# Starts all three processes needed for full platform functionality

Write-Host "========================================================"
Write-Host "  A-ADLC Platform - Starting All Processes"
Write-Host "========================================================"
Write-Host ""

# Get the script's directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if we're in the right directory
if (-not (Test-Path "$scriptDir\package.json")) {
    Write-Host "Error: package.json not found!" -ForegroundColor Red
    Write-Host "Make sure you run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path "$scriptDir\node_modules")) {
    Write-Host "node_modules not found. Running npm install..." -ForegroundColor Yellow
    Set-Location $scriptDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install failed" -ForegroundColor Red
        exit 1
    }
}

# Close existing service windows by title
Write-Host "Closing any existing service windows..." -ForegroundColor Yellow
try {
    $windowTitles = @("FRONTEND - npm start", "BACKEND - npm run server", "BA AGENT - npm run ba-agent", "ARCHITECT AGENT - npm run architect-agent", "TECH LEAD AGENT - npm run tech-lead-agent")
    $psProcesses = Get-Process powershell -ErrorAction SilentlyContinue

    foreach ($psProcess in $psProcesses) {
        foreach ($title in $windowTitles) {
            if ($psProcess.MainWindowTitle -like "*$title*") {
                Write-Host "  Closing: $($psProcess.MainWindowTitle)" -ForegroundColor Yellow
                Stop-Process -Id $psProcess.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }
    Start-Sleep -Milliseconds 500
} catch {
    Write-Host "  Note: Could not close existing windows (this is okay)" -ForegroundColor Gray
}

# Kill existing node processes
Write-Host "Cleaning up existing node processes..." -ForegroundColor Yellow
try {
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "  Found existing node processes. Terminating..." -ForegroundColor Yellow
        Stop-Process -Name node -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 1000
        Write-Host "  Waiting for ports to be released..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        Write-Host "  Existing node processes terminated." -ForegroundColor Green
    } else {
        Write-Host "  No existing node processes found." -ForegroundColor Green
    }
} catch {
    Write-Host "  Warning: Could not clean up processes" -ForegroundColor Yellow
}

Write-Host "Prerequisites checked" -ForegroundColor Green
Write-Host ""

# Function to start a process in a new window
function Start-ProcessWindow {
    param([string]$Title, [string]$Command, [int]$Index)

    Write-Host "Starting: $Title" -ForegroundColor Cyan

    $scriptPath = $script:scriptDir
    $newWindowCmd = "cd '$scriptPath'; `$title = '$Title'; `$host.ui.RawUI.WindowTitle = `$title; $Command"

    # Open as separate window (not tab)
    $process = Start-Process -FilePath "powershell.exe" -ArgumentList "-Command",$newWindowCmd -WorkingDirectory $scriptPath -PassThru

    # Give it time to open
    Start-Sleep -Milliseconds 800
}

# Start all three processes
Write-Host ""
Write-Host "Opening process windows..." -ForegroundColor Cyan
Write-Host ""

Start-ProcessWindow -Title "FRONTEND - npm start (port 3000)" -Command "`$env:PORT=3000; npm start" -Index 0
Start-Sleep -Seconds 4

Start-ProcessWindow -Title "BACKEND - npm run server (port 5000)" -Command "npm run server" -Index 1
Start-Sleep -Seconds 4

Start-ProcessWindow -Title "BA AGENT - npm run ba-agent" -Command "npm run ba-agent" -Index 2
Start-Sleep -Seconds 2

Start-ProcessWindow -Title "ARCHITECT AGENT - npm run architect-agent" -Command "npm run architect-agent" -Index 3
Start-Sleep -Seconds 2

Start-ProcessWindow -Title "TECH LEAD AGENT - npm run tech-lead-agent" -Command "npm run tech-lead-agent" -Index 4

# Summary
Write-Host ""
Write-Host "========================================================"
Write-Host "  All Processes Started!" -ForegroundColor Green
Write-Host "========================================================"
Write-Host ""
Write-Host "Service Status:" -ForegroundColor Cyan
Write-Host "  Frontend:   http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:    http://localhost:5000/api/health" -ForegroundColor Magenta
Write-Host "  BA Agent:        Running (check agent window)" -ForegroundColor Green
Write-Host "  Architect Agent: Running (check agent window)" -ForegroundColor Yellow
Write-Host "  Tech Lead Agent: Running (check agent window)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Waiting for processes to initialize..." -ForegroundColor Yellow
Write-Host ""

# Wait and verify
$maxWait = 30
$elapsed = 0
$frontendReady = $false
$backendReady = $false

while ($elapsed -lt $maxWait) {
    if (-not $frontendReady) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "  Frontend is ready!" -ForegroundColor Green
                $frontendReady = $true
            }
        } catch { }
    }

    if (-not $backendReady) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.status -eq "ok") {
                Write-Host "  Backend is ready!" -ForegroundColor Green
                $backendReady = $true
            }
        } catch { }
    }

    if ($frontendReady -and $backendReady) {
        break
    }

    Start-Sleep -Seconds 1
    $elapsed++
}

Write-Host ""
Write-Host "========================================================"
Write-Host "Ready to go! Visit http://localhost:3000 in your browser" -ForegroundColor Green
Write-Host "========================================================"
Write-Host ""
Write-Host "IMPORTANT: Look for the FRONTEND window" -ForegroundColor Yellow
Write-Host "  If React asks about port 5000, press Y to use another port" -ForegroundColor Gray
Write-Host "  The Frontend should open on http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop all processes:" -ForegroundColor Yellow
Write-Host "  1. Close the three service windows, OR" -ForegroundColor Gray
Write-Host "  2. Run: .\stop-all.ps1" -ForegroundColor Gray
Write-Host "  3. Or press Ctrl+C in each window" -ForegroundColor Gray
Write-Host ""
