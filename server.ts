import fs from 'fs';
import http from 'http';

import express, { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';

import GameController from './controllers/GameController.js';

const app: Express = express();

// Serve your client files from /public
app.use(express.static('public'));
// Also serve the src directory for shared modules
app.use('/src', express.static('src'));
// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

const DEFAULT_PORT: number = 3000;
const MAX_RETRIES = 10;

function startServer(port: number, retries = 0) {
  // Create a single HTTP server
  const server = http.createServer(app);
  // Attach Socket.IO to the same HTTP server
  const io: SocketIOServer = new SocketIOServer(server, { cors: { origin: '*' } });
  // Instantiate your game controller (it wires up all socket events)
  new GameController(io);

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

  server.listen(port, () => {
    console.log(`🃏 Top That! server running at http://localhost:${port}`);
    fs.writeFileSync('current-port.txt', port.toString(), 'utf-8');
  });
}

startServer(DEFAULT_PORT);
