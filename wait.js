// wait.js - Helper to kill Node.js processes on a specific port and wait before server restart
import { exec } from 'child_process';

const PORT_TO_KILL = 3000;
const IS_WINDOWS = process.platform === 'win32';

console.log(
  `[wait] Starting script to kill Node.js processes on port ${PORT_TO_KILL} (OS: ${process.platform}).`
);

function killProcessesOnPort(port, callback) {
  if (IS_WINDOWS) {
    const netstatCmd = `netstat -aon | findstr ":${port}"`;
    console.log(`[wait] Executing: ${netstatCmd}`);
    exec(netstatCmd, (netstatErr, netstatStdout, netstatStderr) => {
      if (netstatErr && !netstatStdout.trim()) {
        console.log(
          `[wait] No processes found on port ${port} or netstat error: ${netstatErr.message.trim()}`
        );
        return callback();
      }
      if (netstatStderr.trim() && !netstatStdout.trim()) {
        console.log(
          `[wait] Netstat stderr (port likely free or non-critical error): ${netstatStderr.trim()}`
        );
        // Continue if stdout might still have relevant PIDs
      }

      const lines = netstatStdout.trim().split('\\n');
      const pidsToVerify = [];
      lines.forEach((line) => {
        const parts = line.trim().split(/\\s+/);
        if (
          parts.length >= 4 &&
          parts[0].toUpperCase() === 'TCP' &&
          parts[1] &&
          parts[1].endsWith(`:${port}`)
        ) {
          const pid = parts[parts.length - 1];
          if (pid && /^\\d+$/.test(pid) && parseInt(pid, 10) > 0) {
            pidsToVerify.push(pid);
          }
        }
      });

      const uniquePids = [...new Set(pidsToVerify)];
      if (uniquePids.length === 0) {
        console.log(
          `[wait] No PIDs found listening on port ${port} after parsing netstat output.`
        );
        return callback();
      }

      console.log(
        `[wait] Found PIDs on port ${port}: ${uniquePids.join(
          ', '
        )}. Verifying if they are node.exe...`
      );
      let processedCount = 0;
      let nodePidsKilled = 0;

      if (uniquePids.length === 0) { // Should be redundant due to check above, but safe
        console.log(`[wait] No unique PIDs to process for port ${port}.`);
        return callback();
      }

      uniquePids.forEach((pid) => {
        const tasklistCmd = `tasklist /FI "PID eq ${pid}" /FI "IMAGENAME eq node.exe" /NH`;
        console.log(`[wait] Executing: ${tasklistCmd} for PID ${pid}`);
        exec(tasklistCmd, (tasklistErr, tasklistStdout) => {
          processedCount++;
          if (tasklistErr || !tasklistStdout.trim()) {
            console.log(
              `[wait] PID ${pid} is not a node.exe process or tasklist error. Skipping.`
            );
          } else {
            console.log(
              `[wait] PID ${pid} is a node.exe process. Attempting to kill...`
            );
            const taskkillCmd = `taskkill /F /PID ${pid}`;
            console.log(`[wait] Executing: ${taskkillCmd}`);
            exec(taskkillCmd, (killErr, killStdout) => {
              if (killErr) {
                console.error(
                  `[wait] Failed to kill PID ${pid}: ${killErr.message.trim()}`
                );
              } else {
                nodePidsKilled++;
                console.log(
                  `[wait] Successfully killed PID ${pid}. Output: ${killStdout.trim()}`
                );
              }
              // Check if all PIDs have been processed before calling back
              if (processedCount === uniquePids.length) {
                console.log(
                  `[wait] Finished processing all PIDs. ${nodePidsKilled} node.exe process(es) killed.`
                );
                callback();
              }
            });
            return; // Return here to prevent callback from tasklist exec if node process is found and kill is attempted
          }

          // Check if all PIDs have been processed before calling back (if this PID was not node.exe)
          if (processedCount === uniquePids.length) {
            console.log(
              `[wait] Finished processing all PIDs. ${nodePidsKilled} node.exe process(es) killed.`
            );
            callback();
          }
        });
      });
    });
  } else {
    // macOS / Linux
    const killCommand = \`lsof -i tcp:${port} -sTCP:LISTEN | grep node | awk '{print $2}' | xargs -r kill -9\`;
    console.log(`[wait] Executing: ${killCommand}`);
    exec(killCommand, (err, stdout, stderr) => {
      if (
        err &&
        !stderr.includes('No such process') &&
        !stdout.includes('killed')
      ) {
        console.log(
          \`[wait] Error or no Node.js processes to kill on port ${port} (unix): ${err.message.trim()}\`
        );
      } else {
        if (stdout.trim()) {
          console.log(\`[wait] Kill stdout (unix): ${stdout.trim()}\`);
        }
        if (stderr.trim() && !stderr.includes('No such process')) {
          console.log(\`[wait] Kill stderr (unix): ${stderr.trim()}\`);
        }
        console.log(
          \`[wait] Kill command executed for Node.js processes on port ${port} (unix).\`
        );
      }
      callback();
    });
  }
}

killProcessesOnPort(PORT_TO_KILL, () => {
  console.log(
    \`[wait] Finished attempt to kill Node.js processes on port ${PORT_TO_KILL}.\`
  );
  console.log('[wait] Waiting 1.5s for port to be fully released...');
  setTimeout(() => {
    console.log('[wait] Done waiting. Exiting wait script.');
    process.exit(0);
  }, 1500);
});
