#!/usr/bin/env node
// scripts/smoke-socket-client.cjs
// This file should be run as CommonJS (.cjs) to allow require().
// Rename this file to smoke-socket-client.cjs for Node.js ESM compatibility.
// Minimal smoke test: connects to the server, joins a game, and starts a game.
require('ts-node/register/transpile-only');
const fs = require('fs');
const io = require('socket.io-client');
const {
  JOIN_GAME,
  JOINED,
  START_GAME,
  LOBBY_STATE_UPDATE,
  STATE_UPDATE,
  ERROR,
} = require('../src/shared/events.ts');

let port = '3000';
try {
  port = fs.readFileSync('current-port.txt', 'utf-8').trim();
} catch {
  console.warn('[SMOKE] Could not read current-port.txt, defaulting to 3000');
}
const SERVER_URL = `http://localhost:${port}`;
const socket = io(SERVER_URL, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('[SMOKE] Connected to server as', socket.id);
  // Attempt to join a game
  socket.emit(JOIN_GAME, { name: 'SmokeTest', numHumans: 1, numCPUs: 1 });
});

socket.on('connect_error', (err) => {
  console.error('[SMOKE] Connection error:', err);
  process.exit(2);
});

socket.on('error', (err) => {
  console.error('[SMOKE] Socket error:', err);
  process.exit(3);
});

socket.on(JOINED, (data) => {
  console.log('[SMOKE] Joined game:', data);
  // Start the game after joining
  socket.emit(START_GAME, { computerCount: 1 });
});

socket.on(LOBBY_STATE_UPDATE, (data) => {
  console.log('[SMOKE] Lobby state:', data);
});

socket.on(STATE_UPDATE, (data) => {
  console.log('[SMOKE] State update:', data);
  // Optionally disconnect after receiving first state update
  socket.disconnect();
});

socket.on('disconnect', () => {
  console.log('[SMOKE] Disconnected from server');
  process.exit(0);
});

socket.on(ERROR, (msg) => {
  console.error('[SMOKE] Server error:', msg);
  process.exit(1);
});
