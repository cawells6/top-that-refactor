// public/scripts/main.ts
import { initializePageEventListeners } from './events.js';
import { initializeSocketHandlers } from './socketService.js';
import { socket } from './state.js'; // Use shared socket

console.log('[Client] main.ts loaded successfully via Vite!');

// Shared socket from state handles connection

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
  initializeSocketHandlers();
});
