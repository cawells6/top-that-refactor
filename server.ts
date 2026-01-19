import * as fs from 'fs';
import * as http from 'http';
import { Socket } from 'net';
import * as os from 'os';
import { fileURLToPath, pathToFileURL } from 'url';

import express, { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';

import { GameRoomManager } from './controllers/GameController.js';
import { setSeed } from './utils/rng.js';

const app: Express = express();

// In production, serve the built client files from dist/client
// In development, serve from public
const clientPath =
  process.env.NODE_ENV === 'production' ? 'dist/client' : 'public';
console.log(`[SERVER] Serving client files from: ${clientPath}`);
console.log(`[SERVER] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);

// Configure MIME types for TypeScript files (dev only)
if (process.env.NODE_ENV !== 'production') {
  express.static.mime.define({ 'application/javascript': ['ts'] });
}

// Serve your client files
app.use(express.static(clientPath));
// Also serve the src directory for shared modules
app.use('/src', express.static('src'));
console.log(`[SERVER] Static routes configured`);

app.use(express.json()); // Ensure JSON parsing is enabled

app.post('/api/feedback', (req, res) => {
  const { type, message } = req.body;
  console.log(`[FEEDBACK] Type: ${type}, Message: ${message}`);
  // TODO: Add Discord Webhook call here in future
  res.json({ success: true });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

const DEFAULT_PORT: number = 3000;
const MAX_RETRIES = 30; // Increased from 10 for more robust port selection

if (process.env.SEED) {
  setSeed(process.env.SEED);
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
const sockets = new Set<Socket>();

let server: http.Server | null = null; // Define server variable here
let io: SocketIOServer | null = null;
let gameRoomManager: GameRoomManager | null = null;

export function startServer(port: number, retries = 0): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    // Create a single HTTP server and assign to the outer server variable
    server = http.createServer(app);
    server.on('connection', (socket: Socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });
    // Attach Socket.IO to the same HTTP server
    io = new SocketIOServer(server, {
      cors: { origin: '*' },
    });

    // Attach GameRoomManager to handle game events
    gameRoomManager = new GameRoomManager(io);

    io.on('connection', (socket) => {
      console.log(`[SERVER] New socket connection: ${socket.id}`);

      // Log all registered event listeners for debugging
      // Filter out the word 'error' so logs stay clean
      const events = socket.eventNames().filter((e) => e !== 'error');
      console.log(`[SERVER] Socket ${socket.id} events:`, events);

      socket.on('disconnect', (reason) => {
        console.log(`[SERVER] Socket ${socket.id} disconnected: ${reason}`);
      });
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && retries < MAX_RETRIES) {
        const nextPort = port + 1;
        console.log(`Port ${port} in use, trying next port: ${nextPort}`);
        setTimeout(() => {
          startServer(nextPort, retries + 1)
            .then(resolve)
            .catch(reject);
        }, 100);
      } else {
        console.error('Server failed to start:', err);
        // Only exit process if not running in test mode (or allow rejection)
        // For CLI usage, we want to exit. For test usage, maybe just reject.
        // We can detect if we are resolving a promise or just running.
        // But here we are in the promise.
        reject(err);
      }
    });

    // Log every port attempt
    const logMsg = `Attempting to start server on port ${port}...`;
    // Print a clear separator for visibility
    console.log('\n==============================');
    console.log(logMsg);
    console.log('==============================\n');
    try {
      fs.appendFileSync('server.log', logMsg + '\n', 'utf-8');
    } catch {
      // ignore
    }

    server.listen(port, '0.0.0.0', () => {
      const networkInterfaces = os.networkInterfaces();
      const localIps = Object.values(networkInterfaces)
        .flat()
        .filter((iface: any) => iface?.family === 'IPv4' && !iface?.internal)
        .map((iface: any) => iface?.address);

      const successMsg = `🃏 Top That! server running at:
  - Local:   http://localhost:${port}
  - Network: ${localIps.map((ip: string) => `http://${ip}:${port}`).join(', ')}`;
      // Print a clear separator for visibility
      console.log('\n==============================');
      console.log(successMsg);
      console.log('==============================\n');
      try {
        fs.appendFileSync('server.log', successMsg + '\n', 'utf-8');
      } catch {
        // ignore
      }

      if (process.env.NODE_ENV !== 'production') {
        try {
          // Dev-only: help the Vite client discover which backend port we bound to.
          fs.writeFileSync('current-port.txt', port.toString(), 'utf-8');
          if (fs.existsSync(clientPath)) {
            fs.writeFileSync(
              `${clientPath}/current-port.txt`,
              port.toString(),
              'utf-8'
            );
          }
        } catch (error) {
          console.warn(
            `Failed to write current-port.txt (${(error as Error).message}). Continuing without it.`
          );
        }
      }
      resolve(server as http.Server);
    });
  });
}

export function closeServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('\nClosing server...');
    // Destroy all active sockets
    for (const socket of sockets) {
      socket.destroy();
    }
    sockets.clear();

    if (gameRoomManager) {
      gameRoomManager.destroy();
      gameRoomManager = null;
    }

    if (io) {
      io.close();
      io = null;
    }

    if (server) {
      server.close((err) => {
        if (err) {
          console.error('Error closing server:', err);
          return reject(err);
        }
        console.log('HTTP server closed.');
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// If Render (or other runtimes) execute `server.ts` directly, start the server.
// (The usual local entrypoint is `start-server.ts`, but Render may run `server.ts`.)
const serverModulePath = fileURLToPath(import.meta.url).replace(/\\/g, '/');
const argv = process.argv.map((v) => (v ?? '').replace(/\\/g, '/'));

const isExecutedDirectly =
  (process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href) ||
  argv.some((arg) => arg === serverModulePath || arg.endsWith('/server.ts') || arg.endsWith('/server.js'));

const isRenderRuntime =
  Boolean(process.env.RENDER) ||
  Boolean(process.env.RENDER_SERVICE_ID) ||
  Boolean(process.env.RENDER_EXTERNAL_URL);

const isProductionRuntime = process.env.NODE_ENV === 'production';
const autoStartDisabled = Boolean(process.env.DISABLE_AUTOSTART);

// On Render, `NODE_ENV=production` is set and the server is expected to start immediately.
// We keep an escape hatch for tests/tools via `DISABLE_AUTOSTART=1`.
if ((isExecutedDirectly || isRenderRuntime || isProductionRuntime) && !autoStartDisabled) {
  console.log(
    `[SERVER] Auto-start enabled (direct=${isExecutedDirectly}, render=${isRenderRuntime}, prod=${isProductionRuntime})`
  );
  startServer(PORT).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGUSR2'];
  signals.forEach((signal) => {
    process.on(signal, () => {
      console.log(`\n${signal} signal received...`);
      closeServer()
        .then(() => {
          if (signal === 'SIGUSR2') {
            process.kill(process.pid, 'SIGUSR2');
          } else {
            process.exit(0);
          }
          return undefined;
        })
        .catch((closeErr) => {
          console.error('Error during shutdown:', closeErr);
          process.exit(1);
        });
    });
  });
}
