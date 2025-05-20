// public/scripts/events.ts
import * as state from './state'; // Removed .js
import { initializeSocketHandlers } from './socketHandlers'; // Removed .js
import { JOIN_GAME, START_GAME } from '../../src/shared/events.js';
import {
  showLobbyForm,
  getNameInput,
  getCopyLinkBtn,
  getRulesButton,
  getRulesModal,
  getBackToLobbyButton,
} from './uiManager';

export function initializePageEventListeners(): void {
  state.loadSession();

  // Initialize socket handlers
  initializeSocketHandlers();

  // UI hooks
  const createJoinBtn = document.getElementById('create-join') as HTMLButtonElement | null;
  if (createJoinBtn) {
    createJoinBtn.onclick = () => {
      const nameInputElement = getNameInput();
      const name = nameInputElement?.value.trim();
      if (!name) {
        alert('Please enter a valid name.');
        return;
      }
      state.socket.emit(JOIN_GAME, name);
      createJoinBtn.disabled = true;
    };
  }

  const copyLinkBtn = getCopyLinkBtn();
  if (copyLinkBtn) {
    copyLinkBtn.onclick = () => {
      navigator.clipboard.writeText(window.location.href);
    };
  }

  const rulesButtonElement = getRulesButton();
  const rulesModalElement = getRulesModal();
  const overlayElement = document.getElementById('modal-overlay') as HTMLElement | null;

  const mainCloseButton = rulesModalElement?.querySelector('.modal__close-button');
  if (mainCloseButton) {
    mainCloseButton.addEventListener('click', () => {
      if (rulesModalElement && overlayElement) {
        rulesModalElement.classList.add('modal--hidden');
        overlayElement.classList.add('modal__overlay--hidden');
      }
    });
  } else {
    const modalCloseButton = document.querySelector('.modal-close-button');
    if (modalCloseButton) {
      modalCloseButton.addEventListener('click', () => {
        if (rulesModalElement && overlayElement) {
          rulesModalElement.classList.add('modal--hidden');
          overlayElement.classList.add('modal__overlay--hidden');
        }
      });
    }
  }

  const backToLobbyButton = getBackToLobbyButton();
  if (backToLobbyButton) {
    backToLobbyButton.onclick = () => {
      sessionStorage.clear();
      showLobbyForm();
    };
  }

  const startGameBtn = document.getElementById('start-game-button') as HTMLButtonElement | null;
  if (startGameBtn) {
    startGameBtn.onclick = () => {
      const computerInput = document.getElementById('computer-count') as HTMLInputElement | null;
      const computerCount = computerInput ? parseInt(computerInput.value, 10) || 0 : 0;

      state.socket.emit(START_GAME, { computerCount });
      startGameBtn.disabled = true;
    };
  }

  if (rulesModalElement) {
    rulesModalElement.classList.add('modal--hidden');
  }
  if (overlayElement) {
    overlayElement.classList.add('modal__overlay--hidden');
  }

  const closeBtnInsideModal = rulesModalElement?.querySelector(
    '.modal__close-button'
  ) as HTMLButtonElement | null;

  if (rulesButtonElement && rulesModalElement && closeBtnInsideModal && overlayElement) {
    rulesButtonElement.onclick = () => {
      const isOpen = !rulesModalElement.classList.contains('modal--hidden');
      if (isOpen) {
        rulesModalElement.classList.add('modal--hidden');
        overlayElement.classList.add('modal__overlay--hidden');
      } else {
        rulesModalElement.classList.remove('modal--hidden');
        overlayElement.classList.remove('modal__overlay--hidden');
      }
    };
    closeBtnInsideModal.addEventListener('click', () => {
      rulesModalElement.classList.add('modal--hidden');
      overlayElement.classList.add('modal__overlay--hidden');
    });
    overlayElement.onclick = (e) => {
      if (e.target === overlayElement) {
        rulesModalElement.classList.add('modal--hidden');
        overlayElement.classList.add('modal__overlay--hidden');
      }
    };
  }

  if (overlayElement && rulesModalElement) {
    overlayElement.addEventListener('click', function (event) {
      const target = event.target;
      if (
        target instanceof Node &&
        !rulesModalElement.contains(target) &&
        target === overlayElement
      ) {
        rulesModalElement.classList.add('modal--hidden');
        overlayElement.classList.add('modal__overlay--hidden');
      }
    });
  }

  const mainContent = document.getElementById('main-content');
  if (mainContent && rulesModalElement && overlayElement) {
    mainContent.addEventListener('click', function () {
      if (!rulesModalElement.classList.contains('modal--hidden')) {
        rulesModalElement.classList.add('modal--hidden');
        overlayElement.classList.add('modal__overlay--hidden');
      }
    });
  }

  const gotItBtn = document.getElementById('rules-gotit-btn') as HTMLButtonElement | null;
  if (gotItBtn && rulesModalElement && overlayElement) {
    gotItBtn.addEventListener('click', () => {
      rulesModalElement.classList.add('modal--hidden');
      overlayElement.classList.add('modal__overlay--hidden');
    });
  }

  if (rulesModalElement) {
    const expandCollapseBtn = rulesModalElement.querySelector(
      '#expand-collapse-rules'
    ) as HTMLButtonElement | null;

    if (expandCollapseBtn) {
      expandCollapseBtn.addEventListener('click', function () {
        const detailsList = Array.from(rulesModalElement.querySelectorAll('.rules-section'));
        const allOpen = detailsList.every((d) => d instanceof HTMLDetailsElement && d.open);
        detailsList.forEach((d) => {
          if (d instanceof HTMLDetailsElement) {
            d.open = !allOpen;
          }
        });
        this.textContent = allOpen ? 'Expand All' : 'Collapse All'; // Use 'this' as it refers to expandCollapseBtn
      });
    }

    if (rulesButtonElement && expandCollapseBtn) {
      rulesButtonElement.addEventListener('click', function () {
        setTimeout(() => {
          if (rulesModalElement && expandCollapseBtn) {
            const detailsList = Array.from(rulesModalElement.querySelectorAll('.rules-section'));
            const allOpen = detailsList.every((d) => d instanceof HTMLDetailsElement && d.open);
            expandCollapseBtn.textContent = allOpen ? 'Collapse All' : 'Expand All';
          }
        }, 0);
      });
    }
  }

  const observer = new MutationObserver(updateStartGameButton);
  const playerList = document.getElementById('player-list');
  if (playerList) {
    observer.observe(playerList, { childList: true, subtree: false });
  }

  const lobbyForm = document.getElementById('lobby-form');
  const nameInputLobby = getNameInput();
  const nameInputError = document.getElementById('name-input-error') as HTMLElement | null;

  if (lobbyForm && nameInputLobby && nameInputError) {
    lobbyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInputLobby.value.trim();

      if (!name) {
        nameInputError.textContent = 'Name is required';
        nameInputError.classList.remove('hidden');
        nameInputLobby.focus();
        return;
      }
      if (name.length < 2) {
        nameInputError.textContent = 'Name must be at least 2 characters';
        nameInputError.classList.remove('hidden');
        nameInputLobby.focus();
        return;
      }
      nameInputError.classList.add('hidden');

      const numHumansInput = document.getElementById(
        'total-players-input'
      ) as HTMLInputElement | null;
      let numHumans = 1;
      if (numHumansInput) {
        numHumans = parseInt(numHumansInput.value, 10);
        if (isNaN(numHumans) || numHumans < 1) {
          numHumans = 1;
        }
      }

      const numCPUsInput = document.getElementById('cpu-players-input') as HTMLInputElement | null;
      let numCPUs = 0;
      if (numCPUsInput) {
        numCPUs = parseInt(numCPUsInput.value, 10);
        if (isNaN(numCPUs) || numCPUs < 0) {
          numCPUs = 0;
        }
      }

      const playerCountErrorDiv = document.getElementById(
        'player-count-error'
      ) as HTMLElement | null;
      if (playerCountErrorDiv) {
        if (numHumans < 1) {
          playerCountErrorDiv.textContent = 'At least one human player is required.';
          playerCountErrorDiv.classList.remove('hidden');
          return;
        }
        if (numHumans + numCPUs < 2) {
          playerCountErrorDiv.textContent = 'A minimum of 2 total players is required.';
          playerCountErrorDiv.classList.remove('hidden');
          return;
        }
        if (numHumans + numCPUs > 4) {
          playerCountErrorDiv.textContent = 'Total players cannot exceed 4.';
          playerCountErrorDiv.classList.remove('hidden');
          return;
        }
        playerCountErrorDiv.classList.add('hidden');
      }

      state.socket.emit(JOIN_GAME, { name, numHumans, numCPUs });

      const submitButton = lobbyForm.querySelector('#join-game-button') as HTMLButtonElement | null;
      if (submitButton) {
        submitButton.disabled = true;
      }
    });
    nameInputLobby.addEventListener('input', () => {
      if (nameInputError) {
        nameInputError.classList.add('hidden');
      }
    });
  }

  const totalPlayersInput = document.getElementById('total-players') as HTMLInputElement | null;
  const cpuPlayersInput = document.getElementById('cpu-players') as HTMLInputElement | null;
  const playerCountErrorDisplay = document.getElementById(
    'player-count-error'
  ) as HTMLElement | null;

  function validatePlayerCounts() {
    if (!totalPlayersInput || !cpuPlayersInput || !playerCountErrorDisplay) {
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

document.addEventListener('DOMContentLoaded', initializePageEventListeners);

function updateStartGameButton() {
  const startGameBtn = document.getElementById('start-game-button') as HTMLButtonElement | null;
  if (startGameBtn) {
    const playerList = document.getElementById('player-list');
    const humanCount = playerList ? playerList.getElementsByTagName('li').length : 0;
    const computerInput = document.getElementById('computer-count') as HTMLInputElement | null;
    const computerCount = computerInput ? parseInt(computerInput.value, 10) || 0 : 0;
    startGameBtn.disabled = !(humanCount > 0 && humanCount + computerCount >= 2);
  }
}
