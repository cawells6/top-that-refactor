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

  // --- Rules Modal: Close on Outside Click ---
  const rulesModalOverlay = document.getElementById('modal-overlay');
  if (rulesModalOverlay && rulesModal) {
    rulesModalOverlay.addEventListener('click', function(event) {
      const target = event.target;
      if (target instanceof Node && !rulesModal.contains(target) && target === rulesModalOverlay) {
        rulesModal.classList.add('modal--hidden');
        rulesModalOverlay.classList.add('modal__overlay--hidden');
      }
    });
  }

  // --- Rules Modal: Close on Green Background (main-content) ---
  const mainContent = document.getElementById('main-content');
  if (mainContent && rulesModal && rulesModalOverlay) {
    mainContent.addEventListener('click', function() {
      if (!rulesModal.classList.contains('modal--hidden')) {
        rulesModal.classList.add('modal--hidden');
        rulesModalOverlay.classList.add('modal__overlay--hidden');
      }
    });
  }

  // Add event handler for the "Got it!" button in the rules modal
  const gotItBtn = document.getElementById('rules-gotit-btn');
  if (gotItBtn && rulesModal && overlay) {
    gotItBtn.addEventListener('click', () => {
      rulesModal.classList.add('modal--hidden');
      overlay.classList.add('modal__overlay--hidden');
    });
  }

  // --- Expand/Collapse All Rules Sections (including quick tips) ---
  const expandCollapseBtn = document.getElementById('expand-collapse-all-btn');
  if (expandCollapseBtn && rulesModal) {
    expandCollapseBtn.addEventListener('click', function () {
      const detailsList = Array.from(rulesModal.querySelectorAll('.rules-section'));
      // Only operate on <details> elements
      const allOpen = detailsList.every(d => d instanceof HTMLDetailsElement && d.open);
      detailsList.forEach(d => {
        if (d instanceof HTMLDetailsElement) d.open = !allOpen;
      });
      expandCollapseBtn.textContent = allOpen ? 'Expand All' : 'Collapse All';
    });
    // Update button label on modal open
    rulesBtn && rulesBtn.addEventListener('click', function () {
      setTimeout(() => {
        const detailsList = Array.from(rulesModal.querySelectorAll('.rules-section'));
        const allOpen = detailsList.every(d => d instanceof HTMLDetailsElement && d.open);
        expandCollapseBtn.textContent = allOpen ? 'Collapse All' : 'Expand All';
      }, 0);
    });
  }

  // Ensure the Start Game button is enabled/disabled when lobby updates
  const observer = new MutationObserver(updateStartGameButton);
  const playerList = document.getElementById('player-list');
  if (playerList) {
    observer.observe(playerList, { childList: true, subtree: false });
  }

  // Lobby form validation and error handling (from reference Canvas)
  const lobbyForm = document.getElementById('lobby-form');
  const nameInput = document.getElementById('name-input');
  const nameInputError = document.getElementById('name-input-error');

  if (lobbyForm && nameInput instanceof HTMLInputElement && nameInputError) {
    lobbyForm.addEventListener('submit', (e) => {
      // --- Player count validation ---
      const totalPlayersInput = document.getElementById('total-players-input');
      const cpuPlayersInput = document.getElementById('cpu-players-input');
      const playerCountError = document.getElementById('player-count-error');
      const numTotalPlayers = (totalPlayersInput instanceof HTMLInputElement) ? parseInt(totalPlayersInput.value, 10) : 1;
      const numCpuPlayers = (cpuPlayersInput instanceof HTMLInputElement) ? parseInt(cpuPlayersInput.value, 10) : 0;
      if (playerCountError) playerCountError.classList.add('hidden');
      if (numTotalPlayers + numCpuPlayers > 4) {
        e.preventDefault();
        if (playerCountError) playerCountError.classList.remove('hidden');
        return;
      } else if (playerCountError) {
        playerCountError.classList.add('hidden');
      }
      // --- Name validation ---
      const name = nameInput.value.trim();
      if (!name) {
        nameInputError.textContent = 'Name is required';
        nameInputError.classList.remove('hidden');
        nameInput.focus();
        e.preventDefault();
        return;
      }
      if (name.length < 2) {
        nameInputError.textContent = 'Name must be at least 2 characters';
        nameInputError.classList.remove('hidden');
        nameInput.focus();
        e.preventDefault();
        return;
      }
      nameInputError.classList.add('hidden');
      // --- Emit JOIN_GAME event ---
      const joinGameButton = document.getElementById('join-game-button');
      if (joinGameButton instanceof HTMLButtonElement) joinGameButton.disabled = true;
      // Get room param from URL if present
      let roomParam = null;
      try {
        const urlParams = new URLSearchParams(window.location.search);
        roomParam = urlParams.get('room') || null;
      } catch (err) {}
      state.socket.emit(JOIN_GAME, {
        name,
        totalPlayers: numTotalPlayers,
        numComputers: numCpuPlayers,
        roomParam
      });
      e.preventDefault();
    });
    nameInput.addEventListener('input', () => {
      nameInputError.classList.add('hidden');
    });
  }

  const totalPlayersInput = document.getElementById('total-players');
  const cpuPlayersInput = document.getElementById('cpu-players');
  const playerCountErrorDisplay = document.getElementById('player-count-error');

  function validatePlayerCounts() {
    if (!totalPlayersInput || !cpuPlayersInput || !playerCountErrorDisplay) {
      console.error('Lobby input elements not found for validation.');
      return false;
    }
    // Ensure we are working with HTMLInputElement
    const numTotalPlayers = parseInt((totalPlayersInput instanceof HTMLInputElement ? totalPlayersInput.value : '1'), 10);
    const numCpuPlayers = parseInt((cpuPlayersInput instanceof HTMLInputElement ? cpuPlayersInput.value : '0'), 10);
    playerCountErrorDisplay.classList.add('hidden');
    playerCountErrorDisplay.textContent = '';
    if (isNaN(numTotalPlayers) || isNaN(numCpuPlayers)) {
      playerCountErrorDisplay.textContent = 'Player and CPU counts must be numbers.';
      playerCountErrorDisplay.classList.remove('hidden');
      return false;
    }
    if (numTotalPlayers < 1) {
      playerCountErrorDisplay.textContent = 'At least 1 human player is required.';
      playerCountErrorDisplay.classList.remove('hidden');
      return false;
    }
    const totalParticipants = numTotalPlayers + numCpuPlayers;
    if (totalParticipants > 4) {
      playerCountErrorDisplay.textContent = 'Total participants cannot exceed 4.';
      playerCountErrorDisplay.classList.remove('hidden');
      return false;
    }
    return true;
  }
  if (totalPlayersInput) {
    totalPlayersInput.addEventListener('input', validatePlayerCounts);
  }
  if (cpuPlayersInput) {
    cpuPlayersInput.addEventListener('input', validatePlayerCounts);
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
