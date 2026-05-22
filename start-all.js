#!/usr/bin/env node

/**
 * AASDI Platform - Multi-Process Launcher
 * Starts Frontend, Backend, and BA Agent in one command
 *
 * Usage: node start-all.js
 * Or:    npm run start:all
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectDir = __dirname;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(text) {
  log('', 'cyan');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log(`║  ${text.padEnd(57)} ║`, 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  log('', 'cyan');
}

function startProcess(name, command, args, color) {
  log(`→ Starting: ${name}`, color);

  const child = spawn(command, args, {
    cwd: projectDir,
    stdio: 'inherit',
    shell: true,
    windowsHide: false,
  });

  child.on('error', (err) => {
    log(`✗ Error starting ${name}: ${err.message}`, 'red');
  });

  child.on('exit', (code) => {
    log(`✗ ${name} exited with code ${code}`, 'yellow');
  });

  return child;
}

// Verify prerequisites
if (!fs.existsSync(path.join(projectDir, 'package.json'))) {
  log('❌ Error: package.json not found!', 'red');
  log('Make sure you run this script from the project root directory.', 'yellow');
  process.exit(1);
}

if (!fs.existsSync(path.join(projectDir, 'node_modules'))) {
  log('⚠️  node_modules not found. Please run: npm install', 'yellow');
  process.exit(1);
}

// Clear console and show header
console.clear();
header('AASDI Platform - Starting All Processes');

log('✓ Prerequisites checked', 'green');
log('');
log('Opening processes...', 'cyan');
log('');

// Start all three processes
const processes = [];

processes.push(
  startProcess(
    'Frontend (React Dev Server)',
    'npm',
    ['start'],
    'cyan'
  )
);

setTimeout(() => {
  processes.push(
    startProcess(
      'Backend (Express API Server)',
      'npm',
      ['run', 'server'],
      'magenta'
    )
  );
}, 1500);

setTimeout(() => {
  processes.push(
    startProcess(
      'BA Agent (Claude CLI)',
      'npm',
      ['run', 'ba-agent'],
      'green'
    )
  );
}, 3000);

setTimeout(() => {
  processes.push(
    startProcess(
      'Architect Agent (Claude CLI)',
      'npm',
      ['run', 'architect-agent'],
      'yellow'
    )
  );
}, 4500);

setTimeout(() => {
  processes.push(
    startProcess(
      'Tech Lead Agent (Claude CLI)',
      'npm',
      ['run', 'tech-lead-agent'],
      'cyan'
    )
  );
}, 6000);

// Show summary
setTimeout(() => {
  log('', 'cyan');
  header('All Processes Started!');
  log('📊 Service Status:', 'cyan');
  log('  • Frontend:        http://localhost:3000', 'cyan');
  log('  • Backend:         http://localhost:5000/api/health', 'magenta');
  log('  • BA Agent:        Running (check console)', 'green');
  log('  • Architect Agent: Running (check console)', 'yellow');
  log('  • Tech Lead Agent: Running (check console)', 'cyan');
  log('', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('🚀 Ready to go! Visit http://localhost:3000 in your browser', 'green');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('', 'cyan');
  log('📝 Tips:', 'yellow');
  log('  • Press Ctrl+C to stop all processes', 'dim');
  log('  • All five must be running for full functionality', 'dim');
  log('  • Check console output for errors', 'dim');
  log('', 'dim');
}, 8000);

// Handle termination
process.on('SIGINT', () => {
  log('', 'yellow');
  log('Shutting down all processes...', 'yellow');
  processes.forEach((proc) => {
    if (proc && !proc.killed) {
      proc.kill('SIGINT');
    }
  });
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  processes.forEach((proc) => {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  });
  process.exit(0);
});
