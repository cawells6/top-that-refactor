// public/scripts/main.ts
import { JOIN_GAME } from '@shared/events.ts';

import { InSessionLobbyModal } from './components/InSessionLobbyModal.js';
import { initializeLobby } from './events.js';
import { initializeGameControls } from './gameControls.js';
import { initializeManualMode } from './manualMode.js';
import { initializeSocketHandlers } from './socketService.js';
import {
  socket,
  socketReady,
  setCurrentRoom,
  setIsSpectator,
} from './state.js';
import * as StateModule from './state.js';

// Expose state for testing
const _getViteMode = () => {
  try {
    // Avoid the literal `import.meta` token in source so Jest (CJS) doesn't fail parsing.
    // eslint-disable-next-line no-eval
    const meta = eval("typeof import.meta !== 'undefined' ? import.meta : undefined");
    return meta?.env?.MODE;
  } catch (e) {
    return undefined;
  }
};

const _viteMode = _getViteMode();
if (_viteMode !== 'production' || (globalThis as any).process?.env?.NODE_ENV !== 'production') {
  (window as any).state = StateModule;
}

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
  const normalizedRoomId = roomIdFromUrl
    ? roomIdFromUrl.trim().toUpperCase()
    : null;
  const inSession = document.body.classList.contains('in-session');
  console.log(
    '[handleJoinLink] roomIdFromUrl:',
    roomIdFromUrl,
    'inSession:',
    inSession,
    'window.location.search:',
    window.location.search
  );
  if (normalizedRoomId && !inSession) {
    setCurrentRoom(normalizedRoomId);
    const joinPayload = {
      roomId: normalizedRoomId,
      playerName: 'Guest',
      numHumans: 1,
      numCPUs: 0,
    };
    socket.emit(JOIN_GAME, joinPayload);
    const params = new URLSearchParams(window.location.search);
    params.delete('room');
    const nextQuery = params.toString();
    const nextUrl = nextQuery
      ? `${window.location.pathname}?${nextQuery}`
      : window.location.pathname;
    window.history.replaceState({}, document.title, nextUrl);
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
  const params = new URLSearchParams(
    (injectedWindow || window).location.search
  );

  // Dev-only restart button should only appear in tutorial mode.
  // NOTE: Jest (CommonJS) can't parse `import.meta`, so we use a Vite-injected global instead.
  const isDev =
    typeof __DEV__ !== 'undefined'
      ? __DEV__
      : (globalThis as any).process?.env?.NODE_ENV === 'development';

  // 1. CHECK FOR TUTORIAL FLAG
  if (params.get('tutorial') === 'true') {
    console.log('🪖 Loading Tutorial Mode...');

    // Hide Lobby, Show Game Table
    document.body.classList.remove('showing-lobby');
    document.body.classList.add('showing-game');
    document.getElementById('lobby-container')?.classList.add('hidden');
    document.getElementById('game-table')?.classList.remove('hidden');

    if (isDev) {
      const devRestartButton = document.getElementById('dev-restart-button');
      if (devRestartButton) {
        devRestartButton.style.display = 'block';
        console.log('dY" [DEV] Restart button enabled (tutorial only)');
      }
    }

    // Dynamically import and initialize the Tutorial Controller
    const { TutorialController } =
      await import('./tutorial/TutorialController.js');
    new TutorialController();

    return; // STOP HERE. Do not connect to socket.
  }

  // Keep the restart button hidden outside tutorial mode.
  const devRestartButton = document.getElementById('dev-restart-button');
  if (devRestartButton) devRestartButton.style.display = 'none';

  // 2. NORMAL GAME LOAD (Existing Code)
  if (params.get('spectator') === '1' || params.get('spectator') === 'true') {
    setIsSpectator(true);
    document.body.classList.add('spectator-mode');
  }
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

    await initializeLobby();
    initializeSocketHandlers();
    initializeGameControls();
    initializeManualMode();
  } catch (error) {
    console.error('Error during initialization:', error);
  }

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
