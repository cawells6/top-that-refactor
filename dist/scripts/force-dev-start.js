// scripts/force-dev-start.js
import { exec, spawn } from 'child_process';
import os from 'os';
const PORT = parseInt(process.env.PORT || '3000', 10);
// ADDED TYPES HERE
function killProcessByPort(port, callback) {
    const platform = os.platform(); // Keep NodeJS.Platform
    let findPidsCommand = '';
    console.log(`[force-dev-start] Attempting to free port ${port} on platform ${platform}...`);
    if (platform === 'win32') {
        findPidsCommand = `netstat -aon | findstr ":${port}"`;
    }
    else if (platform === 'darwin' || platform === 'linux') {
        findPidsCommand = `lsof -ti tcp:${port} -sTCP:LISTEN`;
    }
    else {
        console.error(`[force-dev-start] Unsupported platform: ${platform}. Skipping port kill.`);
        if (typeof callback === 'function')
            callback();
        return;
    }
    exec(findPidsCommand, (err, stdout, stderr) => {
        if (err && platform !== 'win32') {
            console.log(`[force-dev-start] Port ${port} appears to be free or 'lsof' error (err: ${err.message.trim()}).`);
            if (typeof callback === 'function')
                callback();
            return;
        }
        if (stderr && platform !== 'win32' && !stdout.trim()) {
            console.log(`[force-dev-start] 'lsof' stderr (port likely free): ${stderr.trim()}`);
        }
        const pidsToKill = []; // This is already correctly typed in your uploaded file
        const lines = stdout
            .trim()
            .split(os.EOL)
            .filter((line) => line.trim() !== '');
        if (lines.length === 0) {
            console.log(`[force-dev-start] No active processes found on port ${port}.`);
            if (typeof callback === 'function')
                callback();
            return;
        }
        if (platform === 'win32') {
            const winPids = []; // Correctly typed
            lines.forEach((line) => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 4 &&
                    parts[0].toUpperCase() === 'TCP' &&
                    parts[1] &&
                    parts[1].endsWith(`:${port}`) &&
                    parts[3] === 'LISTENING') {
                    const pid = parts[parts.length - 1];
                    if (pid && /^\d+$/.test(pid) && parseInt(pid, 10) > 0) {
                        winPids.push(pid);
                    }
                }
            });
            pidsToKill.push(...new Set(winPids));
        }
        else {
            // macOS / Linux
            lines.forEach((pidStr) => {
                // pidStr is inferred as string from string[]
                const pid = pidStr.trim();
                if (pid && /^\d+$/.test(pid)) {
                    pidsToKill.push(pid);
                }
            });
        }
        const uniquePids = [...new Set(pidsToKill)]; // Correctly typed as string[]
        if (uniquePids.length === 0) {
            console.log(`[force-dev-start] No specific processes found to kill on port ${port} after filtering.`);
            if (typeof callback === 'function')
                callback();
            return;
        }
        console.log(`[force-dev-start] Attempting to kill processes on port ${port}: ${uniquePids.join(', ')}`);
        let processedCount = 0;
        let allKilledSuccessfully = true;
        uniquePids.forEach((pid) => {
            const killCmd = platform === 'win32' ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`;
            exec(killCmd, (killErr, killStdout, killStderr) => {
                processedCount++;
                if (killErr) {
                    allKilledSuccessfully = false;
                    console.error(`[force-dev-start] Failed to kill process ${pid}: ${killErr.message.trim()}`);
                    if (killStderr)
                        console.error(`[force-dev-start] Stderr from kill ${pid}: ${killStderr.trim()}`);
                }
                else {
                    console.log(`[force-dev-start] Successfully sent kill signal to process ${pid}.`);
                    if (killStdout)
                        console.log(`[force-dev-start] Stdout from kill ${pid}: ${killStdout.trim()}`);
                }
                if (processedCount === uniquePids.length) {
                    if (allKilledSuccessfully)
                        console.log(`[force-dev-start] All targeted processes on port ${port} have been processed.`);
                    else
                        console.warn(`[force-dev-start] Some processes on port ${port} might not have been killed.`);
                    if (typeof callback === 'function')
                        callback();
                }
            });
        });
    });
}
killProcessByPort(PORT, () => {
    console.log('[force-dev-start] Proceeding to start dev server...');
    setTimeout(() => {
        const nodemonPreamble = 'npx';
        const nodemonCmd = 'nodemon';
        const nodemonArgs = [
            nodemonCmd,
            '--watch',
            'server.js',
            '--watch',
            'controllers/**/*.js',
            '--watch',
            'models/**/*.js',
            '--watch',
            'src/**/*.js',
            '--watch',
            'routes/**/*.js',
            '--watch',
            'config/**/*.js',
            '--watch',
            'package.json',
            '--watch',
            'tsconfig.json',
            '--ext',
            'ts,js,json',
            '--exec',
            'node --loader ts-node/esm ./server.js',
        ];
        console.log(`[force-dev-start] Starting nodemon with command: ${nodemonPreamble} ${nodemonArgs.join(' ')}`);
        const nodemonProcess = spawn(nodemonPreamble, nodemonArgs, {
            stdio: 'inherit',
            shell: true,
            env: {
                ...process.env,
                NODE_ENV: 'development',
            },
        });
        nodemonProcess.on('error', (err) => {
            console.error(`[force-dev-start] Failed to start nodemon process: ${err.message}`);
            console.error('[force-dev-start] Ensure nodemon and ts-node are installed correctly and in PATH or node_modules/.bin.');
        });
        nodemonProcess.on('close', (code) => {
            console.log(`[force-dev-start] Dev server process exited with code ${code === null ? 'null' : code}`);
        });
    }, 2500);
});
