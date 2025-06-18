#!/usr/bin/env node
/**
 * Development launcher that cleans ports before starting the dev servers.
 * Only prints the ports in use before and after cleanup.
 */
import { execSync, spawn } from 'child_process';
import os from 'os';

const PORTS = [3000, 5173];
const isWindows = os.platform() === 'win32';

/**
 * Checks if a port has a process listening on it.
 * @param {number} port The port to check.
 * @returns {boolean} True if the port is occupied.
 */
function isPortOccupied(port) {
  try {
    const command = isWindows
      ? `netstat -ano | findstr :${port} | findstr LISTENING`
      : `lsof -ti:${port}`;
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Kills any process using the given port (LISTENING or ESTABLISHED) on Windows.
 * @param {number} port The port to kill.
 */
function killPortWindows(port) {
  try {
    // Find all PIDs for the port (LISTENING and ESTABLISHED)
    const netstat = execSync(`netstat -ano | findstr :${port}`).toString();
    const lines = netstat.split('\n').filter(Boolean);
    const pids = Array.from(
      new Set(
        lines
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && !isNaN(pid) && pid !== '0')
      )
    );
    if (pids.length === 0) {
      return;
    }
    pids.forEach((pid) => {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } catch (e) {
        // Ignore errors
      }
    });
  } catch (e) {
    // Ignore errors
  }
}

function killPort(port) {
  if (isWindows) {
    killPortWindows(port);
  } else {
    try {
      const command = `lsof -ti:${port}`;
      const pids = execSync(command).toString().split('\n').filter(Boolean);
      if (pids.length > 0) {
        execSync(`lsof -ti:${port} | xargs -r kill -9`, { stdio: 'ignore' });
      }
    } catch (e) {
      console.log(`[Unix] Error finding/killing port ${port}: ${e.message}`);
    }
  }
}

function main() {
  // 1. Report occupied ports before cleaning
  const before = PORTS.filter(isPortOccupied);

  // 2. Kill processes on all target ports
  if (before.length > 0) {
    before.forEach(killPort);
  }

  // 3. Wait to ensure ports are released, then report status and start servers
  setTimeout(() => {
    const after = PORTS.filter(isPortOccupied);
    if (after.length > 0) {
      console.error(
        '\x1b[41mFAILED: Could not clear ports. Please close the processes manually and try again.\x1b[0m'
      );
      process.exit(1);
    }
    console.log('\x1b[42m\x1b[30m✔️  Ports are free. Starting development servers...\x1b[0m');
    const npm = isWindows ? 'npm.cmd' : 'npm';
    let serverExited = false;
    let clientExited = false;
    let serverCode = 0;
    let clientCode = 0;
    // Spawn dev:server and dev:client, filter their output
    const server = spawn(npm, ['run', 'dev:server'], { shell: true });
    const client = spawn(npm, ['run', 'dev:client'], { shell: true });
    function filterAndPrint(data) {
      const lines = data.toString().split(/\r?\n/);
      for (const line of lines) {
        if (
          /http:\/\//.test(line) ||
          /https:\/\//.test(line) ||
          /Top That! server running at https?:\/\//.test(line)
        ) {
          console.log(line);
        }
      }
    }
    server.stdout.on('data', filterAndPrint);
    server.stderr.on('data', filterAndPrint);
    client.stdout.on('data', filterAndPrint);
    client.stderr.on('data', filterAndPrint);
    server.on('close', (code) => {
      serverExited = true;
      serverCode = code ?? 0;
      if (clientExited) finish();
    });
    client.on('close', (code) => {
      clientExited = true;
      clientCode = code ?? 0;
      if (serverExited) finish();
    });
    function finish() {
      if (serverCode === 0 && clientCode === 0) {
        console.log('\x1b[42m\x1b[30m✔️  Both dev servers exited successfully.\x1b[0m');
        process.exit(0);
      } else {
        console.error('\x1b[41mOne or both dev servers exited with errors.\x1b[0m');
        process.exit(serverCode || clientCode || 1);
      }
    }
  }, 4000); // 4 second safeguard
}

main();
