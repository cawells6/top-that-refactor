// public/scripts/main.ts
import io from 'socket.io-client';
import { initializePageEventListeners } from './events.js'; // Use .js extension

console.log('[Client] main.ts loaded successfully via Vite!');

// Attempt to connect to the server (Vite will proxy /socket.io to http://localhost:3000)
const socket = io();

socket.on('connect', () => {
  console.log('[Client] Socket.IO connected to backend via Vite proxy! Socket ID:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('[Client] Socket.IO connection error:', err.message, err.cause || '');
});

socket.on('disconnect', (reason) => {
  console.log('[Client] Socket.IO disconnected:', reason);
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Client] DOM fully loaded and parsed (from main.ts)');
  initializePageEventListeners();
});
