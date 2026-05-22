@echo off
REM AASDI Platform - Process Terminator
REM Stops all running node.js processes and closes service windows

setlocal enabledelayedexpansion

echo.
echo ================================================================
echo   AASDI Platform - Stopping All Processes
echo ================================================================
echo.

echo Terminating all node.js processes...
taskkill /IM node.exe /F >nul 2>&1

if errorlevel 1 (
    echo No node processes found.
) else (
    echo All node processes terminated successfully.
)

echo.
echo Closing spawned service windows...
taskkill /FI "WINDOWTITLE eq*npm*" /T /F >nul 2>&1

echo.
echo ================================================================
echo All services stopped successfully
echo ================================================================
echo.
echo Ports now available: 3000 (Frontend), 5000 (Backend)
echo.
