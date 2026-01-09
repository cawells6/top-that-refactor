// scripts/smoke-socket-client.ts
// Minimal smoke test: connects to the server, joins a game, and starts a game.
import * as io from 'socket.io-client';

import {
  JOIN_GAME,
  JOINED,
  START_GAME,
  LOBBY_STATE_UPDATE,
  STATE_UPDATE,
  ERROR,
} from '../src/shared/events.ts';

const SERVER_URL = 'http://localhost:3000'; // Change if your server is running on a different port
const socket = io.default(SERVER_URL, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('[SMOKE] Connected to server as', socket.id);
  // Attempt to join a game
  socket.emit(JOIN_GAME, { name: 'SmokeTest', numHumans: 1, numCPUs: 1 });
});

socket.on(JOINED, (data: any) => {
  console.log('[SMOKE] Joined game:', data);
  // Start the game after joining
  socket.emit(START_GAME, { computerCount: 1 });
});

socket.on(LOBBY_STATE_UPDATE, (data: any) => {
  console.log('[SMOKE] Lobby state:', data);
});

socket.on(STATE_UPDATE, (data: any) => {
  console.log('[SMOKE] State update:', data);
  // Optionally disconnect after receiving first state update
  socket.disconnect();
});

socket.on('disconnect', () => {
  console.log('[SMOKE] Disconnected from server');
  process.exit(0);
});

socket.on(ERROR, (msg: any) => {
  console.error('[SMOKE] Server error:', msg);
  process.exit(1);
});
