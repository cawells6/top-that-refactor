// scripts/clean-start.cjs
// Cross-platform Node.js script to kill lingering node and vite processes before dev start
// Windows: kills node.exe and vite.exe; other OS: prints a warning (customize as needed)

const path = require('path');
const os = require('os');

function killWindowsProcesses() {
  // IMPORTANT: Instead of killing all node processes (which is too aggressive),
  // we'll leverage the port-cleanup.cjs script to target only the processes on our specific ports
  try {
    console.log('🔍 Looking for processes on game server ports...');
    const portCleanupPath = path.resolve(__dirname, './port-cleanup.cjs');
    const portCleanup = require(portCleanupPath);

    // Only clean up the server port 3000, leave Vite port alone (5173)
    portCleanup.cleanupPorts([3000]);

    console.log('✅ Cleaned up server port processes.');
  } catch (error) {
    console.log(`⚠️ Port cleanup failed: ${error.message}. Continuing anyway.`);
  }
}

function main() {
  if (os.platform() === 'win32') {
    killWindowsProcesses();
  } else {
    // Optionally, implement pkill for Unix here
    console.warn('⚠️  Process cleanup is only implemented for Windows.');
  }
}

main();
