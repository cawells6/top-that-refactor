// server.js (ES module format)

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import GameController from './controllers/GameController.js';

// >>> Add this line right after the import <<<
console.log('Type of GameController after import:', typeof GameController);
console.log('Value of GameController after import:', GameController);
// >>> End of added lines <<<


const app = express();
const server = http.createServer(app);
const io = new Server(server);

// >>> Add this error handling BEFORE server.listen <<<
server.on('error', (err) => {
  console.error('HTTP server failed to start:', err);
  // You might want to add process.exit(1) here in production,
  // but for debugging, just logging is fine initially.
});
// >>> End of added error handling <<<


const PORT = process.env.PORT || 3000;

// Serve static files (client-side) from /public
app.use(express.static('public'));

// Initialize game controller
const game = new GameController(io); // This line and above now work
game.setupRoom('top-that');

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[CONNECTED] ${socket.id}`);

  socket.on('join', (name) => {
    game.handleJoin(socket, name);
  });

  socket.on('start', () => {
    game.startGame();
  });

  socket.on('play', (indexes) => {
    game.handlePlay(socket, indexes);
  });

  socket.on('disconnect', () => {
    console.log(`[DISCONNECTED] ${socket.id}`);
    game.handleDisconnect(socket);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`🃏 Top That server running at http://localhost:${PORT}`);
});