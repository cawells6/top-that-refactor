import * as state from './state.js';

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
  const table = getGameTable();
  const inSessionModal = document.getElementById('in-session-lobby-modal');
  const mainContent = document.getElementById('main-content');
  const body = document.body;

  if (!lobbyContainer) {
    console.warn(
      '[uiManager] showLobbyForm: #lobby-container element not found!'
    );
    return;
  }

  body.classList.add('showing-lobby');
  body.classList.remove('showing-game');

  // Let the layout-stabilizer.js handle the transition
  // We only need to manage content visibility here

  // Update internal UI states
  lobbyContainer.classList.remove('hidden');
  if (lobbyFormContent) lobbyFormContent.classList.remove('hidden');
  if (waitingStateDiv) waitingStateDiv.classList.add('hidden');
  if (table) table.classList.add('hidden');
  if (inSessionModal) {
    inSessionModal.classList.add('modal--hidden');
    inSessionModal.classList.add('hidden');
  }

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
  _players: { id: string; name: string; ready?: boolean; status?: string }[]
): void {
  // This function is now deprecated. All waiting/in-session info is handled by the in-session lobby modal.
  // No-op for now.
}

export function showGameTable(): void {
  // Additional UI updates
  const table = getGameTable();
  const mainContent = document.getElementById('main-content');
  const lobbyContainer = getLobbyContainer();
  const inSessionModal = document.getElementById('in-session-lobby-modal');
  const rulesModal = getRulesModal();
  const overlay = getModalOverlay();
  const body = document.body;

  if (!table) {
    console.warn('[uiManager] showGameTable: #game-table element not found!');
    return;
  }

  body.classList.remove('showing-lobby');
  body.classList.add('showing-game');

  // Hide the lobby container
  if (lobbyContainer) {
    lobbyContainer.classList.add('hidden');
  }

  // Hide the in-session lobby modal if visible
  if (inSessionModal) {
    inSessionModal.classList.add('modal--hidden');
    inSessionModal.classList.add('hidden');
  }

  if (rulesModal) {
    rulesModal.classList.add('modal--hidden');
  }
  if (overlay) {
    overlay.classList.add('modal__overlay--hidden');
  }
  body.classList.remove('rules-modal-open');
  document.documentElement.classList.remove('rules-modal-open');

  // Show the game table
  table.classList.remove('hidden');

  // Add game-active class to main content if needed
  if (mainContent) {
    mainContent.classList.add('game-active');
  }
}

export function showError(msg: string): void {
  alert(msg);
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
