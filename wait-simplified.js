// wait-simplified.js - Streamlined port cleanup script
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);
const PORTS = [3000, 5173];
const isWindows = os.platform() === 'win32';

/**
 * Check if a port is in use and return the PID if it is
 */
function checkPort(port) {
  try {
    let command = isWindows
      ? `netstat -ano | findstr :${port} | findstr LISTENING`
      : `lsof -i :${port} -sTCP:LISTEN -t`;

    const result = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    if (result) {
      return isWindows ? result.split(/\s+/).pop() : result;
    }
    return null;
  } catch (error) {
    return null; // Port is free
  }
}

/**
 * Kill processes on ports
 */
async function killProcessesOnPorts() {
  console.log('Cleaning ports...');

  for (const port of PORTS) {
    const pid = checkPort(port);
    if (pid) {
      try {
        if (isWindows) {
          execSync(`taskkill /F /PID ${pid}`, {
            stdio: ['ignore', 'ignore', 'ignore'],
          });
        } else {
          execSync(`kill -9 ${pid}`, { stdio: ['ignore', 'ignore', 'ignore'] });
        }
        console.log(`✓ Port ${port} freed`);
      } catch (err) {
        // Ignore errors
      }
    } else {
      console.log(`✓ Port ${port} already available`);
    }
  }

  // Wait a moment for processes to terminate
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

// Run cleanup
killProcessesOnPorts()
  .then(() => {
    console.log('All ports ready for development server');
  })
  .catch(() => {
    // Always exit successfully even if there were errors
    process.exit(0);
  });
