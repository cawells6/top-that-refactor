import { renderGameState } from './render.js';
import * as state from './state.js';
import {
  JOINED,
  LOBBY_STATE_UPDATE,
  STATE_UPDATE,
  REJOIN,
} from '../../src/types/events.js';
import { GameStateData } from '../../src/types/types.js';

export const getLobbyContainer = (): HTMLElement | null =>
  document.getElementById('lobby-container');

export const getLobbyFormContent = (): HTMLElement | null =>
  document.getElementById('lobby-form-content');

export const getWaitingStateDiv = (): HTMLElement | null =>
  document.getElementById('waiting-state');

export const getGameTable = (): HTMLElement | null =>
  document.getElementById('game-table'); // Corrected getter

export const getPlayerAreaBottom = (): HTMLElement | null =>
  document.getElementById('player-area-bottom');

export const getOpponentAreaTop = (): HTMLElement | null =>
  document.getElementById('opponent-area-top');

export const getOpponentAreaLeft = (): HTMLElement | null =>
  document.getElementById('opponent-area-left');

export const getOpponentAreaRight = (): HTMLElement | null =>
  document.getElementById('opponent-area-right');

export const getCopyLinkBtn = (): HTMLButtonElement | null =>
  document.getElementById('copy-link-button') as HTMLButtonElement | null;

export const getRulesButton = (): HTMLButtonElement | null =>
  document.getElementById('header-rules-button') as HTMLButtonElement | null;

export const getDealButton = (): HTMLButtonElement | null =>
  document.getElementById('header-deal-button') as HTMLButtonElement | null;

export const getRulesModal = (): HTMLElement | null =>
  document.getElementById('rules-modal');

export const getModalOverlay = (): HTMLElement | null =>
  document.getElementById('modal-overlay');

export const getBackToLobbyButton = (): HTMLButtonElement | null =>
  document.getElementById('back-to-lobby-button') as HTMLButtonElement | null;

export const getGameLogEntries = (): HTMLElement | null =>
  document.getElementById('game-log-entries');

export const getNameInput = (): HTMLInputElement | null =>
  document.getElementById('player-name-input') as HTMLInputElement | null;

export const $ = (id: string): HTMLElement | null =>
  document.getElementById(id);

export function showLobbyForm(): void {
  const lobbyContainer = getLobbyContainer();
  const lobbyFormContent = getLobbyFormContent();
  const waitingStateDiv = getWaitingStateDiv();
  const mainContent = document.getElementById('main-content');

  if (!lobbyContainer) {
    console.warn(
      '[uiManager] showLobbyForm: #lobby-container element not found!'
    );
    return;
  }

  // Let the layout-stabilizer.js handle the transition
  // We only need to manage content visibility here

  // Update internal UI states
  if (lobbyFormContent) lobbyFormContent.classList.remove('hidden');
  if (waitingStateDiv) waitingStateDiv.classList.add('hidden');

  // Optional: Update any class on main content if needed
  if (mainContent) {
    mainContent.classList.remove('game-active');
  }
}

export function hideLobbyForm(): void {
  const lobbyContainer = getLobbyContainer();
  const lobbyFormContent = getLobbyFormContent();

  if (lobbyContainer) {
    lobbyContainer.classList.add('hidden');
    lobbyContainer.classList.remove('lobby-fixed');
  }
  if (lobbyFormContent) lobbyFormContent.classList.add('hidden');
}

export function showWaitingState(
  _roomId: string,
  _currentPlayers: number,
  _maxPlayers: number,
  _players: { id: string; name: string; ready: boolean }[]
): void {
  // This function is now deprecated. All waiting/in-session info is handled by the in-session lobby modal.
  // No-op for now.
}

export function showGameTable(): void {
  // Additional UI updates
  const table = getGameTable();
  const mainContent = document.getElementById('main-content');

  if (!table) {
    console.warn('[uiManager] showGameTable: #game-table element not found!');
    return;
  }

  // Let the layout-stabilizer.js handle the transition
  // We only need to update internal UI state

  // Add game-active class to main content if needed
  if (mainContent) {
    mainContent.classList.add('game-active');
  }
}

export function showError(msg: string): void {
  alert(msg);
}

/**
 * Initializes socket event handlers.
 * NOTE: This function appears to be unused as `main.ts` imports `initializeSocketHandlers` from `socketService.ts`.
 */
export function initializeSocketHandlers(): void {
  if (!state.socket) {
    console.error('Socket not available for handlers');
    return;
  }

  // Remove existing listeners to prevent duplicates
  state.socket.removeAllListeners('connect');
  state.socket.removeAllListeners(JOINED);
  // Legacy events removed: PLAYER_JOINED, LOBBY
  state.socket.removeAllListeners(STATE_UPDATE);
  state.socket.removeAllListeners('err');

  state.socket.on('connect', () => {
    if (state.myId && state.currentRoom) {
      state.socket.emit(REJOIN, state.myId, state.currentRoom);
    } else {
      showLobbyForm();
    }
  });

  state.socket.on(JOINED, ({ id, roomId }: { id: string; roomId: string }) => {
    state.setMyId(id);
    state.setCurrentRoom(roomId);
    state.saveSession();
  });

  state.socket.on(
    LOBBY_STATE_UPDATE,
    (data: {
      roomId: string;
      players: { id: string; name: string; ready: boolean }[];
    }) => {
      showWaitingState(
        data.roomId,
        data.players.length,
        data.players.length,
        data.players
      );
    }
  );

  state.socket.on(STATE_UPDATE, (s: GameStateData) => {
    console.log('Received STATE_UPDATE:', s);
    renderGameState(s, state.myId);
    if (s.started) showGameTable();
  });

  state.socket.on('err', (msg: string) => {
    showError(msg);
  });
}

/**
 * Utility to hide an element (adds 'hidden' class or sets display:none if not present)
 */
export function hideElement(el: HTMLElement | null): void {
  if (!el) return;
  if ('classList' in el) {
    el.classList.add('hidden');
  } else {
    (el as any).style.display = 'none';
  }
}

/**
 * Utility to show an element (removes 'hidden' class or sets display:block if not present)
 */
export function showElement(el: HTMLElement | null): void {
  if (!el) return;
  if ('classList' in el) {
    el.classList.remove('hidden');
  } else {
    (el as any).style.display = '';
  }
}
