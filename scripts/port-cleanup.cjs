const { execSync } = require('child_process');
const os = require('os');

// Try to load chalk for colorized output, fall back to simple functions if not available
let chalk;
try {
  chalk = require('chalk');
} catch (e) {
  chalk = { 
    green: (t) => t, 
    red: (t) => t, 
    yellow: (t) => t, 
    blue: (t) => t,
    bold: (t) => t
  };
}

// Target ports to check and clean
const TARGET_PORTS = [3000, 5173];
const isWindows = os.platform() === 'win32';
const MAX_RETRIES = 3;

/**
 * Check if a port is in use and return the PID if it is
 */
function checkPort(port) {
  try {
    let pid;
    if (isWindows) {
      const output = execSync(
        `netstat -ano | findstr :${port} | findstr LISTENING`,
        { encoding: 'utf8' }
      ).trim();
      if (output) {
        // Extract PID from the last column in Windows netstat output
        pid = output.split(/\s+/).pop();
      }
    } else {
      // For Unix-like systems
      pid = execSync(`lsof -i :${port} -sTCP:LISTEN -t`, { encoding: 'utf8' }).trim();
    }
    return pid || null;
  } catch (error) {
    return null; // Port is free (command returns error when no process found)
  }
}

/**
 * Display port status in a cleaner format
 */
function displayPortStatus(ports) {
  console.log('\n=== PORT STATUS ===');
  ports.forEach(({ port, pid }) => {
    if (pid) {
      console.log(`Port ${port}: ${chalk.red('🔴 OCCUPIED')} (PID: ${pid})`);
    } else {
      console.log(`Port ${port}: ${chalk.green('🟢 FREE')}`);
    }
  });
  console.log('==================\n');
}

/**
 * Kill process on a specific port
 */
function killProcess(pid) {
  try {
    if (isWindows) {
      execSync(`taskkill /F /PID ${pid}`);
    } else {
      execSync(`kill -9 ${pid}`);
    }
    return true;
  } catch (error) {
    console.error(`Failed to kill process ${pid}: ${error.message}`);
    return false;
  }
}

/**
 * Sleep function that works cross-platform
 */
function sleep(seconds) {
  try {
    if (isWindows) {
      // On Windows, use a busy wait
      const start = Date.now();
      while (Date.now() - start < seconds * 1000) {
        // Busy wait
      }
    } else {
      // On Unix systems, use sleep command
      execSync(`sleep ${seconds}`);
    }
  } catch (error) {
    // Fallback to busy wait if sleep command fails
    const start = Date.now();
    while (Date.now() - start < seconds * 1000) {
      // Busy wait
    }
  }
}

/**
 * Main cleanup function
 * @param {boolean} verbose - Whether to log detailed messages
 * @returns {boolean} - True if all ports are free after cleanup
 */
function cleanupPorts(verbose = true) {
  if (verbose) console.log('🧹 Starting port cleanup...\n');
  
  // Check initial port status
  let portStatus = TARGET_PORTS.map(port => ({ port, pid: checkPort(port) }));
  
  if (verbose) {
    console.log('📊 Initial port status:');
    displayPortStatus(portStatus);
  }

  // Kill processes on occupied ports
  let killed = false;
  portStatus.forEach(({ port, pid }) => {
    if (pid) {
      if (verbose) console.log(`🎯 Killing process on port ${port} (PID: ${pid})...`);
      const success = killProcess(pid);
      killed = true;
      if (verbose) {
        if (success) {
          console.log(`✅ Successfully killed process on port ${port}`);
        } else {
          console.log(`❌ Failed to kill process on port ${port}`);
        }
      }
    }
  });

  // If we killed anything, wait for cleanup
  if (killed) {
    if (verbose) console.log(`\n⏳ Waiting 2 seconds for processes to fully terminate...`);
    sleep(2);
  }

  // Retry for stubborn processes
  let retryCount = 0;
  let allFree = false;
  
  while (retryCount < MAX_RETRIES && !allFree) {
    // Check if all ports are free
    portStatus = TARGET_PORTS.map(port => ({ port, pid: checkPort(port) }));
    allFree = portStatus.every(({ pid }) => !pid);
    
    if (!allFree && retryCount < MAX_RETRIES - 1) {
      if (verbose) console.log(`\n🔄 Retry ${retryCount + 1}/${MAX_RETRIES}...`);
      
      // Kill any remaining processes
      portStatus.forEach(({ port, pid }) => {
        if (pid) {
          if (verbose) console.log(`🎯 Killing process on port ${port} (PID: ${pid})...`);
          killProcess(pid);
        }
      });
      
      sleep(1);
      retryCount++;
    } else {
      break;
    }
  }
  
  // Final check to ensure ports are free
  portStatus = TARGET_PORTS.map(port => ({ port, pid: checkPort(port) }));
  
  if (verbose) {
    displayPortStatus(portStatus);
  }

  allFree = portStatus.every(({ pid }) => !pid);
  if (verbose) {
    if (allFree) {
      console.log('🎉 All target ports are now free!');
    } else {
      console.log('⚠️ Some ports are still in use. You may need to manually terminate processes.');
    }
  }

  return allFree;
}

