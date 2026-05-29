# Agent Driven Automation - Process Terminator
# Stops all running services and closes PowerShell windows

Write-Host ""
Write-Host "========================================================"
Write-Host "  Agent Driven Automation - Stopping All Processes"
Write-Host "========================================================"
Write-Host ""

# Close service windows by title
Write-Host "Closing service windows..." -ForegroundColor Yellow
try {
    $windowTitles = @("FRONTEND - npm start", "BACKEND - npm run server", "BA AGENT - npm run ba-agent")
    $psProcesses = Get-Process powershell -ErrorAction SilentlyContinue

    $closed = 0
    foreach ($psProcess in $psProcesses) {
        foreach ($title in $windowTitles) {
            if ($psProcess.MainWindowTitle -like "*$title*") {
                Write-Host "  Closing: $($psProcess.MainWindowTitle)" -ForegroundColor Yellow
                Stop-Process -Id $psProcess.Id -Force -ErrorAction SilentlyContinue
                $closed++
            }
        }
    }

    if ($closed -gt 0) {
        Write-Host "Closed $closed service window(s)." -ForegroundColor Green
    } else {
        Write-Host "No service windows found." -ForegroundColor Green
    }
    Start-Sleep -Milliseconds 500
} catch {
    Write-Host "  Warning: Could not close windows (this is okay)" -ForegroundColor Yellow
}

# Kill all remaining node processes
Write-Host "Terminating all node.js processes..." -ForegroundColor Yellow

try {
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue

    if ($nodeProcesses) {
        $count = if ($nodeProcesses -is [array]) { $nodeProcesses.Count } else { 1 }
        Write-Host "  Found $count node process(es). Terminating..." -ForegroundColor Yellow

        Stop-Process -Name node -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500

        $remaining = Get-Process node -ErrorAction SilentlyContinue
        if ($remaining) {
            Write-Host "  Some processes still running. Forcing termination..." -ForegroundColor Yellow
            Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
            Start-Sleep -Milliseconds 500
        }

        Write-Host "All node processes terminated." -ForegroundColor Green
    } else {
        Write-Host "No node processes found." -ForegroundColor Green
    }
} catch {
    Write-Host "  Warning: Could not terminate processes" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================================"
Write-Host "All services stopped successfully" -ForegroundColor Green
Write-Host "========================================================"
Write-Host ""
Write-Host "Ports are now available:" -ForegroundColor Cyan
Write-Host "  3000 (Frontend)" -ForegroundColor Cyan
Write-Host "  5000 (Backend)" -ForegroundColor Cyan
Write-Host ""
