#!/usr/bin/env node
/**
 * Debug version of the nodemon-restart script
 * This script is used to test the port-cleanup.cjs module
 * and diagnose any issues
 */

try {
  const { exec } = require('child_process');
  const path = require('path');

  console.log('Current directory:', __dirname);
  
  // Import the port-cleanup.cjs module
  const portCleanupPath = path.resolve(__dirname, './port-cleanup.cjs');
  console.log('Loading module from:', portCleanupPath);
  const portCleanup = require(portCleanupPath);

// Log the available functions
console.log('Available functions in port-cleanup.cjs:');
console.log(Object.keys(portCleanup));

// Check the cleanupPorts implementation
const cleanupPorts = portCleanup.cleanupPorts;
if (typeof cleanupPorts === 'function') {
  console.log('\ncleanupPorts implementation:');
  console.log(cleanupPorts.toString());
}

// Test the cleanupPorts function with only the server port
async function testCleanupServerPort() {
  console.log('\n=== Testing cleanupPorts with only server port (3000) ===');
  try {
    await portCleanup.cleanupPorts([3000]);
    console.log('✅ Server port cleanup completed successfully');
  } catch (err) {
    console.error('❌ Error during server port cleanup:', err);
  }
}

// Run the test
testCleanupServerPort();
