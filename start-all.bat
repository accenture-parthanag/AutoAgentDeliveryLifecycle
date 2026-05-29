@echo off
REM Agent Driven Automation - Multi-Process Launcher (Batch Wrapper)
REM Cleans up existing processes and starts all services

setlocal enabledelayedexpansion

echo.
echo ================================================================
echo   Agent Driven Automation - Starting All Processes
echo ================================================================
echo.

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0

REM Change to the script directory
cd /d "%SCRIPT_DIR%"

REM Kill existing node processes
echo Cleaning up existing node processes...
taskkill /IM node.exe /F >nul 2>&1
echo Waiting for ports to be released...
timeout /t 3 /nobreak >nul

REM Use PowerShell to run the startup script
where powershell >nul 2>nul
if errorlevel 1 (
    echo ERROR: PowerShell not found!
    pause
    exit /b 1
)

REM Run the PowerShell startup script
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-all.ps1"