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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Rooms are auto‑created by socket.join(roomId) in GameController
// No explicit setupRoom call required.

// Instantiate your game controller (it wires up all socket events)
new GameController(io);

// Start listening
const PORT = 3000; // Changed port from 3002 to 3000
server.listen(PORT, () => {
  console.log(`🃏 Top That! server running at http://localhost:${PORT}`);
});

// Optional HTTP error handling
server.on('error', err => {
  if (err && err['code'] === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Waiting for it to be released before restarting...`);
    setTimeout(() => process.exit(1), 1500); // Wait 1.5s before exit so nodemon can restart
  } else {
    console.error('Server failed to start:', err);
  }
});
