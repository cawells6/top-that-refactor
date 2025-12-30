// public/scripts/main.ts
import { JOIN_GAME } from '@shared/events.ts';

import { InSessionLobbyModal } from './components/InSessionLobbyModal.js';
import { initializePageEventListeners } from './events.js';
import { initializeSocketHandlers } from './socketService.js';
import { socket, socketReady, setCurrentRoom } from './state.js';

console.log('🚀 [Client] main.ts loaded successfully via Vite!');

// --- START: New logic for handling join links ---
function handleJoinLink({
  setCurrentRoom,
  socket,
  window,
  document,
}: {
  setCurrentRoom: (room: string) => void;
  socket: { emit: Function };
  window: Window;
  document: Document;
}) {
  const urlParams = new URLSearchParams(window.location.search);
  const roomIdFromUrl = urlParams.get('room');
  const inSession = document.body.classList.contains('in-session');
  console.log(
    '[handleJoinLink] roomIdFromUrl:',
    roomIdFromUrl,
    'inSession:',
    inSession,
    'window.location.search:',
    window.location.search
  );
  if (roomIdFromUrl && !inSession) {
    setCurrentRoom(roomIdFromUrl);
    const joinPayload = {
      roomId: roomIdFromUrl,
      playerName: 'Guest',
      numHumans: 1,
      numCPUs: 0,
    };
    socket.emit(JOIN_GAME, joinPayload);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}
// --- END: New logic for handling join links ---

/**
 * Initializes the main client logic. Allows dependency injection for testability.
 */
export async function initMain({
  injectedSetCurrentRoom,
  injectedSocket,
  injectedWindow,
  injectedDocument,
}: {
  injectedSetCurrentRoom?: typeof setCurrentRoom;
  injectedSocket?: typeof socket;
  injectedWindow?: Window;
  injectedDocument?: Document;
} = {}) {
  document.getElementById('main-content')?.classList.remove('preload-hidden');
  try {
    new InSessionLobbyModal();
    await socketReady;
    socket.on('connect', () => {
      console.log(
        '[Client] Socket.IO connected to backend! Socket ID:',
        socket.id
      );
    });
    socket.on('connect_error', (err) => {
      console.error(
        '[Client] Socket.IO connection error:',
        err.message,
        err.cause || ''
      );
    });
    socket.on('disconnect', (reason) => {
      console.log('[Client] Socket.IO disconnected:', reason);
    });

    await initializePageEventListeners();
    initializeSocketHandlers();
  } catch (error) {
    console.error('Error during initialization:', error);
  }
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
  removePlayerIconInlineStyles();
  const observer = new MutationObserver((_mutations) => {
    removePlayerIconInlineStyles();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'width', 'height'],
  });
  document.body.classList.remove('body-loading');
  document.body.classList.add('showing-lobby');
  const lobbyContainer = document.getElementById('lobby-container');
  if (lobbyContainer) {
    lobbyContainer.classList.remove('hidden');
  }
  console.log('🚀 [Client] Lobby explicitly made visible.');
  // Use injected or real dependencies for join link logic
  handleJoinLink({
    setCurrentRoom: injectedSetCurrentRoom || setCurrentRoom,
    socket: injectedSocket || socket,
    window: injectedWindow || window,
    document: injectedDocument || document,
  });
}

document.addEventListener('DOMContentLoaded', () => {
  void initMain();
});