/**
 * Get processes using the target ports
 * @returns {Map<number, {port: number, pid: string}>} - Map of port to process info
 */
function getPortProcesses(ports = TARGET_PORTS) {
  const processes = new Map();
  
  ports.forEach(port => {
    const pid = checkPort(port);
    if (pid) {
      processes.set(port, { port, pid });
    }
  });
  
  return processes;
}

/**
 * Monitor port activation (useful after starting dev servers)
 */
function monitorPortActivation() {
  console.log('\n🔍 Monitoring port activation...');
  
  // Initial state
  const initialProcesses = getPortProcesses();
  console.log('\nInitial state:');
  displayPortStatus(Array.from(initialProcesses.values()));
  
  console.log('\n⏳ Monitoring for 30 seconds...');
  console.log('Press Ctrl+C to stop monitoring\n');
  
  // Start monitoring
  const intervalId = setInterval(() => {
    const currentProcesses = getPortProcesses();
    
    TARGET_PORTS.forEach(port => {
      const initial = initialProcesses.has(port);
      const current = currentProcesses.has(port);
      
      if (!initial && current) {
        // Port was activated
        console.log(`${new Date().toLocaleTimeString()} - Port ${port} is now active (PID: ${currentProcesses.get(port).pid})`);
      } else if (initial && !current) {
        // Port was deactivated
        console.log(`${new Date().toLocaleTimeString()} - Port ${port} is no longer active`);
      }
    });
    
  }, 2000); // Check every 2 seconds
  
  // Stop after 30 seconds
  setTimeout(() => {
    clearInterval(intervalId);
    
    // Final state
    const finalProcesses = getPortProcesses();
    console.log('\nFinal state after monitoring:');
    displayPortStatus(Array.from(finalProcesses.values()));
    
    console.log('🏁 Monitoring complete');
  }, 30000);
}

// Command line interface
function main() {
  const command = process.argv[2] || 'cleanup';

  switch (command) {
    case 'cleanup':
      cleanupPorts(true);
      break;
      
    case 'monitor':
      monitorPortActivation();
      break;
      
    case 'full':
      const success = cleanupPorts(true);
      if (success) {
        monitorPortActivation();
      } else {
        console.log('⚠️ Port cleanup was not fully successful, skipping monitoring');
      }
      break;
      
    case 'status':
      const processes = getPortProcesses();
      displayPortStatus(Array.from(processes.values()));
      break;
      
    case 'help':
      console.log(`
Port Cleanup Utility

Usage:
  node port-cleanup.cjs [command]

Commands:
  cleanup   Kill processes on ports ${TARGET_PORTS.join(', ')} (default)
  monitor   Monitor port activation for 30 seconds
  full      Run cleanup followed by monitoring
  status    Show current port status without killing processes
  help      Show this help message
      `);
      break;
      
    default:
      console.log(`Unknown command: ${command}. Use 'help' for usage information.`);
  }
}

// If this script is run directly
if (require.main === module) {
  main();
}

// Export functions for use in other scripts
module.exports = {
  cleanupPorts,
  getPortProcesses,
  killProcess,
  displayPortStatus,
  monitorPortActivation,
  TARGET_PORTS
};
