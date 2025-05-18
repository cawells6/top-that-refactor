// uiHelpers.ts
// Contains UI-related helper functions

import * as state from './state.js';

interface Player {
  name?: string;
  id: string;
}

export function showLobbyForm(): void {
  const lobbyContainer = state.getLobbyContainer();
  const waitingStateDiv = state.getWaitingStateDiv();
  const table = state.getTable();
  const lobbyFormContent = state.getLobbyFormContent();

  // Use class names that match index.html and CSS
  if (lobbyContainer) lobbyContainer.classList.remove('lobby--hidden', 'hidden');
  if (waitingStateDiv) waitingStateDiv.classList.add('hidden');
  if (table) table.classList.add('table--hidden', 'hidden');
  if (lobbyFormContent) lobbyFormContent.classList.remove('hidden');
}

export function showWaitingState(
  roomId: string,
  current: number,
  max: number,
  players: Player[] = []
): void {
  const lobbyContainer = state.getLobbyContainer();
  const waitingStateDiv = state.getWaitingStateDiv();
  const lobbyFormContent = state.getLobbyFormContent();
  const waitingHeading = state.$('waiting-heading');

  if (lobbyContainer) lobbyContainer.classList.remove('lobby--hidden', 'hidden');
  if (waitingStateDiv) waitingStateDiv.classList.remove('hidden');
  if (lobbyFormContent) lobbyFormContent.classList.add('hidden');
  if (waitingHeading) waitingHeading.textContent = `Room ${roomId} (${current}/${max})`;

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
  players.forEach((player) => {
    if (player) {
      const li = document.createElement('li');
      li.textContent = player.name || player.id;
      li.style.padding = '0.25rem 0';
      playerList.appendChild(li);
    }
  });
}

export function showGameTable(): void {
  const lobbyContainer = state.getLobbyContainer();
  const table = state.getTable();
  if (lobbyContainer) lobbyContainer.classList.add('hidden');
  if (table) table.classList.remove('table--hidden', 'hidden');
}

export function openModal(modalEl: HTMLElement | null): void {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
  const modalOverlay = state.getModalOverlay();
  if (modalOverlay) {
    modalOverlay.classList.remove('hidden');
  }
}

export function closeModal(): void {
  const rulesModal = state.getRulesModal();
  if (rulesModal) {
    rulesModal.classList.add('hidden');
  }
  const modalOverlay = state.getModalOverlay();
  if (modalOverlay) {
    modalOverlay.classList.add('hidden');
  }
}

export function showError(msg: string): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  state.$('toast-container')?.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

export function showGameOverMessage(didWin: boolean, winnerName: string): void {
  const over = document.createElement('div');
  over.id = 'game-over-container';
  over.innerHTML = `
    <div class="modal-content">
      <h1>Game Over!</h1>
      <p>${didWin ? '🎉 You win!' : `${winnerName} wins!`}</p>
      <button id="play-again-btn" class="btn btn-primary">Play Again</button>
    </div>`;
  document.body.appendChild(over);
  state.$('play-again-btn')?.addEventListener('click', () => location.reload());
}

export function validateName(): string | null {
  const nameInput = state.getNameInput();
  if (nameInput) {
    const name = nameInput.value.trim();
    if (name.length > 0 && name.length <= 20) {
      return name;
    }
  }
  alert('Please enter a name between 1 and 20 characters.');
  return null;
}
