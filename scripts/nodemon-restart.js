#!/usr/bin/env node
/**
 * Custom script to run before nodemon restarts the server
 * This script performs port cleanup specifically for server port (3000)
 * It ignores the Vite port to avoid disrupting the client
 */

const path = require('path');
const fs = require('fs');

// Set a timeout to avoid hanging the restart process
const EXECUTION_TIMEOUT = 5000; // 5 seconds max execution time
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Script execution timed out')), EXECUTION_TIMEOUT);
});

// Import helper functions from port-cleanup.cjs
let portCleanup;
try {
  const portCleanupPath = path.resolve(__dirname, './port-cleanup.cjs');
  console.log(`📂 Loading port cleanup module from: ${portCleanupPath}`);

  portCleanup = require(portCleanupPath);

  // Validate that the cleanupPorts function is available
  if (!portCleanup.cleanupPorts) {
    console.error('❌ Error: port-cleanup.cjs is missing the cleanupPorts function');
    console.log('Available functions:', Object.keys(portCleanup).join(', '));
    process.exit(1);
  }
} catch (error) {
  console.error(`❌ Failed to load port-cleanup.cjs: ${error.message}`);
  console.error('Continuing with restart without port cleanup');
  process.exit(0); // Exit successfully to allow nodemon to continue
}

// Only target the server port - leave Vite client running
const SERVER_PORT = 3000;

/**
 * Attempt to read current-port.txt file to get the actual server port
 * Falls back to SERVER_PORT (3000) if file doesn't exist or can't be read
 * @returns {number} The port number the server is running on
 */
function getCurrentServerPort() {
  try {
    // We already have fs imported at the top
    const portPath = path.resolve(__dirname, '../current-port.txt');

    if (fs.existsSync(portPath)) {
      const port = parseInt(fs.readFileSync(portPath, 'utf-8').trim(), 10);
      if (!isNaN(port) && port > 0) {
        console.log(`📌 Found server running on port ${port} (from current-port.txt)`);
        return port;
      }
    }
  } catch (error) {
    console.log(`⚠️ Could not read current-port.txt: ${error.message}`);
  }

  console.log(`📌 Using default server port: ${SERVER_PORT}`);
  return SERVER_PORT;
}

/**
 * Cleanup the server port before nodemon restarts
 */
async function cleanupServerPort() {
  console.log('🔄 Nodemon restart triggered - cleaning up server port...');

  // Get the server port - could be different from default if port was in use
  const port = getCurrentServerPort();

  try {
    // Use Promise.race to implement timeout
    await Promise.race([
      (async () => {
        console.log(`🔍 Using cleanupPorts for port ${port} only`);
        // Important: Only pass the server port, not the default array which includes the Vite port
        await portCleanup.cleanupPorts([port]);
      })(),
      timeoutPromise,
    ]);

    console.log('✅ Port cleanup complete - proceeding with server restart');
    return true;
  } catch (error) {
    if (error.message === 'Script execution timed out') {
      console.error('⏱️ Port cleanup timed out - continuing with restart anyway');
    } else {
      console.error('❌ Error during port cleanup:', error);
    }
    // Still return success so nodemon continues with restart
    return true;
  }
}

async function main() {
  try {
    await cleanupServerPort();
    process.exit(0); // Success
  } catch (error) {
    console.error('❌ Fatal error during port cleanup:', error);
    // Exit with success code anyway to allow nodemon to continue
    process.exit(0);
  }
}

// Start the cleanup process
main();
