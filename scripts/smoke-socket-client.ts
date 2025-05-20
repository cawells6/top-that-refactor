// scripts/smoke-socket-client.ts
// Minimal smoke test: connects to the server, joins a game, and starts a game.
import * as io from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000'; // Change if your server is running on a different port
const socket = io.default(SERVER_URL, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('[SMOKE] Connected to server as', socket.id);
  // Attempt to join a game
  socket.emit('join-game', { name: 'SmokeTest', numHumans: 1, numCPUs: 1 });
});

socket.on('joined', (data: any) => {
  console.log('[SMOKE] Joined game:', data);
  // Start the game after joining
  socket.emit('start-game', { computerCount: 1 });
});

socket.on('lobby', (data: any) => {
  console.log('[SMOKE] Lobby state:', data);
});

socket.on('state-update', (data: any) => {
  console.log('[SMOKE] State update:', data);
  // Optionally disconnect after receiving first state update
  socket.disconnect();
});

socket.on('disconnect', () => {
  console.log('[SMOKE] Disconnected from server');
  process.exit(0);
});

socket.on('err', (msg: any) => {
  console.error('[SMOKE] Server error:', msg);
  process.exit(1);
});
