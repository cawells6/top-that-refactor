import { initializeSocketHandlers } from './socketService.js';
import * as state from './state.js';
import * as uiManager from './uiManager.js';
import { JOIN_GAME, START_GAME } from '../../src/shared/events.js'; // Use relative path

// Helper to safely get value from input elements
function getInputValue(el: HTMLElement | null): string {
  return el && 'value' in el ? (el as HTMLInputElement).value : '';
}

// Helper to safely set disabled on button elements
function setButtonDisabled(el: HTMLElement | null, disabled: boolean) {
  if (el && 'disabled' in el) (el as HTMLButtonElement).disabled = disabled;
}

export function initializePageEventListeners() {
  state.loadSession();
  // Initialize socket handlers
  initializeSocketHandlers();
  // UI hooks
  const createJoinBtn = uiManager.$('create-join');
  if (createJoinBtn) {
    createJoinBtn.onclick = () => {
      const nameInput = uiManager.getNameInput(); // Get name input directly
      const name = getInputValue(nameInput).trim(); // Get and trim value
      if (!name) {
        // Optionally show an error to the user if name is invalid
        alert('Please enter a valid name.');
        return;
      }
      state.socket.emit(JOIN_GAME, name);
      setButtonDisabled(createJoinBtn, true);
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
      if (rulesModal && typeof (window as any).openModal === 'function') {
        (window as any).openModal(rulesModal);
      }
    };
  }
  document.querySelector('.modal-close-button')?.addEventListener('click', () => {
    if (typeof (window as any).closeModal === 'function') {
      (window as any).closeModal();
    }
  });
  const backToLobbyButton = uiManager.getBackToLobbyButton();
  if (backToLobbyButton) {
    backToLobbyButton.onclick = () => {
      sessionStorage.clear();
      uiManager.showLobbyForm();
    };
  }
  const startGameBtn = document.getElementById('start-game-button');
  if (startGameBtn) {
    startGameBtn.onclick = () => {
      const computerInput = document.getElementById('computer-count');
      const computerCount = parseInt(getInputValue(computerInput), 10) || 0;
      console.log(
        '!!!!!!!!!! CLIENT (events.js): CLICKED start-game-button, ATTEMPTING TO EMIT START_GAME !!!!!!!!!!!',
        { computerCount }
      );
      state.socket.emit(START_GAME, { computerCount });
      setButtonDisabled(startGameBtn, true);
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
    const getDetailsList = () =>
      Array.from(rulesModal.querySelectorAll('details.rules-section')).filter(
        (el): el is HTMLDetailsElement => el instanceof HTMLDetailsElement
      );

    const updateExpandCollapseLabel = () => {
      const detailsList = getDetailsList();
      if (!expandCollapseBtn) {
        console.log('[UpdateLabel] expandCollapseBtn not found, returning.');
        return;
      }

      console.log(`[UpdateLabel] Found ${detailsList.length} details elements.`);
      detailsList.forEach((d, i) => {
        const summaryEl = d.querySelector('summary');
        const summaryText = summaryEl ? summaryEl.textContent?.trim() : 'Summary N/A';
        console.log(`[UpdateLabel] Details[${i}] ("${summaryText}") open: ${d.open}`);
      });

      const allOpen = detailsList.length > 0 && detailsList.every((d) => d.open);
      console.log('[UpdateLabel] Calculated allOpen:', allOpen);

      expandCollapseBtn.textContent = allOpen ? 'Collapse All' : 'Expand All';
      console.log('[UpdateLabel] Button text set to:', expandCollapseBtn.textContent);
    };

    expandCollapseBtn.addEventListener('click', function () {
      const detailsList = getDetailsList();
      console.log(
        '[ExpandCollapse] Button clicked. Current text: %s. Details elements found: %d',
        expandCollapseBtn.textContent,
        detailsList.length
      );

      if (detailsList.length === 0) {
        console.log('[ExpandCollapse] No details elements found. Updating label and returning.');
        updateExpandCollapseLabel(); // Ensure label is correct
        return;
      }

      // Determine the desired state: if button says "Expand All", we want them open.
      const shouldBeOpen = expandCollapseBtn.textContent === 'Expand All';
      console.log(
        '[ExpandCollapse] Action determined from button text. Sections should be open: %s',
        shouldBeOpen
      );

      detailsList.forEach((d, index) => {
        const summaryElement = d.querySelector('summary');
        if (!summaryElement) {
          console.warn('[ExpandCollapse] Details[%d]: No summary found, cannot click.', index);
          return; // Skip this one
        }

        // If the current state is different from the desired state, click the summary
        if (d.open !== shouldBeOpen) {
          const summaryText = summaryElement.textContent?.trim() || 'N/A';
          console.log(
            '[ExpandCollapse] Details[%d] ("%s"): current open: %s, desired open: %s. Clicking summary.',
            index,
            summaryText,
            d.open,
            shouldBeOpen
          );
          summaryElement.click(); // This will trigger the 'toggle' event, which calls updateExpandCollapseLabel
        } else {
          const summaryText = summaryElement.textContent?.trim() || 'N/A';
          console.log(
            '[ExpandCollapse] Details[%d] ("%s"): already in desired state (open: %s). No click needed.',
            index,
            summaryText,
            d.open
          );
        }
      });
      // The 'toggle' event listener on rulesModal (which calls updateExpandCollapseLabel)
      // should handle updating the main button's text after each programmatic click.
      console.log(
        '[ExpandCollapse] Finished iterating and dispatching clicks on summaries where needed.'
      );
    });

    // Update label when modal is shown
    const rulesBtn = document.getElementById('rules-button');
    if (rulesBtn) {
      rulesBtn.addEventListener('click', function () {
        // Ensure the modal is actually visible and details are loaded before updating label
        if (rulesModal && !rulesModal.classList.contains('modal--hidden')) {
          console.log('[RulesButton] Clicked, modal is visible. Updating expand/collapse label.');
          updateExpandCollapseLabel();
        } else {
          console.log('[RulesButton] Clicked, but modal not visible or not found.');
        }
      });
    }

    // Also update label when any individual section is toggled by the user
    rulesModal.addEventListener(
      'toggle',
      (event) => {
        if (
          event.target instanceof HTMLDetailsElement &&
          event.target.classList.contains('rules-section')
        ) {
          console.log(
            '[DetailsToggle] A rules section was toggled by user. Updating expand/collapse label.'
          );
          updateExpandCollapseLabel();
        }
      },
      true
    );

    // Initial label setup when the page loads
    console.log('[InitialSetup] Setting initial expand/collapse label.');
    updateExpandCollapseLabel();
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
      const name = getInputValue(nameInput).trim();
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
        console.debug('[LobbyForm] Blocked submit: not enough humans', { numHumans, numCPUs });
        return;
      }
      if (numHumans + numCPUs < 2) {
        if (playerCountErrorDiv) {
          playerCountErrorDiv.textContent = 'A minimum of 2 total players is required.';
          playerCountErrorDiv.classList.remove('hidden');
        }
        console.debug('[LobbyForm] Blocked submit: not enough total players', {
          numHumans,
          numCPUs,
        });
        return;
      }
      if (numHumans + numCPUs > 4) {
        if (playerCountErrorDiv) {
          playerCountErrorDiv.textContent = 'Total players cannot exceed 4.';
          playerCountErrorDiv.classList.remove('hidden');
        }
        console.debug('[LobbyForm] Blocked submit: too many total players', {
          numHumans,
          numCPUs,
        });
        return;
      }
      if (playerCountErrorDiv) playerCountErrorDiv.classList.add('hidden');
      // --- Emit the JOIN_GAME Event ---
      const playerDataForEmit = {
        name: name,
        numHumans: numHumans,
        numCPUs: numCPUs,
      };
      console.debug('[LobbyForm] Emitting JOIN_GAME', playerDataForEmit);
      console.log('[Client events.ts] Attempting to emit JOIN_GAME with data:', playerDataForEmit);
      state.socket.emit(JOIN_GAME, playerDataForEmit);
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
    const numTotalPlayers = parseInt(getInputValue(totalPlayersInput), 10);
    const numCpuPlayers = parseInt(getInputValue(cpuPlayersInput), 10);
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
    const computerCount = parseInt(getInputValue(computerInput), 10) || 0;
    setButtonDisabled(startGameBtn, !(humanCount > 0 && humanCount + computerCount >= 2));
  }
}
