#!/usr/bin/env node
/**
 * Minimal Top That! Development Launcher
 * No duplicated port cleanup, minimal output
 */

import { execSync, spawn } from 'child_process';
import os from 'os';

// Kill any processes on development ports and start the servers
function startDev() {
  const isWindows = os.platform() === 'win32';
  const ports = [3000, 5173];
  
  console.log('🚀 Top That! Development');

  // Single cleanup operation with minimal output
  try {
    if (isWindows) {
      ports.forEach(port => {
        try { 
          execSync(`for /f "tokens=5" %a in ('netstat -ano ^| find ":${port}" ^| find "LISTENING"') do taskkill /F /PID %a 2>nul`, 
            { stdio: 'ignore' }); 
        } catch (e) {}
      });
    } else {
      ports.forEach(port => {
        try { 
          execSync(`lsof -ti:${port} | xargs -r kill -9`, 
            { stdio: 'ignore' }); 
        } catch (e) {}
      });
    }
  } catch (e) {
    // Ignore errors - we just want to make sure ports are free
  }
  
  // Wait a moment to ensure ports are released
  setTimeout(() => {
    // Start dev servers directly without any npm run commands that might introduce more cleanup
    const npm = isWindows ? 'npm.cmd' : 'npm';
    
    // Use concurrently directly to avoid npm run wrapper
    const dev = spawn(npm, ['run', 'dev:all:fast'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_NO_WARNINGS: '1' }
    });
    
    // Handle clean exit
    dev.on('close', code => process.exit(code));
    
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
