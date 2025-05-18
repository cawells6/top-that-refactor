import express, { Express, Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import GameController from './controllers/GameController.js';

const app: Express = express();
const server: http.Server = http.createServer(app);

// Allow any origin for dev; lock down in production
const io: SocketIOServer = new SocketIOServer(server, { cors: { origin: '*' } });

// Serve your client files from /public
app.use(express.static('public'));

// Also serve the src directory for shared modules
app.use('/src', express.static('src'));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Instantiate your game controller (it wires up all socket events)
new GameController(io);

// Start listening
const PORT: number = 3000;
server.listen(PORT, () => {
  console.log(`🃏 Top That! server running at http://localhost:${PORT}`);
});

// Optional HTTP error handling
server.on('error', async (err: NodeJS.ErrnoException) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`\nERROR: Port ${PORT} is already in use.`);
    console.error(`Please close the application using port ${PORT} or use a different port.`);
    console.error(`To find the process using port ${PORT} on Windows, you can use:`);
    console.error(`  netstat -ano | findstr ":${PORT}"`);
    console.error(`Then, to kill it (replace <PID> with the actual Process ID):`);
    console.error(`  taskkill /PID <PID> /F /T\n`); // Note: /T is for terminating child processes too
    process.exit(1);
  } else {
    console.error('Server failed to start:', err);
    process.exit(1); // Also exit on other critical startup errors
  }
});