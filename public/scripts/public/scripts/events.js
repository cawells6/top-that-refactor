// public/scripts/events.ts
import * as state from './state.js';
import * as uiManager from './uiManager.js';
import { initializeSocketHandlers } from './socketService.js';
import { showLobbyForm, openModal, closeModal } from './uiManager.js';
import { JOIN_GAME, START_GAME } from '../../src/shared/events.js'; // Use relative path
export function initializePageEventListeners() {
  state.loadSession();
  // Initialize socket handlers
  initializeSocketHandlers();
  // UI hooks
  const createJoinBtn = uiManager.$('create-join');
  if (createJoinBtn) {
    createJoinBtn.onclick = () => {
      const nameInput = uiManager.getNameInput(); // Get name input directly
      const name = nameInput?.value.trim(); // Get and trim value
      if (!name) {
        // Optionally show an error to the user if name is invalid
        alert('Please enter a valid name.');
        return;
      }
      state.socket.emit(JOIN_GAME, name);
      createJoinBtn.disabled = true;
    };
  }
  const copyLinkBtn = uiManager.getCopyLinkBtn();
  if (copyLinkBtn) {
    copyLinkBtn.onclick = () => {
      navigator.clipboard.writeText(window.location.href);
    };
  }
  const rulesButton = uiManager.getRulesButton();
  if (rulesButton) {
    rulesButton.onclick = () => {
      const rulesModal = uiManager.getRulesModal();
      if (rulesModal) {
        openModal(rulesModal);
      }
    };
  }
  document.querySelector('.modal-close-button')?.addEventListener('click', closeModal);
  const backToLobbyButton = uiManager.getBackToLobbyButton();
  if (backToLobbyButton) {
    backToLobbyButton.onclick = () => {
      sessionStorage.clear();
      showLobbyForm();
    };
  }
  const startGameBtn = document.getElementById('start-game-button');
  if (startGameBtn) {
    startGameBtn.onclick = () => {
      const computerInput = document.getElementById('computer-count');
      const computerCount = computerInput ? parseInt(computerInput.value, 10) || 0 : 0;
      console.log(
        '!!!!!!!!!! CLIENT (events.js): CLICKED start-game-button, ATTEMPTING TO EMIT START_GAME !!!!!!!!!!!',
        { computerCount }
      );
      state.socket.emit(START_GAME, { computerCount });
      startGameBtn.disabled = true;
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
      const allOpen = detailsList.every((d) => d instanceof HTMLDetailsElement && d.open);
      detailsList.forEach((d) => {
        if (d instanceof HTMLDetailsElement) d.open = !allOpen;
      });
      expandCollapseBtn.textContent = allOpen ? 'Expand All' : 'Collapse All';
    });
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
  if (lobbyForm && nameInput && nameInputError) {
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
      if (numHumansInput) {
        numHumans = parseInt(numHumansInput.value, 10);
        if (isNaN(numHumans) || numHumans < 1) {
          numHumans = 1;
        }
      }
      const numCPUsInput = document.getElementById('cpu-players-input');
      let numCPUs = 0;
      if (numCPUsInput) {
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
      if (submitButton) {
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
    const numTotalPlayers = parseInt(totalPlayersInput.value, 10);
    const numCpuPlayers = parseInt(cpuPlayersInput.value, 10);
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
}
// Call the initialization function when the DOM is ready
document.addEventListener('DOMContentLoaded', initializePageEventListeners);
// —– UI helper functions —–
function updateStartGameButton() {
  const startGameBtn = document.getElementById('start-game-button');
  if (startGameBtn) {
    const playerList = document.getElementById('player-list');
    const humanCount = playerList ? playerList.getElementsByTagName('li').length : 0;
    const computerInput = document.getElementById('computer-count');
    const computerCount = computerInput ? parseInt(computerInput.value, 10) || 0 : 0;
    startGameBtn.disabled = !(humanCount > 0 && humanCount + computerCount >= 2);
  }
}
