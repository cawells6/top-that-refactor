import { renderGameState } from './render.js';
import * as state from './state.js';
import { JOINED, PLAYER_JOINED, LOBBY, STATE_UPDATE, REJOIN } from '../../src/shared/events.js';
import { GameStateData, ClientStatePlayer } from '../../src/shared/types.js';

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
  const table = getGameTable();
  const mainContent = document.getElementById('main-content');

  if (lobbyContainer) lobbyContainer.classList.remove('hidden');
  if (table) table.classList.add('table--hidden', 'hidden');
  if (mainContent) mainContent.classList.remove('game-active'); // Remove class for lobby layout
}

export function hideLobbyForm(): void {
  const lobbyContainer = getLobbyContainer();
  if (lobbyContainer) lobbyContainer.classList.add('hidden');
}

export function showWaitingState(
  roomId: string,
  currentPlayers: number,
  maxPlayers: number,
  players: Pick<ClientStatePlayer, 'name' | 'disconnected'>[] // More specific type for players in lobby
): void {
  const lobbyContainer = getLobbyContainer();
  const lobbyFormContent = getLobbyFormContent();
  const waitingStateDiv = getWaitingStateDiv();
  const mainContent = document.getElementById('main-content');

  if (lobbyContainer) lobbyContainer.classList.remove('hidden');
  if (lobbyFormContent) lobbyFormContent.classList.add('hidden');
  if (waitingStateDiv) waitingStateDiv.classList.remove('hidden');
  if (mainContent) mainContent.classList.remove('game-active'); // Ensure lobby layout

  // Update waiting heading
  const waitingHeading = document.getElementById('waiting-heading');
  if (waitingHeading) {
    waitingHeading.textContent = `Room: ${roomId} (${currentPlayers}/${maxPlayers})`;
  }
  const inviteInput = document.getElementById('invite-link') as HTMLInputElement | null;
  const qrImg = document.getElementById('qr-code-image') as HTMLImageElement | null;
  if (inviteInput) {
    const link = `${window.location.origin}?room=${roomId}`;
    inviteInput.value = link;
    if (qrImg) {
      qrImg.src = `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(link)}&chs=150x150&chld=L|0`;
      qrImg.style.display = 'block';
    }
  }
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
    li.textContent = p.name + (p.disconnected ? ' (disconnected)' : '');
    playerList.appendChild(li);
  });
}

export function showGameTable(): void {
  const lobbyContainer = getLobbyContainer();
  const table = getGameTable();
  const mainContent = document.getElementById('main-content');

  if (lobbyContainer) lobbyContainer.classList.add('hidden');
  if (table) table.classList.remove('table--hidden', 'hidden');
  if (mainContent) mainContent.classList.add('game-active'); // Add class for game layout
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
  state.socket.removeAllListeners(PLAYER_JOINED);
  state.socket.removeAllListeners(LOBBY);
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

  state.socket.on(PLAYER_JOINED, () => {
    // Handle player joined logic
  });

  state.socket.on(
    LOBBY,
    (data: {
      roomId: string;
      players: Pick<ClientStatePlayer, 'name' | 'disconnected'>[];
      maxPlayers: number;
    }) => {
      const { roomId, players, maxPlayers } = data;
      showWaitingState(roomId, players.length, maxPlayers, players);
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
