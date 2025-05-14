// public/scripts/events.js
import * as state from './state.js';

import { initializeSocketHandlers } from './socketHandlers.js';
import { showLobbyForm, openModal, closeModal, validateName } from './uiHelpers.js';

import {
  JOIN_GAME,
  START_GAME
} from '../src/shared/events.js';

document.addEventListener('DOMContentLoaded', () => {
  state.loadSession();

  // Initialize socket handlers
  initializeSocketHandlers();

  // UI hooks
  const createJoinBtn = state.$('create-join');
  if (createJoinBtn) {
    createJoinBtn.onclick = () => {
      const name = validateName();
      if (!name) return;
      state.socket.emit(JOIN_GAME, name);
      if (createJoinBtn instanceof HTMLButtonElement) {
        createJoinBtn.disabled = true;
      }
    };
  }

  state.getCopyLinkBtn() && (state.getCopyLinkBtn().onclick = () => {
    navigator.clipboard.writeText(window.location.href);
  });

  // Restore rules modal event listeners
  const rulesBtn = document.getElementById('rules-button');
  const rulesModal = document.getElementById('rules-modal');
  const closeBtn = rulesModal?.querySelector('.modal__close-button');
  const overlay = document.getElementById('modal-overlay');

  if (rulesModal) rulesModal.classList.add('modal--hidden');
  if (overlay) overlay.classList.add('modal__overlay--hidden');

  if (rulesBtn && rulesModal && closeBtn && overlay) {
    rulesBtn.onclick = () => {
      rulesModal.classList.remove('modal--hidden');
      overlay.classList.remove('modal__overlay--hidden');
    };
    // Use addEventListener for close button to avoid type errors
    closeBtn.addEventListener('click', () => {
      rulesModal.classList.add('modal--hidden');
      overlay.classList.add('modal__overlay--hidden');
    });
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        rulesModal.classList.add('modal--hidden');
        overlay.classList.add('modal__overlay--hidden');
      }
    };
  }

  state.getBackToLobbyButton() && (state.getBackToLobbyButton().onclick = () => {
    sessionStorage.clear();
    showLobbyForm();
  });

  const startGameBtn = document.getElementById('start-game-button');
  if (startGameBtn) {
    startGameBtn.onclick = () => {
      if (!canStartGame()) {
        console.error('At least 2 players required');
        return;
      }
      const computerInput = document.getElementById('computer-count');
      const computerCount = (computerInput instanceof HTMLInputElement) ? parseInt(computerInput.value, 10) || 0 : 0;
      state.socket.emit(START_GAME, { computerCount });
      if (startGameBtn instanceof HTMLButtonElement) {
        startGameBtn.disabled = true;
      }
    };
  }

  // Auto-join if ?room= is present in URL
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room') || '';
  if (roomParam && createJoinBtn) {
    // Hide setup fields if joining by link
    document.getElementById('lobby-form-content')?.classList.add('hidden');
    // Auto-fill join on load
    setTimeout(() => {
      const nameInput = document.getElementById('name');
      if (nameInput && nameInput instanceof HTMLInputElement && !nameInput.value) nameInput.value = 'Guest';
      createJoinBtn.click();
    }, 100);
  }
});

// —– UI helper functions —–

function canStartGame() {
  const playerList = document.getElementById('player-list');
  // Count <li> elements within the player-list div as human players
  const humanCount = playerList ? playerList.getElementsByTagName('li').length : 0;

  const computerInput = document.getElementById('computer-count');
  const computerCount = (computerInput instanceof HTMLInputElement) ? parseInt(computerInput.value, 10) || 0 : 0;

  // Ensure that the total number of players (humans + computers) is at least 2
  // and that there is at least one human player.
  return humanCount > 0 && (humanCount + computerCount) >= 2;
}
