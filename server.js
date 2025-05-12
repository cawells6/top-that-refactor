// server.js (ES module format)

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import GameController from './controllers/GameController.js';

const app = express();
const server = http.createServer(app);

// Allow any origin for dev; lock down in production
const io = new Server(server, { cors: { origin: '*' } });

// Serve your client files from /public
app.use(express.static('public'));

// Also serve the src directory for shared modules
app.use('/src', express.static('src'));

// Rooms are auto‑created by socket.join(roomId) in GameController
// No explicit setupRoom call required.

// Instantiate your game controller (it wires up all socket events)
new GameController(io);

// Start listening
const PORT = 3002; // Hard-code port to avoid conflicts
server.listen(PORT, () => {
  console.log(`🃏 Top That! server running at http://localhost:${PORT}`);
});

// Optional HTTP error handling
server.on('error', err => {
  console.error('Server failed to start:', err);
});
