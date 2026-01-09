#!/usr/bin/env node
/**
 * Advanced Development Environment Starter
 * 
 * This script:
 * 1. Cleans up ports 3000 and 5173
 * 2. Starts the development server (npm run dev:all)
 * 3. Monitors for issues during startup
 */

const { spawn } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';

// Simple startup banner
console.log('🚀 Advanced Development Environment Starter');
console.log('------------------------------------------');
console.log('⏳ Preparing to launch development environment...');
console.log('Skip port cleanup here as it will be handled by wait.js');

// Start the development environment
console.log('\n🚀 Starting development environment...');
console.log('💡 Running: npm run dev:all:fast');
console.log('------------------------------------------\n');

// Run the dev:all:fast script which skips redundant port cleanup
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const devProcess = spawn(npmCommand, ['run', 'dev:all:fast'], {
  stdio: 'inherit',
  shell: true
});

// Handle process exit
devProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Development environment exited successfully');
  } else {
    console.error(`\n⚠️ Development environment exited with code: ${code}`);
    console.log('For more details, check the logs or run `npm run show:ports`');
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
