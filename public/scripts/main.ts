// public/scripts/main.ts
import { JOIN_GAME } from '@shared/events.ts';

import { InSessionLobbyModal } from './components/InSessionLobbyModal.js';
import { initializePageEventListeners } from './events.js';
import { initializeSocketHandlers } from './socketService.js';
import { socket, socketReady, setCurrentRoom } from './state.js';

console.log('🚀 [Client] main.ts loaded successfully via Vite!');

// Wait for DOMContentLoaded first, then socketReady, then initializePageEventListeners

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('main-content')?.classList.remove('preload-hidden');
  // console.log('🚀 [Client] DOM fully loaded and parsed (from main.ts)');

  // Do NOT clear session on page load! Only clear on explicit user action.
  // sessionStorage.removeItem('myId');
  // sessionStorage.removeItem('currentRoom');
  // sessionStorage.removeItem('desiredCpuCount');

  try {
    // Instantiate the in-session lobby modal so it can listen for events
    new InSessionLobbyModal();

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

    // Add handler for legacy 'lobby' event from server
    socket.on('lobby', (data) => {
      console.log('[Client] Received LOBBY event:', data);
      // Only show the in-session lobby modal, do not call showWaitingState
      const inSessionModal = document.getElementById('in-session-lobby-modal');
      const waitingStateDiv = document.getElementById('waiting-state');
      if (inSessionModal) {
        inSessionModal.classList.remove('modal--hidden');
      }
      if (waitingStateDiv) {
        waitingStateDiv.classList.add('hidden');
      }
      // Optionally, hide the main lobby container
      const lobbyContainer = document.getElementById('lobby-container');
      if (lobbyContainer) {
        lobbyContainer.classList.add('hidden');
      }
    });

    await initializePageEventListeners();
    // console.log('🚀 [Client] initializePageEventListeners completed');

    initializeSocketHandlers();
    // console.log('🚀 [Client] All initialization completed');
  } catch (error) {
    console.error('Error during initialization:', error);
  }

  // Helper to remove inline styles from player icons
  function removePlayerIconInlineStyles() {
    const icons = document.querySelectorAll(
      '.player-silhouette img, .player-silhouette .user-icon, .player-silhouette .robot-icon'
    );
    icons.forEach((img) => {
      (img as HTMLElement).removeAttribute('style');
      (img as HTMLElement).removeAttribute('width');
      (img as HTMLElement).removeAttribute('height');
    });
  }

  // Call once after initial render
  removePlayerIconInlineStyles();

  // Set up a MutationObserver on the whole body to catch any icon changes
  const observer = new MutationObserver((_mutations) => {
    removePlayerIconInlineStyles();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'width', 'height'], // Watch all relevant attributes
  });

  // Optionally, call after any known UI update (if you know where icons are rendered)
  // removePlayerIconInlineStyles();

  // === Unhide lobby and remove loading class ===
  document.body.classList.remove('body-loading');
  document.body.classList.add('showing-lobby'); // Add initial state class
  const lobbyContainer = document.getElementById('lobby-container');
  if (lobbyContainer) {
    lobbyContainer.classList.remove('hidden');
  }
  console.log('🚀 [Client] Lobby explicitly made visible.');

  // --- START: New logic for handling join links ---
  const urlParams = new URLSearchParams(window.location.search);
  const roomIdFromUrl = urlParams.get('room');

  // Only run join link logic if NOT in-session
  const inSession = document.body.classList.contains('in-session');
  if (roomIdFromUrl && !inSession) {
    setCurrentRoom(roomIdFromUrl);
    socket.emit(JOIN_GAME, { id: roomIdFromUrl });
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  // --- END: New logic for handling join links ---
});
