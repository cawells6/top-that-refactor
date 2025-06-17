// wait.js - Helper to kill node processes on ports 3000 and 5173 and wait before server restart
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

// Target ports to check and clean
const PORTS = [3000, 5173];
const WAIT_TIME = 2000; // ms
const MAX_RETRIES = 3;
const isWindows = os.platform() === 'win32';

/**
 * Check if a port is in use and return the PID if it is
 */
function checkPort(port) {
  try {
    const pid = execSync(`lsof -i :${port} -sTCP:LISTEN -t`, { encoding: 'utf8' }).trim();
    return pid || null;
  } catch (error) {
    return null; // Port is free (command returns error when no process found)
  }
}

/**
 * Display port status in a formatted way
 */
function displayPortStatus(ports) {
  console.log('\n=== PORT STATUS ===');
  ports.forEach(({ port, pid }) => {
    if (pid) {
      console.log(`Port ${port}: 🔴 OCCUPIED (PID: ${pid})`);
    } else {
      console.log(`Port ${port}: 🟢 FREE`);
    }
  });
  console.log('==================\n');
}

/**
 * Kill process by PID
 */
function killProcess(pid) {
  try {
    execSync(`kill -9 ${pid}`);
    return true;
  } catch (error) {
    console.error(`Failed to kill process ${pid}: ${error.message}`);
    return false;
  }
}

/**
 * Wait for the specified amount of time
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main cleanup function
 */
async function cleanupPorts() {
  console.log('🧹 Starting port cleanup...\n');
  
  // Check initial port status
  let portStatus = PORTS.map(port => ({ port, pid: checkPort(port) }));
  
  console.log('📊 Initial port status:');
  displayPortStatus(portStatus);

  // Kill processes on occupied ports
  let killed = false;
  for (const { port, pid } of portStatus) {
    if (pid) {
      console.log(`🎯 Killing process on port ${port} (PID: ${pid})...`);
      const success = killProcess(pid);
      killed = true;
      if (success) {
        console.log(`✅ Successfully killed process on port ${port}`);
      } else {
        console.log(`❌ Failed to kill process on port ${port}`);
      }
    }
  }

  // If we killed anything, wait for cleanup
  if (killed) {
    console.log(`\n⏳ Waiting ${WAIT_TIME/1000} seconds for processes to fully terminate...`);
    await wait(WAIT_TIME);
  }

  // Final check to ensure ports are free
  portStatus = PORTS.map(port => ({ port, pid: checkPort(port) }));
  displayPortStatus(portStatus);

  const allFree = portStatus.every(({ pid }) => !pid);
  if (allFree) {
    console.log('🎉 All target ports are now free!');
  } else {
    console.log('⚠️ Some ports are still in use. You may need to manually terminate processes.');
    process.exit(1);
  }
}

console.log('🧹 Doing a single port cleanup...');

/**
 * Check if a port is free
 */
async function isPortFree(port) {
  try {
    const pid = await getProcessIdOnPort(port);
    return !pid;
  } catch (error) {
    console.log(`Port ${port} not in use or error checking: ${error.message}`);
    // If we can't check, assume it's free to avoid hanging
    return true;
  }
}

/**
 * Wait for ports to be free with retries
 */
/**
 * Helper function to get process ID on a port
 */
async function getProcessIdOnPort(port) {
  try {
    return checkPort(port);
  } catch (error) {
    console.error(`Error getting PID for port ${port}:`, error.message);
    return null;
  }
}

/**
 * Kill processes on multiple ports
 */
async function killProcessesOnPorts(ports = PORTS) {
  const results = await Promise.all(ports.map(async (port) => {
    const pid = await getProcessIdOnPort(port);
    if (pid) {
      const success = killProcess(pid);
      return { port, pid, success };
    }
    return { port, pid: null, success: true };
  }));
  
  // Wait a bit for any killed processes to fully terminate
  const anyKilled = results.some(r => r.pid && r.success);
  if (anyKilled) {
    await wait(WAIT_TIME);
  }
  
  return results;
}

// Execute the cleanup when the script is run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  cleanupPorts()
    .then(success => {
      if (success) {
        console.log('Open http://localhost:5173 in your browser.');
        process.exit(0);
      } else {
        console.error('⚠️ Port cleanup had issues, but continuing.');
        // Exit with success code anyway to allow server to start
        process.exit(0);
      }
    })
    .catch(err => {
      console.error('Error during port cleanup:', err);
      process.exit(1);
    });
}

// Export functions for programmatic use
export { cleanupPorts, killProcessesOnPorts, checkPort };
