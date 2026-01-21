#!/usr/bin/env node
/**
 * Minimal Top That! Development Launcher
 * Uses kill-port for reliable cleanup
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

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
    // Start dev servers directly and capture output so we can open the browser once
    const npm = isWindows ? 'npm.cmd' : 'npm';

    // Use the clean variant to avoid duplicate cleanup
    const dev = spawn(npm, ['run', 'dev:all:clean'], {
      shell: true,
      // Prevent Vite from also auto-opening a browser (we open once ourselves).
      env: { ...process.env, NODE_NO_WARNINGS: '1', NO_AUTO_OPEN: '1' },
    });

    function browserOpenLockPath() {
      const workspace = process.cwd();
      const workspaceHash = crypto.createHash('sha1').update(workspace).digest('hex').slice(0, 10);
      return path.join(os.tmpdir(), `topthat-browser-open-${workspaceHash}.lock`);
    }

    function canOpenBrowserNow() {
      // Guard against accidental double-invocations (e.g., button refresh / rapid reruns).
      const lockPath = browserOpenLockPath();
      try {
        const stat = fs.statSync(lockPath);
        const ageMs = Date.now() - stat.mtimeMs;
        // If you restart dev servers shortly after, avoid spawning another browser window.
        if (ageMs >= 0 && ageMs < 5 * 60 * 1000) return false;
      } catch {
        // No lock; proceed.
      }

      try {
        fs.writeFileSync(lockPath, String(Date.now()), 'utf8');
      } catch {
        // Best-effort; still try to open.
      }
      return true;
    }

    // Cross-platform single-open helper
    let opened = false;
    function openBrowserOnce(url) {
      if (opened) return;
      opened = true;
      if (!canOpenBrowserNow()) return;
      try {
        if (isWindows) {
          // Use start to open default browser on Windows
          spawn('cmd', ['/c', 'start', '""', url], { shell: false, stdio: 'ignore', detached: true }).unref();
        } else if (os.platform() === 'darwin') {
          spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
        } else {
          // Linux and others: try xdg-open
          spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
        }
      } catch (e) {
        // Best-effort; ignore errors
      }
    }

    // Listen to stdout/stderr to detect Vite's "Local: http://localhost:5173" message
    const shouldAutoOpen = !process.env.NO_AUTO_OPEN;
    dev.stdout?.on('data', (chunk) => {
      const s = chunk.toString();
      process.stdout.write(s);
      if (shouldAutoOpen && !opened && /http:\/\/localhost:5173/.test(s)) {
        openBrowserOnce('http://localhost:5173');
      }
    });
    dev.stderr?.on('data', (chunk) => {
      const s = chunk.toString();
      process.stderr.write(s);
      if (shouldAutoOpen && !opened && /http:\/\/localhost:5173/.test(s)) {
        openBrowserOnce('http://localhost:5173');
      }
    });

    // Fallback: if output is filtered/suppressed, wait for the port and open once.
    if (shouldAutoOpen) {
      const wait = spawn(
        npm,
        ['exec', '--yes', 'wait-on', '--', 'http://localhost:5173', '--timeout', '60000'],
        {
          shell: true,
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
          stdio: 'ignore',
        }
      );
      wait.on('close', (code) => {
        if (code === 0) openBrowserOnce('http://localhost:5173');
      });
    }

    // Fallback: if the child exits without printing the URL, don't try to open
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
