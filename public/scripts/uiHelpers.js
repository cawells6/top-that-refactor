// uiHelpers.js
// Contains UI-related helper functions

import * as state from './state.js';

export function showLobbyForm() {
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

export function showWaitingState(roomId, current, max) {
  const lobbyContainer = state.getLobbyContainer();
  const waitingStateDiv = state.getWaitingStateDiv();
  const lobbyFormContent = state.getLobbyFormContent();
  const waitingHeading = state.$('waiting-heading');

  if (lobbyContainer) lobbyContainer.classList.remove('lobby--hidden', 'hidden');
  if (waitingStateDiv) waitingStateDiv.classList.remove('hidden');
  if (lobbyFormContent) lobbyFormContent.classList.add('hidden');
  if (waitingHeading) waitingHeading.textContent = `Room ${roomId} (${current}/${max})`;
}

export function showGameTable() {
  const lobbyContainer = state.getLobbyContainer();
  const table = state.getTable();
  if (lobbyContainer) lobbyContainer.classList.add('hidden');
  if (table) table.classList.remove('table--hidden', 'hidden');
}

export function openModal(modalEl) {
  modalEl.classList.remove('hidden');
  state.getModalOverlay().classList.remove('hidden');
}

export function closeModal() {
  state.getRulesModal().classList.add('hidden');
  state.getModalOverlay().classList.add('hidden');
}

export function showError(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  state.$('toast-container')?.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

export function showGameOverMessage(didWin, winnerName) {
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

export function validateName() {
  const nameInput = document.getElementById('name-input');
  const nameError = document.getElementById('name-input-error');
  if (nameInput instanceof HTMLInputElement) {
    console.log('Raw name input value:', nameInput.value);
    if (!nameInput.value.trim()) {
      nameInput.classList.add('input-error');
      nameError.style.display = '';
      return null;
    }
    nameInput.classList.remove('input-error');
    nameError.style.display = 'none';
    return nameInput.value.trim();
  }
  return null;
}
