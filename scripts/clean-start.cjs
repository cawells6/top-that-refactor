// scripts/clean-start.cjs
// Cross-platform Node.js script to kill lingering node and vite processes before dev start
// Windows: kills node.exe and vite.exe; other OS: prints a warning (customize as needed)

const { execSync } = require('child_process');
const os = require('os');

function killWindowsProcesses() {
  try {
    // /F: force, /IM: image name, /T: kill child processes
    execSync('taskkill /F /IM node.exe /T', { stdio: 'ignore' });
  } catch {
    // Ignore errors if no node.exe processes found
  }
  try {
    execSync('taskkill /F /IM vite.exe /T', { stdio: 'ignore' });
  } catch {
    // Ignore errors if no vite.exe processes found
  }
  console.log('✅ Killed lingering node.exe and vite.exe processes (if any).');
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
