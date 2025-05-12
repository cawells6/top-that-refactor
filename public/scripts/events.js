// public/scripts/events.js
import * as state from './state.js';

import { renderGameState } from './render.js';

import {
  JOIN_GAME,
  PLAYER_JOINED,
  LOBBY,
  STATE_UPDATE,
  REJOIN,
  SPECIAL_CARD,
  NEXT_TURN,
  START_GAME,
  JOINED
} from '../src/shared/events.js';

document.addEventListener('DOMContentLoaded', () => {
  state.loadSession();

  state.socket.on('connect', () => {
    if (state.myId && state.currentRoom) {
      state.socket.emit(REJOIN, state.myId, state.currentRoom);
    } else {
      showLobbyForm();
    }
  });
  state.socket.on(JOINED, ({ id, roomId }) => {
    state.setMyId(id);
    state.setCurrentRoom(roomId);
    state.saveSession();
  });

  state.socket.on(PLAYER_JOINED, d => {
    // server returns array of player IDs
    // (no longer sets myId here)
  });

  state.socket.on(LOBBY, data => {
    showWaitingState(data.roomId, data.players.length, data.maxPlayers);
  });

  state.socket.on(STATE_UPDATE, s => {
    renderGameState(s);
    if (s.started) showGameTable();
  });

  state.socket.on('err', msg => {
    showError(msg);
  });  // UI hooks
  const createJoinBtn = state.$('create-join');
  if (createJoinBtn) {
    createJoinBtn.onclick = () => {
      const name = validateName();
      if (!name) return;
      state.socket.emit(JOIN_GAME, name);
      // Add TypeScript-friendly way to set disabled property
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
  state.getModalOverlay() && (state.getModalOverlay().onclick = closeModal);

  state.getBackToLobbyButton() && (state.getBackToLobbyButton().onclick = () => {
    sessionStorage.clear();
    showLobbyForm();
  });
  // Start Game button wiring
  const startGameBtn = document.getElementById('start-game-button');
  if (startGameBtn) {
    startGameBtn.onclick = () => {
      state.socket.emit(START_GAME);
      // Add TypeScript-friendly way to set disabled property
      if (startGameBtn instanceof HTMLButtonElement) {
        startGameBtn.disabled = true;
      }
    };
  }

  // Always hide modal and overlay on load
  state.getRulesModal().classList.add('hidden');
  state.getModalOverlay().classList.add('hidden');

  // Show rules modal only when button is clicked
  const rulesBtn = state.getRulesButton();
  if (rulesBtn) {
    rulesBtn.onclick = () => {
      state.getRulesModal().classList.remove('hidden');
      state.getModalOverlay().classList.remove('hidden');
    };
  }
  // Close modal on close button or overlay click
  const closeBtn = document.querySelector('#rules-modal .modal-close-button');
  if (closeBtn && closeBtn instanceof HTMLButtonElement) {
    closeBtn.onclick = () => {
      state.getRulesModal().classList.add('hidden');
      state.getModalOverlay().classList.add('hidden');
    };
  } else if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      state.getRulesModal().classList.add('hidden');
      state.getModalOverlay().classList.add('hidden');
    });
  }
  const overlay = state.getModalOverlay();
  if (overlay) {
    overlay.onclick = () => {
      state.getRulesModal().classList.add('hidden');
      state.getModalOverlay().classList.add('hidden');
    };
  }

  // BEM modal logic for How to Play
  const modal    = document.getElementById('rules-modal');
  const openBtn  = document.getElementById('rules-button');
  const closeBtnBem = modal.querySelector('.modal__close-button');
  const backdrop = modal.querySelector('.modal__backdrop');

  openBtn.addEventListener('click', () => {
    modal.classList.add('modal--open');
  });
  [closeBtnBem, backdrop].forEach(el =>
    el.addEventListener('click', () => {
      modal.classList.remove('modal--open');
    })
  );
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('modal--open')) {
      modal.classList.remove('modal--open');
    }
  });
});

// —– UI helper functions —–

function validateName() {
  const nameIn    = state.$('name');
  const nameError = state.$('name-error');
  
  // TypeScript-friendly way to access input value
  const n = nameIn instanceof HTMLInputElement ? nameIn.value.trim() : '';
  
  if (!n) {
    nameIn.classList.add('input-error');
    nameError.classList.remove('hidden');
    return null;
  }
  nameError.classList.add('hidden');
  return n;
}

function showLobbyForm() {
  state.getLobbyContainer().classList.remove('hidden');
  state.getWaitingStateDiv().classList.add('hidden');
  state.getTable().classList.add('hidden');
  state.getLobbyFormContent().classList.remove('hidden');
}

function showWaitingState(roomId, current, max) {
  state.getLobbyContainer().classList.remove('hidden');
  state.getWaitingStateDiv().classList.remove('hidden');
  state.getLobbyFormContent().classList.add('hidden');
  state.$('waiting-heading').textContent = `Room ${roomId} (${current}/${max})`;
}

function showGameTable() {
  state.getLobbyContainer().classList.add('hidden');
  state.getTable().classList.remove('hidden');
}

function openModal(modalEl) {
  modalEl.classList.remove('hidden');
  state.getModalOverlay().classList.remove('hidden');
}

function closeModal() {
  state.getRulesModal().classList.add('hidden');
  state.getModalOverlay().classList.add('hidden');
}

function showError(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  state.$('toast-container')?.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function showGameOverMessage(didWin, winnerName) {
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
