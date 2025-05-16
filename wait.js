// wait.js - Helper to kill port 3000 and wait before server restart
import { exec } from 'child_process';

// Only kill node processes on port 3000, not browsers
const isWin = process.platform === 'win32';
const killCommand = isWin
  ? 'for /f "tokens=5" %a in ("netstat -aon | findstr :3000") do tasklist /FI "PID eq %a" | find /I "node.exe" && taskkill /F /PID %a'
  : "lsof -i :3000 | awk '$1==\"node\"{print $2}' | xargs -r kill";

console.log('[wait] Killing any node process on port 3000...');
exec(killCommand, (err, stdout, stderr) => {
  if (err) {
    console.log(`[wait] Error killing node process: ${err.message}`);
  } else {
    console.log(`[wait] Node process kill result: ${stdout.trim() || 'No output'}`);
  }
  // Wait 1.5 seconds to ensure port is fully released
  console.log('[wait] Waiting 1.5s for port to be released...');
  setTimeout(() => {
    console.log('[wait] Done waiting, starting server...');
    process.exit(0); // Exit successfully so nodemon continues to the next command
  }, 1500);
});
