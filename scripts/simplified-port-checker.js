#!/usr/bin/env node
/**
 * Simple port checking utility for development
 * Usage: node simplified-port-checker.js [ports...]
 * Example: node simplified-port-checker.js 3000 5173 8080
 */

const { exec } = require('child_process');
const os = require('os');

const isWin = os.platform() === 'win32';
const ports =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2).map((p) => parseInt(p, 10))
    : [3000, 5173];

/**
 * Check if a port is in use
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const command = isWin
      ? `netstat -ano | findstr :${port} | findstr LISTENING`
      : `lsof -i :${port} -sTCP:LISTEN -t`;

    exec(command, (error, stdout) => {
      if (error || !stdout.trim()) {
        console.log(`Port ${port}: 🟢 FREE`);
        resolve(null);
      } else {
        const pid = isWin
          ? stdout.trim().split(/\s+/).pop()
          : stdout.trim().split('\n')[0];
        console.log(`Port ${port}: 🔴 OCCUPIED (PID: ${pid})`);
        resolve(pid);
      }
    });
  });
}

// Main function
async function main() {
  console.log(`\n📊 Checking ports: ${ports.join(', ')}...\n`);

  const results = await Promise.all(ports.map((port) => checkPort(port)));

  // Summary
  const occupiedCount = results.filter((pid) => pid !== null).length;

  console.log(
    `\n${
      occupiedCount === 0
        ? '✅ All ports are free!'
        : `⚠️ ${occupiedCount} port(s) occupied. Use 'npm run clean:ports' to free them.`
    }`
  );
}

// Execute if run directly
main();
