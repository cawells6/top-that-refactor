// public/scripts/events.js
import * as state from './state.js';

import { initializeSocketHandlers } from './socketHandlers.js';
import { showLobbyForm, openModal, closeModal, validateName } from './uiHelpers.js';

import { JOIN_GAME, START_GAME } from '../src/shared/events.js';

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

  state.getCopyLinkBtn() &&
    (state.getCopyLinkBtn().onclick = () => {
      navigator.clipboard.writeText(window.location.href);
    });

  state.getRulesButton() &&
    (state.getRulesButton().onclick = () => openModal(state.getRulesModal()));
  document.querySelector('.modal-close-button')?.addEventListener('click', closeModal);

  state.getBackToLobbyButton() &&
    (state.getBackToLobbyButton().onclick = () => {
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
      const computerCount =
        computerInput instanceof HTMLInputElement ? parseInt(computerInput.value, 10) || 0 : 0;

      console.log(
        '!!!!!!!!!! CLIENT (events.js): CLICKED start-game-button, ATTEMPTING TO EMIT START_GAME !!!!!!!!!!!',
        { computerCount }
      ); // <--- ADDED THIS LOG

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
    rulesModalOverlay.addEventListener('click', function (event) {
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
    mainContent.addEventListener('click', function () {
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
      const allOpen = detailsList.every((d) => d instanceof HTMLDetailsElement && d.open);
      detailsList.forEach((d) => {
        if (d instanceof HTMLDetailsElement) d.open = !allOpen;
      });
      expandCollapseBtn.textContent = allOpen ? 'Expand All' : 'Collapse All';
    });
    // Update button label on modal open
    rulesBtn &&
      rulesBtn.addEventListener('click', function () {
        setTimeout(() => {
          const detailsList = Array.from(rulesModal.querySelectorAll('.rules-section'));
          const allOpen = detailsList.every((d) => d instanceof HTMLDetailsElement && d.open);
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
      e.preventDefault();
      const name = nameInput.value.trim();

      // --- Name validation ---
      if (!name) {
        nameInputError.textContent = 'Name is required';
        nameInputError.classList.remove('hidden');
        nameInput.focus();
        return;
      }
      if (name.length < 2) {
        nameInputError.textContent = 'Name must be at least 2 characters';
        nameInputError.classList.remove('hidden');
        nameInput.focus();
        return;
      }
      nameInputError.classList.add('hidden');

      // --- Retrieve Player and CPU Counts ---
      const numHumansInput = document.getElementById('total-players-input');
      let numHumans = 1;
      if (numHumansInput instanceof HTMLInputElement) {
        numHumans = parseInt(numHumansInput.value, 10);
        if (isNaN(numHumans) || numHumans < 1) {
          numHumans = 1;
        }
      }

      const numCPUsInput = document.getElementById('cpu-players-input');
      let numCPUs = 0;
      if (numCPUsInput instanceof HTMLInputElement) {
        numCPUs = parseInt(numCPUsInput.value, 10);
        if (isNaN(numCPUs) || numCPUs < 0) {
          numCPUs = 0;
        }
      }

      // --- Client-side validation for player/CPU counts ---
      const playerCountErrorDiv = document.getElementById('player-count-error');
      if (numHumans < 1) {
        if (playerCountErrorDiv) {
          playerCountErrorDiv.textContent = 'At least one human player is required.';
          playerCountErrorDiv.classList.remove('hidden');
        }
        return;
      }
      if (numHumans + numCPUs < 2) {
        if (playerCountErrorDiv) {
          playerCountErrorDiv.textContent = 'A minimum of 2 total players is required.';
          playerCountErrorDiv.classList.remove('hidden');
        }
        return;
      }
      if (numHumans + numCPUs > 4) {
        if (playerCountErrorDiv) {
          playerCountErrorDiv.textContent = 'Total players cannot exceed 4.';
          playerCountErrorDiv.classList.remove('hidden');
        }
        return;
      }
      if (playerCountErrorDiv) playerCountErrorDiv.classList.add('hidden');

      // --- Emit the JOIN_GAME Event ---
      console.log(
        `Emitting JOIN_GAME with name: ${name}, numHumans: ${numHumans}, numCPUs: ${numCPUs}`
      );
      state.socket.emit(JOIN_GAME, {
        name: name,
        numHumans: numHumans,
        numCPUs: numCPUs,
      });

      // --- Disable the Submit Button ---
      const submitButton = lobbyForm.querySelector('#join-game-button');
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
      }
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
    const numTotalPlayers = parseInt(
      totalPlayersInput instanceof HTMLInputElement ? totalPlayersInput.value : '1',
      10
    );
    const numCpuPlayers = parseInt(
      cpuPlayersInput instanceof HTMLInputElement ? cpuPlayersInput.value : '0',
      10
    );
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
  const computerCount =
    computerInput instanceof HTMLInputElement ? parseInt(computerInput.value, 10) || 0 : 0;
  return humanCount > 0 && humanCount + computerCount >= 2;
}

function updateStartGameButton() {
  const startGameBtn = document.getElementById('start-game-button');
  if (startGameBtn && startGameBtn instanceof HTMLButtonElement) {
    startGameBtn.disabled = !canStartGame();
  }
}
