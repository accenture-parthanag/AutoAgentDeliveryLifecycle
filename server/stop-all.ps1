# Agent Driven Automation - Stop All Background Processes

Write-Host "========================================================"
Write-Host "  Agent Driven Automation - Stopping All Processes"
Write-Host "========================================================"
Write-Host ""

Write-Host "Stopping all node processes..." -ForegroundColor Yellow

try {
     = Get-Process node -ErrorAction SilentlyContinue
    if () {
         = @().Count
        Write-Host "  Found  node process(es). Terminating..." -ForegroundColor Yellow
        Stop-Process -Name node -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
        Write-Host "  ✓ All node processes stopped." -ForegroundColor Green
    } else {
        Write-Host "  No node processes found." -ForegroundColor Gray
    }
} catch {
    Write-Host "  Error stopping processes: " -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================================"
Write-Host "  All processes stopped successfully!" -ForegroundColor Green
Write-Host "========================================================"
Write-Host ""
Write-Host "To view logs, check: logs\*.log" -ForegroundColor Gray
Write-Host ""
