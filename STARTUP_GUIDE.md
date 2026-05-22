# AASDI Platform - Startup Guide

This guide covers all methods to start and stop the AASDI Platform with all three required processes.

## Quick Reference

### Start Services
```bash
npm run start:all          # One terminal, all processes mixed
.\start-all.ps1           # Three separate windows (Recommended)
.\start-all.bat           # Batch file wrapper
node start-all.js         # Cross-platform Node.js version
```

### Stop Services
```bash
.\stop-all.ps1            # Stop using PowerShell (Recommended)
.\stop-all.bat            # Stop using Batch file
taskkill /IM node.exe /F  # Force kill all node processes
```

---

## Quick Start

### Method 1: NPM Script (Simplest)
```bash
npm run start:all
```
✅ **Pros:** Simple, uses npm directly  
❌ **Cons:** All output in one terminal (harder to read)

---

### Method 2: PowerShell Script (Recommended for Windows)
```powershell
.\start-all.ps1
```

**Features:**
- Opens 3 separate windows (one for each service)
- Auto-cleanup of old processes
- Status verification
- Color-coded output
- Arrange windows side-by-side for easy monitoring

**First time only:** If you get an execution policy error, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser
```

✅ **Pros:** Opens 3 separate windows, shows status, auto-verify, reliable  
✅ **Cons:** Windows/PowerShell only

---

### Method 3: Batch File Wrapper (Alternative)
```cmd
start-all.bat
```

Double-click the file in Windows Explorer, or run from Command Prompt.

✅ **Pros:** Easy to use from File Explorer  
❌ **Cons:** Still requires PowerShell internally

---

### Method 4: Node.js Script (Cross-Platform)
```bash
node start-all.js
```

✅ **Pros:** Works on Windows, Mac, Linux  
❌ **Cons:** Mixed output in one terminal

---

### Method 5: Manual (If Scripts Don't Work)

Open three separate terminal windows and run:

**Window 1:**
```bash
npm start
```

**Window 2:**
```bash
npm run server
```

**Window 3:**
```bash
npm run ba-agent
```

---

## What Each Method Does

### All Methods Start These Processes:

| Process | Command | Port | Purpose |
|---------|---------|------|---------|
| **Frontend** | `npm start` | 3000 | React dev server |
| **Backend** | `npm run server` | 5000 | Express API server |
| **BA Agent** | `npm run ba-agent` | N/A | Claude CLI agent |

---

## Verification Checklist

After starting, verify all three are running:

- [ ] Frontend: Open http://localhost:3000 in browser
- [ ] Backend: GET http://localhost:5000/api/health should return `{"status":"ok"}`
- [ ] BA Agent: Console should show "✓ BA Agent connected to MongoDB"

---

## Stopping All Processes

### Option 1: Dedicated Stop Script (Recommended)

**PowerShell:**
```powershell
.\stop-all.ps1
```

**Batch File:**
```cmd
stop-all.bat
```

This script does the following:
1. Kills all node.js processes
2. Closes the spawned PowerShell windows (Frontend, Backend, Agent)
3. Frees up ports 3000 and 5000
4. Provides a clean state for the next startup

### Option 2: Manual Termination

**In each service window:** Press `Ctrl+C`

**Or close the windows directly:** Click the X button on each window.

### Option 3: Command Line (For Stuck Processes)

**PowerShell:**
```powershell
Get-Process node | Stop-Process -Force
```

**Command Prompt:**
```cmd
taskkill /IM node.exe /F
```

### Option 4: Check Running Processes

**See what's using the ports:**
```powershell
# Check port 3000 (Frontend)
netstat -ano | findstr :3000

# Check port 5000 (Backend)
netstat -ano | findstr :5000
```

**Kill specific process by PID:**
```powershell
Stop-Process -Id <PID> -Force
```

---

## Database Management

### Clear Database (Start Fresh)

To clear all data and start with a clean database:

```bash
node clear-db.js
```

This will:
- Connect to MongoDB
- Drop all collections in the 'aadlc' database
- Ready the database for new data

**Use this when:**
- Starting a fresh test cycle
- Testing the complete workflow again
- Cleaning up old projects and submissions

---

## Troubleshooting

### "Port already in use" Error
Another process is using port 3000, 5000, or the BA Agent.

**Solution:** Kill the process or change ports
```bash
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### Script Permission Denied (PowerShell)
Your execution policy doesn't allow running scripts.

**Solution:** Allow scripts for current user
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser
```

### "npm: command not found"
Node.js or npm is not installed.

**Solution:** Install Node.js from https://nodejs.org/

### "node_modules not found"
Dependencies aren't installed.

**Solution:** Run
```bash
npm install
```

---

## Environment Variables

Create a `.env` file in the project root if needed:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=aadlc
PORT=5000
REACT_APP_API_URL=http://localhost:5000
```

---

## Recommended Workflow

1. **First time:** Run `npm install`
2. **Development:** Use `npm run start:all` or PowerShell script
3. **Testing:** Keep all three windows visible side-by-side
4. **Production:** Use `npm run build`

---

## For Different Operating Systems

### Windows (Recommended)
```powershell
.\start-all.ps1
```

### macOS/Linux
```bash
npm run start:all
# or
node start-all.js
```

---

## Getting Help

If you encounter issues:

1. Check the console output in each window
2. Verify ports 3000 and 5000 are available
3. Ensure MongoDB is running (if using backend)
4. Run `npm install` to update dependencies
5. Check SOLUTION_GUIDE.html for detailed setup

---

**Last Updated:** May 12, 2026  
**Version:** 1.0.0  
**Platform:** Windows 10/11, macOS, Linux
