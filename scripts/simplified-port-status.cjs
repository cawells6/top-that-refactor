#!/usr/bin/env node
/**
 * Simple utility to check port status without killing processes
 */

const { exec } = require('child_process');
const os = require('os');
const util = require('util');

const execAsync = util.promisify(exec);
const TARGET_PORTS = [3000, 5173]; // Only server and Vite ports

async function getPortProcesses(ports) {
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

async function displayPortStatus(processes) {
  console.log('📊 Port Status:');
  TARGET_PORTS.forEach((port, index) => {
    const portInfo = processes.get(port);
    if (!portInfo) {
      console.log(`[${index}] Port ${port}: Unknown status (null portInfo)`);
      return;
    }
    const statusText = portInfo.inUse ? `🔴 IN USE (PID: ${portInfo.pid})` : '🟢 FREE';
    console.log(`[${index}] Port ${port}: ${statusText}`);
  });

  console.log(`[${TARGET_PORTS.length}] ==================`);
}

async function checkPortStatus() {
  console.log('📊 Checking status of development ports...');
  const processes = await getPortProcesses(TARGET_PORTS);
  displayPortStatus(processes);

  // Return summary information
  return {
    total: TARGET_PORTS.length,
    occupied: processes.size,
    free: TARGET_PORTS.length - processes.size,
    details: Array.from(processes.entries()).map(([port, proc]) => ({
      port,
      pid: proc.pid,
      state: proc.state
    }))
  };
}

// Run directly
if (require.main === module) {
  checkPortStatus()
    .then(summary => {
      console.log(`Summary: ${summary.free} free, ${summary.occupied} occupied`);
    })
    .catch(err => {
      console.error('Error checking port status:', err);
      process.exit(1);
    });
}

module.exports = checkPortStatus;
