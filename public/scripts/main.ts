// public/scripts/main.ts
import { initializePageEventListeners } from './events.ts'; // Use .ts extension for Vite
import { initializeSocketHandlers } from './socketService.ts';
import { socket, socketReady } from './state.ts'; // Use shared socket

console.log('[Client] main.ts loaded successfully via Vite!');

// Wait for DOMContentLoaded first, then socketReady, then initializePageEventListeners

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Client] DOM fully loaded and parsed (from main.ts)');

  // On refresh or reconnect, always clear session and show lobby (future-proof for multiplayer)
  sessionStorage.removeItem('myId');
  sessionStorage.removeItem('currentRoom');

  await socketReady;
  // Attach socket event listeners after socket is ready
  socket.on('connect', () => {
    console.log('[Client] Socket.IO connected to backend via Vite proxy! Socket ID:', socket.id);
  });
  socket.on('connect_error', (err) => {
    console.error('[Client] Socket.IO connection error:', err.message, err.cause || '');
  });
  socket.on('disconnect', (reason) => {
    console.log('[Client] Socket.IO disconnected:', reason);
  });
  await initializePageEventListeners();
  initializeSocketHandlers();
});
