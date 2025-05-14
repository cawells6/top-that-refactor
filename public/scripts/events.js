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

  state.getRulesButton() && (state.getRulesButton().onclick = () => openModal(state.getRulesModal()));
  document.querySelector('.modal-close-button')?.addEventListener('click', closeModal);

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

  // Rules modal logic (robust)
  const rulesBtn = document.getElementById('rules-button');
  const rulesModal = document.getElementById('rules-modal');
  const closeBtn = rulesModal?.querySelector('.modal__close-button');
  const overlay = document.getElementById('modal-overlay');

  if (rulesModal) rulesModal.classList.add('modal--hidden');
  if (overlay) overlay.classList.add('modal__overlay--hidden');

  // --- Toggle rules modal with How to Play button ---
  if (rulesBtn && rulesModal && closeBtn && overlay) {
    let rulesOpen = false;
    rulesBtn.onclick = () => {
      rulesOpen = !rulesModal.classList.contains('modal--hidden');
      if (rulesOpen) {
        rulesModal.classList.add('modal--hidden');
        overlay.classList.add('modal__overlay--hidden');
      } else {
        rulesModal.classList.remove('modal--hidden');
        overlay.classList.remove('modal__overlay--hidden');
      }
    };
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

  // Add event handler for the "Got it!" button in the rules modal
  const gotItBtn = document.getElementById('rules-gotit-btn');
  if (gotItBtn && rulesModal && overlay) {
    gotItBtn.addEventListener('click', () => {
      rulesModal.classList.add('modal--hidden');
      overlay.classList.add('modal__overlay--hidden');
    });
  }

  // Ensure the Start Game button is enabled/disabled when lobby updates
  const observer = new MutationObserver(updateStartGameButton);
  const playerList = document.getElementById('player-list');
  if (playerList) {
    observer.observe(playerList, { childList: true, subtree: false });
  }
});

// —– UI helper functions —–

function canStartGame() {
  // Count the number of players in the waiting state (lobby)
  const playerList = document.getElementById('player-list');
  const humanCount = playerList ? playerList.getElementsByTagName('li').length : 0;
  const computerInput = document.getElementById('computer-count');
  const computerCount = (computerInput instanceof HTMLInputElement) ? parseInt(computerInput.value, 10) || 0 : 0;
  return humanCount > 0 && (humanCount + computerCount) >= 2;
}

function updateStartGameButton() {
  const startGameBtn = document.getElementById('start-game-button');
  if (startGameBtn && startGameBtn instanceof HTMLButtonElement) {
    startGameBtn.disabled = !canStartGame();
  }
}
