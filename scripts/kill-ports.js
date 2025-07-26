const { execSync } = require('child_process');
const os = require('os');

/**
 * Kills processes running on specified ports
 * @param {number[]} ports - Array of ports to kill
 */
function killPorts(ports) {
  const isWindows = os.platform() === 'win32';

  ports.forEach((port) => {
    console.log(`Attempting to kill processes on port ${port}...`);

    try {
      if (isWindows) {
        // For Windows
        const command = `FOR /F "tokens=5" %a in ('netstat -ano ^| find ":${port}" ^| find "LISTENING"') do (taskkill /F /PID %a)`;
        execSync(command, { shell: 'cmd.exe', stdio: 'inherit' });
      } else {
        // For Unix-like systems (Linux, macOS)
        execSync(
          `lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs -r kill -9`,
          { stdio: 'inherit' }
        );
      }

      // Give the OS a moment to release the port
      console.log(`Waiting for port ${port} to be released...`);
      execSync('sleep 1');
    } catch (error) {
      console.log(
        `No process was using port ${port} or failed to kill: ${error.message}`
      );
    }
  });

  console.log('Port killing process completed');
}

// If script is run directly
if (require.main === module) {
  const ports = process.argv.slice(2).map((arg) => parseInt(arg, 10));
  if (ports.length === 0) {
    console.log('Usage: node kill-ports.js PORT1 PORT2 ...');
    process.exit(1);
  }
  killPorts(ports);
}

module.exports = { killPorts };
