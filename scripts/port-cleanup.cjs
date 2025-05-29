const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Target ports for your Top-That project
const TARGET_PORTS = [3000, 5173, 5170]; // Server, Vite client, and fallback

/**
 * Get processes running on specific ports
 */
async function getPortProcesses(ports) {
  const processes = new Map();

  for (const port of ports) {
    try {
      // Use netstat to find processes on specific ports
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout
        .trim()
        .split('\n')
        .filter((line) => line.includes(`:${port}`));

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const localAddress = parts[1];
          const state = parts[3];
          const pid = parts[4];

          if (state === 'LISTENING' && localAddress.includes(`:${port}`)) {
            processes.set(port, { pid, address: localAddress, state });
            break;
          }
        }
      }
    } catch {
      // Port not in use, which is fine
    }
  }

  return processes;
}

/**
 * Kill processes by PID
 */
async function killProcess(pid) {
  try {
    await execAsync(`taskkill /F /PID ${pid}`);
    return true;
  } catch (error) {
    console.log(`Failed to kill PID ${pid}: ${error.message}`);
    return false;
  }
}

/**
 * Display current port status
 */
function displayPortStatus(processes) {
  console.log('\n=== PORT STATUS ===');
  for (const port of TARGET_PORTS) {
    const process = processes.get(port);
    if (process) {
      console.log(`Port ${port}: 🔴 OCCUPIED (PID: ${process.pid})`);
    } else {
      console.log(`Port ${port}: 🟢 FREE`);
    }
  }
  console.log('==================\n');
}

/**
 * Main cleanup function
 */
async function cleanupPorts() {
  console.log('🧹 Starting port cleanup for Top-That project...\n');

  // Check initial status
  console.log('📊 Initial port status:');
  let processes = await getPortProcesses(TARGET_PORTS);
  displayPortStatus(processes);

  // Kill processes on target ports
  let killedCount = 0;
  for (const [port, process] of processes) {
    console.log(`🎯 Killing process on port ${port} (PID: ${process.pid})...`);
    const success = await killProcess(process.pid);
    if (success) {
      killedCount++;
      console.log(`✅ Successfully killed process on port ${port}`);
    }
  }

  if (killedCount > 0) {
    console.log('\n⏳ Waiting 2 seconds for processes to fully terminate...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Check final status
  console.log('📊 Final port status:');
  processes = await getPortProcesses(TARGET_PORTS);
  displayPortStatus(processes);

  const stillOccupied = processes.size;
  if (stillOccupied === 0) {
    console.log('🎉 All target ports are now free!');
  } else {
    console.log(
      `⚠️  ${stillOccupied} port(s) still occupied. You may need to manually check these.`
    );
  }

  return stillOccupied === 0;
}

/**
 * Monitor port activation (useful after starting dev servers)
 */
async function monitorPortActivation() {
  console.log('\n🔍 Monitoring port activation...\n');

  const initialProcesses = await getPortProcesses(TARGET_PORTS);
  console.log('Initial state:');
  displayPortStatus(initialProcesses);

  // Monitor for changes
  let previousProcesses = new Map(initialProcesses);

  for (let i = 0; i < 30; i++) {
    // Monitor for 30 seconds
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const currentProcesses = await getPortProcesses(TARGET_PORTS);

    // Check for newly activated ports
    for (const [port, process] of currentProcesses) {
      if (!previousProcesses.has(port)) {
        console.log(`🚀 Port ${port} activated! (PID: ${process.pid})`);
      }
    }

    // Check for deactivated ports
    for (const [port] of previousProcesses) {
      if (!currentProcesses.has(port)) {
        console.log(`🛑 Port ${port} deactivated!`);
      }
    }

    previousProcesses = new Map(currentProcesses);
  }

  console.log('\n📊 Final monitoring status:');
  const finalProcesses = await getPortProcesses(TARGET_PORTS);
  displayPortStatus(finalProcesses);
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'cleanup';

  try {
    switch (command) {
      case 'cleanup':
        await cleanupPorts();
        break;
      case 'monitor':
        await monitorPortActivation();
        break;
      case 'status': {
        const processes = await getPortProcesses(TARGET_PORTS);
        displayPortStatus(processes);
        break;
      }
      case 'full':
        // Full cycle: cleanup, then monitor
        await cleanupPorts();
        console.log('\n⏳ Starting 5-second countdown before monitoring...');
        for (let i = 5; i > 0; i--) {
          process.stdout.write(`${i}... `);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        console.log('\n');
        await monitorPortActivation();
        break;
      default:
        console.log('Usage: node port-cleanup.cjs [cleanup|monitor|status|full]');
        console.log('  cleanup - Kill processes on target ports (default)');
        console.log('  monitor - Monitor port activation for 30 seconds');
        console.log('  status  - Show current port status');
        console.log('  full    - Cleanup then monitor');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { cleanupPorts, monitorPortActivation, getPortProcesses, displayPortStatus };
