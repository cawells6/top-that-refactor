// public/scripts/main.ts
import { InSessionLobbyModal } from './components/InSessionLobbyModal.js';
import { initializePageEventListeners } from './events.js';
import { initializeSocketHandlers } from './socketService.js';
import { socket, socketReady } from './state.js';

console.log('🚀 [Client] main.ts loaded successfully via Vite!');

// Wait for DOMContentLoaded first, then socketReady, then initializePageEventListeners

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('main-content')?.classList.remove('preload-hidden');
  console.log('🚀 [Client] DOM fully loaded and parsed (from main.ts)');

  // Do NOT clear session on page load! Only clear on explicit user action.
  // sessionStorage.removeItem('myId');
  // sessionStorage.removeItem('currentRoom');
  // sessionStorage.removeItem('desiredCpuCount');

  const params = new URLSearchParams(window.location.search);
  const roomFromLink = params.get('room');
  if (roomFromLink) {
    sessionStorage.setItem('currentRoom', roomFromLink);
  }

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
    new InSessionLobbyModal();
    console.log('🚀 [Client] All initialization completed');
  } catch (error) {
    console.error('Error during initialization:', error);
  }

  // Helper to remove inline styles from player icons
  function removePlayerIconInlineStyles() {
    const icons = document.querySelectorAll(
      '.player-silhouette img, .player-silhouette .user-icon, .player-silhouette .robot-icon'
    );
    console.debug('[Silhouette] Found', icons.length, 'player icon(s) to clean up');
    icons.forEach((img) => {
      (img as HTMLElement).removeAttribute('style');
      (img as HTMLElement).removeAttribute('width');
      (img as HTMLElement).removeAttribute('height');
    });
  }

  // Call once after initial render
  removePlayerIconInlineStyles();

  // Set up a MutationObserver on the whole body to catch any icon changes
  const observer = new MutationObserver((mutations) => {
    // Debug: log what mutations occurred
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        console.debug(
          `[Silhouette] Attribute mutation: ${mutation.attributeName} on`,
          mutation.target
        );
      } else if (mutation.type === 'childList') {
        console.debug(
          `[Silhouette] ChildList mutation: added ${mutation.addedNodes.length}, removed ${mutation.removedNodes.length}`
        );
      }
    });
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
  const lobbyContainer = document.getElementById('lobby-container');
  if (lobbyContainer) {
    lobbyContainer.classList.remove('hidden');
    lobbyContainer.classList.remove('lobby--hidden');
    lobbyContainer.style.visibility = 'visible';
    lobbyContainer.style.opacity = '1';
  }
  console.log('🚀 [Client] Lobby explicitly made visible.');
});
