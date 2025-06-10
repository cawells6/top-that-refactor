// public/scripts/main.ts
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

  // --- START: New logic for handling join links ---
  const urlParams = new URLSearchParams(window.location.search);
  const roomIdFromUrl = urlParams.get('room');

  // Only run join link logic if NOT in-session
  const inSession = document.body.classList.contains('in-session');
  if (roomIdFromUrl && !inSession) {
    sessionStorage.setItem('currentRoom', roomIdFromUrl);
    // Only update join code inputs if they are empty
    const joinCodeInputs = document.querySelectorAll<HTMLInputElement>(
      '#join-code-input, #lobby-room-code'
    );
    joinCodeInputs.forEach((input) => {
      if (!input.value) {
        input.value = roomIdFromUrl.toUpperCase();
      }
    });
    // Clean up the URL to prevent issues on page refresh
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  // --- END: New logic for handling join links ---
});
