// public/scripts/main.ts
import { initializePageEventListeners } from './events.js';
import { initializeSocketHandlers } from './socketService.js';
import { socket, socketReady } from './state.js';

console.log('🚀 [Client] main.ts loaded successfully via Vite!');

// Wait for DOMContentLoaded first, then socketReady, then initializePageEventListeners

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 [Client] DOM fully loaded and parsed (from main.ts)');

  // Clear session on page load
  sessionStorage.removeItem('myId');
  sessionStorage.removeItem('currentRoom');

  try {
    await socketReady;

    // Attach socket event listeners after socket is ready
    socket.on('connect', () => {
      console.log('[Client] Socket.IO connected to backend! Socket ID:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('[Client] Socket.IO connection error:', err.message, err.cause || '');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Client] Socket.IO disconnected:', reason);
    });

    await initializePageEventListeners();
    console.log('🚀 [Client] initializePageEventListeners completed');

    initializeSocketHandlers();
    console.log('🚀 [Client] All initialization completed');
  } catch (error) {
    console.error('Error during initialization:', error);
  }
});
