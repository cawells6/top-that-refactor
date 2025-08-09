// wait-enhanced.js - Enhanced helper to kill node processes on ports and wait before server restart
// Features robust port checking, improved error handling, and more detailed reporting
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

// Target ports to check and clean
const PORTS = [3000, 5173];
const WAIT_TIME = 2000; // ms
const MAX_RETRIES = 5;
const isWindows = os.platform() === 'win32';

/**
 * Check if a port is in use and return the PID if it is
 */
async function checkPort(port) {
  try {
    let command = '';
    if (isWindows) {
      command = `netstat -ano | findstr :${port} | findstr LISTENING`;
      const { stdout } = await execAsync(command);
      if (stdout.trim()) {
        return stdout.trim().split(/\s+/).pop() || null;
      }
    } else {
      command = `lsof -i :${port} -sTCP:LISTEN -t`;
      const { stdout } = await execAsync(command);
      return stdout.trim() || null;
    }
    return null;
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
async function killProcess(pid) {
  try {
    if (isWindows) {
      await execAsync(`taskkill /F /PID ${pid}`);
    } else {
      await execAsync(`kill -9 ${pid}`);
    }
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main cleanup function
 */
async function cleanupPorts() {
  console.log('🧹 Starting enhanced port cleanup...\n');

  // Check initial port status
  let portStatus = await Promise.all(
    PORTS.map(async (port) => ({ port, pid: await checkPort(port) }))
  );

  console.log('📊 Initial port status:');
  displayPortStatus(portStatus);

  // Kill processes on occupied ports
  let killed = false;
  for (const { port, pid } of portStatus) {
    if (pid) {
      console.log(`🎯 Killing process on port ${port} (PID: ${pid})...`);
      const success = await killProcess(pid);
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
    console.log(
      `\n⏳ Waiting ${WAIT_TIME / 1000} seconds for processes to fully terminate...`
    );
    await wait(WAIT_TIME);
  }

  // Retry logic for stubborn processes
  for (let i = 0; i < MAX_RETRIES; i++) {
    // Check if all ports are free
    portStatus = await Promise.all(
      PORTS.map(async (port) => ({ port, pid: await checkPort(port) }))
    );

    const allFree = portStatus.every(({ pid }) => !pid);
    if (allFree) break;

    // If still occupied, try once more
    if (i < MAX_RETRIES - 1) {
      console.log(
        `\n⚠️ Some ports still in use. Retry ${i + 1}/${MAX_RETRIES}...`
      );

      for (const { port, pid } of portStatus) {
        if (pid) {
          console.log(`🎯 Retrying kill on port ${port} (PID: ${pid})...`);
          await killProcess(pid);
        }
      }

      await wait(1000); // Wait between retries
    }
  }

  // Final check to ensure ports are free
  portStatus = await Promise.all(
    PORTS.map(async (port) => ({ port, pid: await checkPort(port) }))
  );

  console.log('\n📊 Final port status:');
  displayPortStatus(portStatus);

  const allFree = portStatus.every(({ pid }) => !pid);
  if (allFree) {
    console.log('🎉 All target ports are now free!');
    return true;
  } else {
    console.log(
      '⚠️ Some ports are still in use. You may need to manually terminate processes.'
    );
    return false;
  }
}

// Execute main function when run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  cleanupPorts()
    .then((success) => {
      if (success) {
        console.log('🚀 Ready to start development servers!');
        process.exit(0);
      } else {
        console.error(
          '⚠️ Could not free all ports. Check for blocking processes.'
        );
        // Exit with success anyway to not block further scripts
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('❌ Error during port cleanup:', err);
      process.exit(1);
    });
}

// Export functions for programmatic use
export { cleanupPorts, checkPort, killProcess, displayPortStatus, wait, PORTS };
