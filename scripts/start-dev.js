#!/usr/bin/env node
/**
 * Advanced Development Environment Starter
 *
 * This script:
 * 1. Cleans up ports 3000 and 5173
 * 2. Starts the development server (npm run dev:all)
 * 3. Monitors for issues during startup
 */

const { execSync, spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const TARGET_PORTS = [3000, 5173];
const isWindows = os.platform() === 'win32';

// Check if ports are in use
function arePotentiallyBlocking() {
  try {
    for (const port of TARGET_PORTS) {
      let command = isWindows
        ? `netstat -ano | findstr :${port} | findstr LISTENING`
        : `lsof -i :${port} -sTCP:LISTEN -t`;

      try {
        const output = execSync(command, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        if (output.trim()) {
          return true; // At least one port is in use
        }
      } catch (e) {
        // If the command fails, it means the port is not in use
      }
    }
    return false;
  } catch (e) {
    console.error('Error checking ports:', e.message);
    // Assume issues if we can't check
    return true;
  }
}

// First, check if we can start immediately or need cleanup
console.log('🚀 Advanced Development Environment Starter');
console.log('------------------------------------------');

// Check if ports are blocked
if (arePotentiallyBlocking()) {
  console.log('⚠️ Some target ports appear to be in use');

  // Run the full port cleanup
  try {
    console.log('🧹 Running port cleanup...');
    const cleanupPath = path.join(__dirname, 'port-cleanup.cjs');

    if (fs.existsSync(cleanupPath)) {
      execSync(`node "${cleanupPath}" cleanup`, { stdio: 'inherit' });
    } else {
      console.error(
        '❌ Port cleanup script not found! Using built-in cleanup logic'
      );
      execSync(
        isWindows
          ? `for %i in (${TARGET_PORTS.join(' ')}) do @(for /f "tokens=5" %a in ('netstat -ano ^| find ":%i" ^| find "LISTENING"') do @taskkill /F /PID %a)`
          : `for port in ${TARGET_PORTS.join(' ')}; do lsof -ti:$port | xargs -r kill -9; done`,
        { stdio: 'inherit' }
      );
    }
  } catch (error) {
    console.error('⚠️ Port cleanup had some issues:', error.message);
  }

  // Wait a moment for ports to clear
  console.log('⏳ Waiting for port release...');
  const wait = isWindows ? 'timeout /t 2' : 'sleep 2';
  try {
    execSync(wait, { stdio: 'inherit' });
  } catch (e) {
    // Just a small busy wait if the command fails
    const start = Date.now();
    while (Date.now() - start < 2000) {}
  }
}

// Start the development environment
console.log('\n🚀 Starting development environment...');
console.log('💡 Running: npm run dev:all');
console.log('------------------------------------------\n');

// Run the dev:all script
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const devProcess = spawn(npmCommand, ['run', 'dev:all'], {
  stdio: 'inherit',
  shell: true,
});

// Handle process exit
devProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Development environment exited successfully');
  } else {
    console.error(`\n⚠️ Development environment exited with code: ${code}`);
    console.log(
      'For more details, check the logs or run `node scripts/port-cleanup.cjs status`'
    );
  }
});

// Handle signals to clean up child processes
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
  process.on(signal, () => {
    console.log(`\n🛑 Received ${signal}, shutting down...`);
    devProcess.kill(signal);
    setTimeout(() => process.exit(0), 500); // Allow some time for cleanup
  });
});
