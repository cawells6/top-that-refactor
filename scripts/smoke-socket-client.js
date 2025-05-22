#!/usr/bin/env node
// scripts/smoke-socket-client.cjs
// This file should be run as CommonJS (.cjs) to allow require().

/* global console */
// Rename this file to smoke-socket-client.cjs for Node.js ESM compatibility.
// Minimal smoke test: connects to the server, joins a game, and starts a game.
import fs from 'fs';
import process from 'process';
import { io } from 'socket.io-client';

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
  socket.emit('join-game', { name: 'SmokeTest', numHumans: 1, numCPUs: 1 });
});

socket.on('joined', (data) => {
  console.log('[SMOKE] Joined game:', data);
  // Start the game after joining
  socket.emit('start-game', { computerCount: 1 });
});

socket.on('lobby', (data) => {
  console.log('[SMOKE] Lobby state:', data);
});

socket.on('state-update', (data) => {
  console.log('[SMOKE] State update:', data);
  // Optionally disconnect after receiving first state update
  socket.disconnect();
});

socket.on('disconnect', () => {
  console.log('[SMOKE] Disconnected from server');
  if (typeof process !== 'undefined' && process.exit) {
    process.exit(0);
  }
});

socket.on('err', (msg) => {
  console.error('[SMOKE] Server error:', msg);
  process.exit(1);
});
