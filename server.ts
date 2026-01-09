import * as fs from 'fs';
import * as http from 'http';
import { Socket } from 'net';
import * as os from 'os';

import express, { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';

import { GameRoomManager } from './controllers/GameController.js';

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
// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

const DEFAULT_PORT: number = 3000;
const MAX_RETRIES = 30; // Increased from 10 for more robust port selection

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
const sockets = new Set<Socket>();

let server: http.Server | null = null; // Define server variable here

function startServer(port: number, retries = 0) {
  // Create a single HTTP server and assign to the outer server variable
  server = http.createServer(app);
  server.on('connection', (socket: Socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  // Attach Socket.IO to the same HTTP server
  const io: SocketIOServer = new SocketIOServer(server, {
    cors: { origin: '*' },
  });

  // Attach GameRoomManager to handle game events
  new GameRoomManager(io);

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
      setTimeout(() => startServer(nextPort, retries + 1), 100);
    } else {
      console.error('Server failed to start:', err);
      process.exit(1);
    }
  });

  // Log every port attempt
  const logMsg = `Attempting to start server on port ${port}...`;
  // Print a clear separator for visibility
  console.log('\n==============================');
  console.log(logMsg);
  console.log('==============================\n');
  fs.appendFileSync('server.log', logMsg + '\n', 'utf-8');
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
    fs.appendFileSync('server.log', successMsg + '\n', 'utf-8');
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
  });
}

startServer(PORT);

// Graceful shutdown logic
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGUSR2'];
signals.forEach((signal) => {
  process.on(signal, () => {
    console.log(`\n${signal} signal received: closing HTTP server...`);
    for (const socket of sockets) {
      socket.destroy();
      sockets.delete(socket);
    }
    if (server) {
      server.close((err) => {
        if (err) {
          console.error('Error closing server:', err);
          process.exit(1); // Exit with error
        }
        console.log('HTTP server closed.');
        if (signal === 'SIGUSR2') {
          // Nodemon expects the process to exit and will restart it
          process.kill(process.pid, 'SIGUSR2');
        } else {
          process.exit(0); // Exit gracefully
        }
      });
    } else {
      console.log('HTTP server not initialized or already closed.');
      if (signal === 'SIGUSR2') {
        process.kill(process.pid, 'SIGUSR2');
      } else {
        process.exit(0);
      }
    }
  });
});

// Test: innocuous change to trigger Nodemon restart (updated)
