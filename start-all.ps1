# Agent Driven Automation - Multi-Process Launcher (Background)
# Starts all processes in the background with logging

Write-Host "========================================================"
Write-Host "  Agent Driven Automation - Starting All Processes"
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

# Create logs directory
$logsDir = "$scriptDir\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Host "Created logs directory: $logsDir" -ForegroundColor Green
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

# Function to start a process in background with logging
function Start-BackgroundProcess {
    param(
        [string]$Name,
        [string]$Command,
        [string]$LogFile
    )

    Write-Host "Starting: $Name" -ForegroundColor Cyan

    # Start process with output redirected to log file
    $process = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "cd /d $scriptDir && $Command >> $LogFile 2>&1" `
        -WindowStyle Hidden `
        -PassThru

    Write-Host "  PID: $($process.Id), Logging to: $([System.IO.Path]::GetFileName($LogFile))" -ForegroundColor Gray
}

# Clear old logs
Write-Host "Clearing previous logs..." -ForegroundColor Yellow
Get-ChildItem "$logsDir\*.log" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Starting background processes..." -ForegroundColor Cyan
Write-Host ""

# Start all processes in background
Start-BackgroundProcess -Name "Frontend (npm start)" -Command "set PORT=3000 && npm start" -LogFile "$logsDir\frontend.log"
Start-Sleep -Seconds 3

Start-BackgroundProcess -Name "Backend (npm run server)" -Command "npm run server" -LogFile "$logsDir\backend.log"
Start-Sleep -Seconds 3

Start-BackgroundProcess -Name "BA Agent" -Command "npm run ba-agent" -LogFile "$logsDir\ba-agent.log"
Start-Sleep -Seconds 2

Start-BackgroundProcess -Name "Architect Agent" -Command "npm run architect-agent" -LogFile "$logsDir\architect-agent.log"
Start-Sleep -Seconds 2

Start-BackgroundProcess -Name "Tech Lead Agent" -Command "npm run tech-lead-agent" -LogFile "$logsDir\tech-lead-agent.log"

# Summary
Write-Host ""
Write-Host "========================================================"
Write-Host "  Agent Driven Automation - All Processes Started" -ForegroundColor Green
Write-Host "========================================================"
Write-Host ""
Write-Host "Service Status:" -ForegroundColor Cyan
Write-Host "  Frontend:          http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend Health:    http://localhost:5000/api/health" -ForegroundColor Magenta
Write-Host "  BA Agent:          Running in background" -ForegroundColor Green
Write-Host "  Architect Agent:   Running in background" -ForegroundColor Yellow
Write-Host "  Tech Lead Agent:   Running in background" -ForegroundColor Cyan
Write-Host ""
Write-Host "Log Files (in $logsDir):" -ForegroundColor Gray
Write-Host "  frontend.log, backend.log, ba-agent.log, architect-agent.log, tech-lead-agent.log" -ForegroundColor Gray
Write-Host ""
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
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
                Write-Host "  ✓ Frontend is ready!" -ForegroundColor Green
                $frontendReady = $true
            }
        } catch { }
    }

    if (-not $backendReady) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.status -eq "ok") {
                Write-Host "  ✓ Backend is ready!" -ForegroundColor Green
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
Write-Host "View Logs:" -ForegroundColor Yellow
Write-Host "  Frontend:        tail -f logs\frontend.log" -ForegroundColor Gray
Write-Host "  Backend:         tail -f logs\backend.log" -ForegroundColor Gray
Write-Host "  BA Agent:        tail -f logs\ba-agent.log" -ForegroundColor Gray
Write-Host "  Architect Agent: tail -f logs\architect-agent.log" -ForegroundColor Gray
Write-Host "  Tech Lead Agent: tail -f logs\tech-lead-agent.log" -ForegroundColor Gray
Write-Host ""
Write-Host "Stop All Processes:" -ForegroundColor Yellow
Write-Host "  Run: .\stop-all.ps1" -ForegroundColor Gray
Write-Host "  Or: Stop-Process -Name node -Force" -ForegroundColor Gray
Write-Host ""
