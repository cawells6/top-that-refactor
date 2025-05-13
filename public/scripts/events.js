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

  const rulesBtn = document.getElementById('rules-button');
  const rulesModal = document.getElementById('rules-modal');
  const closeBtn = rulesModal?.querySelector('.modal__close-button');
  const overlay = document.getElementById('modal-overlay');

  if (rulesBtn && rulesModal && closeBtn && overlay) {
    rulesBtn.onclick = () => {
      rulesModal.classList.remove('modal--hidden');
      overlay.classList.remove('modal__overlay--hidden');
    };
    if (closeBtn instanceof HTMLButtonElement) {
      closeBtn.onclick = () => {
        rulesModal.classList.add('modal--hidden');
        overlay.classList.add('modal__overlay--hidden');
      };
    } else {
      closeBtn.addEventListener('click', () => {
        rulesModal.classList.add('modal--hidden');
        overlay.classList.add('modal__overlay--hidden');
      });
    }
    overlay.onclick = () => {
      rulesModal.classList.add('modal--hidden');
      overlay.classList.add('modal__overlay--hidden');
    };
  }
});

// —– UI helper functions —–

function canStartGame() {
  let humanCount = 1;
  const computerInput = document.getElementById('computer-count');
  const computerCount = (computerInput instanceof HTMLInputElement) ? parseInt(computerInput.value, 10) || 0 : 0;
  return (humanCount + computerCount) >= 2;
}
