// scripts/force-dev-start.js
import { exec, spawn } from 'child_process';
import os from 'os';

const PORT = process.env.PORT || 3000;

function killProcessByPort(port, callback) {
    const platform = os.platform();
    let findPidsCommand = '';
    let killCommandPrefix = '';

    if (platform === 'win32') {
        findPidsCommand = `netstat -aon | findstr ":${port}"`;
    } else if (platform === 'darwin' || platform === 'linux') {
        findPidsCommand = `lsof -ti :${port}`;
        killCommandPrefix = 'kill -9 ';
    } else {
        console.error(`[force-dev-start] Unsupported platform: ${platform}`);
        if (typeof callback === 'function') callback();
        return;
    }

    exec(findPidsCommand, (err, stdout, stderr) => {
        if (err && platform !== 'win32') {
            console.log(`[force-dev-start] Port ${port} appears to be free or 'lsof' encountered an issue (err: ${err.message.trim()}).`);
            if (typeof callback === 'function') callback();
            return;
        }
        if (!stdout.trim() && stderr.trim() && platform !== 'win32') {
            console.log(`[force-dev-start] Port ${port} appears to be free (lsof stderr: ${stderr.trim()}).`);
            if (typeof callback === 'function') callback();
            return;
        }
        if (err && platform === 'win32' && !stderr) {
            console.error(`[force-dev-start] Error finding PIDs on Windows: ${err.message.trim()}`);
            if (typeof callback === 'function') callback();
            return;
        }

        const pids = [];
        if (platform === 'win32') {
            stdout.split(os.EOL).forEach(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 4 && parts[1] && parts[1].endsWith(`:${port}`)) {
                    const pid = parts[parts.length - 1];
                    if (pid && /^\d+$/.test(pid) && parseInt(pid, 10) > 0) {
                        pids.push(pid);
                    }
                }
            });
        } else {
            stdout.split(os.EOL).forEach(pidStr => {
                const pid = pidStr.trim();
                if (pid && /^\d+$/.test(pid)) {
                    pids.push(pid);
                }
            });
        }

        if (pids.length === 0) {
            console.log(`[force-dev-start] No process found on port ${port}.`);
            if (typeof callback === 'function') callback();
            return;
        }

        const uniquePids = [...new Set(pids)];
        console.log(`[force-dev-start] Attempting to kill processes on port ${port}: ${uniquePids.join(', ')}`);
        let processedCount = 0;

        if (uniquePids.length === 0) {
            if (typeof callback === 'function') callback();
            return;
        }

        uniquePids.forEach(pid => {
            const killCmd = platform === 'win32' ? `taskkill /PID ${pid} /F` : `${killCommandPrefix}${pid}`;
            exec(killCmd, (killErr, killStdout, killStderr) => {
                processedCount++;
                if (killErr) {
                    console.error(`[force-dev-start] Failed to kill process ${pid}: ${killErr.message.trim()}`);
                    if (killStderr) console.error(`[force-dev-start] Stderr from kill ${pid}: ${killStderr.trim()}`);
                } else {
                    console.log(`[force-dev-start] Successfully sent kill signal to process ${pid}.`);
                    if (killStdout) console.log(`[force-dev-start] Stdout from kill ${pid}: ${killStdout.trim()}`);
                }
                if (processedCount === uniquePids.length) {
                    if (typeof callback === 'function') callback();
                }
            });
        });
    });
}

killProcessByPort(PORT, () => {
    console.log('[force-dev-start] Proceeding to start dev server after attempting to free port...');
    setTimeout(() => {
        const devServerArgs = ['--delay', '1.5', 'server.js'];
        const nodemonCmd = os.platform() === 'win32' ? 'nodemon.cmd' : 'nodemon';
        console.log(`[force-dev-start] Executing: ${nodemonCmd} ${devServerArgs.join(' ')}`);
        const devServer = spawn(nodemonCmd, devServerArgs, { stdio: 'inherit', shell: os.platform() === 'win32' });
        devServer.on('error', (err) => {
            console.error(`[force-dev-start] Failed to start nodemon: ${err.message}`);
            console.error("[force-dev-start] Ensure nodemon is installed globally ('npm install -g nodemon') or as a devDependency.");
        });
        devServer.on('close', (code) => {
            console.log(`[force-dev-start] Dev server process exited with code ${code}`);
        });
    }, 2000);
});
