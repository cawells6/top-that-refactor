#!/usr/bin/env node
/**
 * Simplified port status checker
 * This script only checks and displays ports 3000 and 5173
 */

const { exec } = require('child_process');
const os = require('os');
const util = require('util');

const execAsync = util.promisify(exec);
const PORTS_TO_CHECK = [3000, 5173]; // Only server and Vite ports

async function getPortStatus(ports) {
  const platform = os.platform();
  const portStatus = new Map();

  // Initialize all ports as free
  ports.forEach((port) => {
    portStatus.set(port, { inUse: false, pid: null });
  });

  try {
    let command = '';

    if (platform === 'win32') {
      command = 'netstat -aon | findstr LISTENING';
    } else {
      command = `lsof -i -P -n | grep LISTEN`;
    }

    const { stdout } = await execAsync(command);
    const lines = stdout.split(os.EOL).filter((line) => line.trim());

    for (const line of lines) {
      // Check each port to see if it appears in the netstat/lsof output
      for (const port of ports) {
        // For both Windows and Unix-like systems, check for port in output
        if (line.includes(`:${port} `) || line.includes(`:${port}`)) {
          // Extract PID (position differs between Windows and Unix)
          let pid = null;
          if (platform === 'win32') {
            // Last column in Windows netstat output is PID
            pid = line.trim().split(/\s+/).pop();
          } else {
            // Second column in lsof output is PID
            pid = line.trim().split(/\s+/)[1];
          }

          portStatus.set(port, { inUse: true, pid });
          break;
        }
      }
    }

    return portStatus;
  } catch (error) {
    console.error('Error checking port status:', error.message);
    return portStatus; // Return the initialized map with all ports free
  }
}

async function main() {
  console.log('\n=== PORT STATUS - SIMPLIFIED ===');
  console.log('Only checking ports 3000 and 5173');

  try {
    console.log('Getting port status...');
    const status = await getPortStatus(PORTS_TO_CHECK);
    console.log('Status received, displaying results');

    PORTS_TO_CHECK.forEach((port, index) => {
      const portInfo = status.get(port);
      if (!portInfo) {
        console.log(`[${index}] Port ${port}: Unknown status (null portInfo)`);
        return;
      }
      const statusText = portInfo.inUse ? `🔴 IN USE (PID: ${portInfo.pid})` : '🟢 FREE';
      console.log(`[${index}] Port ${port}: ${statusText}`);
    });

    console.log(`[${PORTS_TO_CHECK.length}] ==================`);
  } catch (error) {
    console.error('Error displaying port status:', error.message);
    console.error(error.stack);
  }
}

// Run the main function
console.log('Starting port check...');
main().catch((error) => {
  console.error('Fatal error:', error);
});
