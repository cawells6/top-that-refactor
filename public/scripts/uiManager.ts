import { renderGameState } from './render.js';
import * as state from './state.js';
import { JOINED, LOBBY_STATE_UPDATE, STATE_UPDATE, REJOIN } from '../../src/shared/events.js';
import { GameStateData } from '../../src/shared/types.js';

export const getLobbyContainer = (): HTMLElement | null =>
  document.getElementById('lobby-container');

export const getLobbyFormContent = (): HTMLElement | null =>
  document.getElementById('lobby-form-content');

export const getWaitingStateDiv = (): HTMLElement | null =>
  document.getElementById('waiting-state');

export const getGameTable = (): HTMLElement | null => document.getElementById('game-table'); // Corrected getter

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

export const getRulesModal = (): HTMLElement | null => document.getElementById('rules-modal');

export const getModalOverlay = (): HTMLElement | null => document.getElementById('modal-overlay');

export const getBackToLobbyButton = (): HTMLButtonElement | null =>
  document.getElementById('back-to-lobby-button') as HTMLButtonElement | null;

export const getGameLogEntries = (): HTMLElement | null =>
  document.getElementById('game-log-entries');

export const getNameInput = (): HTMLInputElement | null =>
  document.getElementById('player-name-input') as HTMLInputElement | null;

export const $ = (id: string): HTMLElement | null => document.getElementById(id);

export function showLobbyForm(): void {
  const lobbyContainer = getLobbyContainer();
  const lobbyFormContent = getLobbyFormContent();
  const waitingStateDiv = getWaitingStateDiv();
  const table = getGameTable();
  const mainContent = document.getElementById('main-content');

  if (lobbyContainer) lobbyContainer.classList.remove('hidden');
  if (lobbyFormContent) lobbyFormContent.classList.remove('hidden');
  if (waitingStateDiv) waitingStateDiv.classList.add('hidden');
  if (table) {
    table.classList.add('table--hidden', 'hidden');
    console.log('[uiManager] showLobbyForm: Hid game table.');
  }
  if (mainContent) mainContent.classList.remove('game-active');
  console.log('[uiManager] showLobbyForm: Showed lobby form.');
}

export function hideLobbyForm(): void {
  const lobbyContainer = getLobbyContainer();
  const lobbyFormContent = getLobbyFormContent();

  if (lobbyContainer) lobbyContainer.classList.add('hidden');
  if (lobbyFormContent) lobbyFormContent.classList.add('hidden');
}

export function showWaitingState(
  roomId: string,
  currentPlayers: number,
  maxPlayers: number,
  players: { id: string; name: string; ready: boolean }[]
): void {
  const lobbyContainer = getLobbyContainer();
  const lobbyFormContent = getLobbyFormContent();
  const waitingStateDiv = getWaitingStateDiv();
  const mainContent = document.getElementById('main-content');

  if (lobbyContainer) lobbyContainer.classList.remove('hidden');
  if (lobbyFormContent) lobbyFormContent.classList.add('hidden');
  if (waitingStateDiv) waitingStateDiv.classList.remove('hidden');
  if (mainContent) mainContent.classList.remove('game-active');
  console.log('[uiManager] showWaitingState: Showed waiting state.');

  // Update waiting heading
  const waitingHeading = document.getElementById('waiting-heading');
  if (waitingHeading) {
    waitingHeading.textContent = `Room: ${roomId} (${currentPlayers}/${maxPlayers})`;
  }

  // Update invite link and QR code
  // Render player list
  let playerList = document.getElementById('player-list');
  if (!playerList) {
    playerList = document.createElement('ul');
    playerList.id = 'player-list';
    playerList.style.marginTop = '1rem';
    playerList.style.marginBottom = '1rem';
    playerList.style.listStyle = 'none';
    playerList.style.padding = '0';
    if (waitingStateDiv) waitingStateDiv.appendChild(playerList);
  }
  playerList.innerHTML = '';
  players.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = `${p.name} - ${p.ready ? 'Ready' : 'Not Ready'}`;
    playerList.appendChild(li);
  });
}

export function showGameTable(): void {
  // Set up the play area using the render.js playArea function
  // playArea();

  // Additional UI updates
  const lobbyContainer = getLobbyContainer();
  const table = getGameTable();
  const mainContent = document.getElementById('main-content');

  if (!table) {
    console.warn('[uiManager] showGameTable: #game-table element not found!');
  } else {
    table.classList.remove('table--hidden', 'hidden');
    console.log('[uiManager] showGameTable: Revealed game table.');
  }
  if (lobbyContainer) {
    lobbyContainer.classList.add('hidden');
    console.log('[uiManager] showGameTable: Hid lobby container.');
  }
  if (mainContent) {
    mainContent.classList.add('game-active');
    console.log('[uiManager] showGameTable: Added game-active to main-content.');
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
    (data: { roomId: string; players: { id: string; name: string; ready: boolean }[] }) => {
      showWaitingState(data.roomId, data.players.length, data.players.length, data.players);
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
