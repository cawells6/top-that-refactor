#!/usr/bin/env node
/**
 * Custom script to run before nodemon restarts the server
 * This script performs targeted port cleanup specifically for server port (3000)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Only target the server port - leave Vite client running
const SERVER_PORT = 3000;

/**
 * Attempt to read current-port.txt file to get the actual server port
 * Falls back to SERVER_PORT (3000) if file doesn't exist or can't be read
 */
function getCurrentServerPort() {
  try {
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

function cleanupServerPort() {
  console.log('🔄 Nodemon restart triggered - cleaning up server port...');

  // Get the server port - could be different from default if port was in use
  const port = getCurrentServerPort();

  try {
    console.log(`🔍 Cleaning up port ${port} with kill-port`);
    execSync(`npx kill-port ${port}`, { stdio: 'inherit' });
    console.log('✅ Port cleanup complete - proceeding with server restart');
    return true;
  } catch (error) {
    console.error('❌ Error during port cleanup:', error);
    // Still return success so nodemon continues with restart
    return true;
  }
}

cleanupServerPort();
