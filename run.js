#!/usr/bin/env node
/**
 * Minimal Top That! Development Launcher
 * Uses kill-port for reliable cleanup
 */

import { execSync, spawn } from 'child_process';
import os from 'os';

// Kill any processes on development ports and start the servers
function startDev() {
  const isWindows = os.platform() === 'win32';

  console.log('🚀 Top That! Development');

  // Single cleanup operation using kill-port
  try {
    execSync('npx kill-port 3000 5173', { stdio: 'ignore' });
  } catch (e) {
    // Ignore errors - we just want to make sure ports are free
  }

  // Wait a moment to ensure ports are released
  setTimeout(() => {
    // Start dev servers directly
    const npm = isWindows ? 'npm.cmd' : 'npm';

    // Use the clean variant to avoid duplicate cleanup
    const dev = spawn(npm, ['run', 'dev:all:clean'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    });

    // Handle clean exit
    dev.on('close', (code) => process.exit(code));

    // Handle interrupts
    for (const sig of ['SIGINT', 'SIGTERM']) {
      process.on(sig, () => {
        dev.kill();
        setTimeout(() => process.exit(0), 100);
      });
    }
  }, 500);
}

// Run the minimal starter
startDev();
