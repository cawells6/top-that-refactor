import { initializeSocketHandlers } from './socketService.js';
import * as state from './state.js';
import * as uiManager from './uiManager.js';
import { JOIN_GAME } from '../../src/shared/events.js';

// Helper to safely get value from input elements
function getInputValue(el: HTMLElement | null): string {
  return el && 'value' in el ? (el as HTMLInputElement).value : '';
}

// Helper to safely set disabled on button elements
function setButtonDisabled(el: HTMLElement | null, disabled: boolean) {
  if (el && 'disabled' in el) (el as HTMLButtonElement).disabled = disabled;
}

// Create a player silhouette element
function createPlayerSilhouette(type: 'human' | 'cpu', index: number): HTMLElement {
  const silhouette = document.createElement('div');
  silhouette.className = `player-silhouette ${type}`;
  silhouette.setAttribute('data-index', index.toString());

  // Add SVG icon
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  if (type === 'human') {
    path.setAttribute(
      'd',
      'M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5C14.7 6.9 14.1 6.5 13.5 6.5H10.5C9.9 6.5 9.3 6.9 9 7.5L3 7V9L9 8.5V10.5C9 11.6 9.4 12.6 10.1 13.3L9 20H11L11.8 15H12.2L13 20H15L13.9 13.3C14.6 12.6 15 11.6 15 10.5V8.5L21 9Z'
    );
  } else {
    // CPU icon with circuit pattern
    path.setAttribute(
      'd',
      'M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5C14.7 6.9 14.1 6.5 13.5 6.5H10.5C9.9 6.5 9.3 6.9 9 7.5L3 7V9L9 8.5V10.5C9 11.6 9.4 12.6 10.1 13.3L9 20H11L11.8 15H12.2L13 20H15L13.9 13.3C14.6 12.6 15 11.6 15 10.5V8.5L21 9Z'
    );

    // Add CPU indicator circles
    const circle1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle1.setAttribute('cx', '12');
    circle1.setAttribute('cy', '12');
    circle1.setAttribute('r', '1.5');
    circle1.setAttribute('fill', '#137a4b');
    svg.appendChild(circle1);

    const circle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle2.setAttribute('cx', '8');
    circle2.setAttribute('cy', '8');
    circle2.setAttribute('r', '1');
    circle2.setAttribute('fill', '#137a4b');
    svg.appendChild(circle2);

    const circle3 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle3.setAttribute('cx', '16');
    circle3.setAttribute('cy', '8');
    circle3.setAttribute('r', '1');
    circle3.setAttribute('fill', '#137a4b');
    svg.appendChild(circle3);
  }

  svg.appendChild(path);
  silhouette.appendChild(svg);

  return silhouette;
}

// Update player silhouettes based on current counts
function updatePlayerSilhouettes() {
  const totalPlayersInput = document.getElementById('total-players-input') as HTMLInputElement;
  const cpuPlayersInput = document.getElementById('cpu-players-input') as HTMLInputElement;
  const humanSilhouettesContainer = document.getElementById('human-silhouettes');
  const cpuSilhouettesContainer = document.getElementById('cpu-silhouettes');

  if (!humanSilhouettesContainer || !cpuSilhouettesContainer) return;

  const humanCount = parseInt(totalPlayersInput?.value || '1', 10);
  const cpuCount = parseInt(cpuPlayersInput?.value || '0', 10);

  // Update human silhouettes
  updateSilhouettesInContainer(humanSilhouettesContainer, 'human', humanCount);

  // Update CPU silhouettes
  updateSilhouettesInContainer(cpuSilhouettesContainer, 'cpu', cpuCount);
}

// Update silhouettes in a specific container
function updateSilhouettesInContainer(
  container: HTMLElement,
  type: 'human' | 'cpu',
  targetCount: number
) {
  const currentSilhouettes = container.querySelectorAll('.player-silhouette');
  const currentCount = currentSilhouettes.length;

  if (currentCount < targetCount) {
    // Add new silhouettes
    for (let i = currentCount; i < targetCount; i++) {
      const silhouette = createPlayerSilhouette(type, i);
      container.appendChild(silhouette);
    }
  } else if (currentCount > targetCount) {
    // Remove excess silhouettes with animation
    for (let i = currentCount - 1; i >= targetCount; i--) {
      const silhouette = currentSilhouettes[i] as HTMLElement;
      silhouette.classList.add('removing');
      setTimeout(() => {
        if (silhouette.parentNode) {
          silhouette.parentNode.removeChild(silhouette);
        }
      }, 300); // Match animation duration
    }
  }
}

// Initialize counter button functionality
function initializeCounterButtons() {
  const humansMinusBtn = document.getElementById('humans-minus');
  const humansPlusBtn = document.getElementById('humans-plus');
  const cpusMinusBtn = document.getElementById('cpus-minus');
  const cpusPlusBtn = document.getElementById('cpus-plus');
  const totalPlayersInput = document.getElementById('total-players-input') as HTMLInputElement;
  const cpuPlayersInput = document.getElementById('cpu-players-input') as HTMLInputElement;
  const totalCountSpan = document.getElementById('total-count');

  function updateTotalCount() {
    const humans = parseInt(totalPlayersInput?.value || '1', 10);
    const cpus = parseInt(cpuPlayersInput?.value || '1', 10);
    const total = humans + cpus;
    if (totalCountSpan) {
      totalCountSpan.textContent = total.toString();
    }

    // Update button states
    updateButtonStates();
    // Update player silhouettes
    updatePlayerSilhouettes();
  }

  function updateButtonStates() {
    const humans = parseInt(totalPlayersInput?.value || '1', 10);
    const cpus = parseInt(cpuPlayersInput?.value || '1', 10);
    const total = humans + cpus;

    // Human buttons
    if (humansMinusBtn) (humansMinusBtn as HTMLButtonElement).disabled = humans <= 1;
    if (humansPlusBtn) (humansPlusBtn as HTMLButtonElement).disabled = total >= 4;

    // CPU buttons
    if (cpusMinusBtn) (cpusMinusBtn as HTMLButtonElement).disabled = cpus <= 0;
    if (cpusPlusBtn) (cpusPlusBtn as HTMLButtonElement).disabled = total >= 4;
  }

  // Human counter buttons
  if (humansMinusBtn) {
    humansMinusBtn.onclick = () => {
      const current = parseInt(totalPlayersInput?.value || '1', 10);
      if (current > 1) {
        totalPlayersInput.value = (current - 1).toString();
        updateTotalCount();
      }
    };
  }

  if (humansPlusBtn) {
    humansPlusBtn.onclick = () => {
      const current = parseInt(totalPlayersInput?.value || '1', 10);
      const cpus = parseInt(cpuPlayersInput?.value || '1', 10);
      if (current + cpus < 4) {
        totalPlayersInput.value = (current + 1).toString();
        updateTotalCount();
      }
    };
  }

  // CPU counter buttons
  if (cpusMinusBtn) {
    cpusMinusBtn.onclick = () => {
      const current = parseInt(cpuPlayersInput?.value || '1', 10);
      if (current > 0) {
        cpuPlayersInput.value = (current - 1).toString();
        updateTotalCount();
      }
    };
  }

  if (cpusPlusBtn) {
    cpusPlusBtn.onclick = () => {
      const current = parseInt(cpuPlayersInput?.value || '1', 10);
      const humans = parseInt(totalPlayersInput?.value || '1', 10);
      if (current + humans < 4) {
        cpuPlayersInput.value = (current + 1).toString();
        updateTotalCount();
      }
    };
  }

  // Initialize states
  updateTotalCount();

  // Initialize player silhouettes on page load
  updatePlayerSilhouettes();
}

export async function initializePageEventListeners() {
  console.log('🚀 [events.ts] initializePageEventListeners called!');
  
  // Only setup modal buttons now (header buttons removed)
  const setupRulesButton = document.getElementById('setup-rules-button');
  const setupDealButton = document.getElementById('setup-deal-button');
  
  if (setupRulesButton) {
    setupRulesButton.addEventListener('click', handleRulesClick);
    console.log('✅ Setup Rules button handler attached');
  }

  if (setupDealButton) {
    setupDealButton.addEventListener('click', handleDealClick);
    console.log('✅ Setup Deal button handler attached');
  }

  console.log('🔍 Button setup completed, proceeding with rest of initialization...');

  try {
    // Load state after handlers are attached
    state.loadSession();
    console.log('✅ State loaded');
  } catch (stateError) {
    console.error('❌ Error loading state:', stateError);
  }
  
  try {
    // Initialize socket handlers
    initializeSocketHandlers();
    console.log('✅ Socket handlers initialized');
  } catch (socketError) {
    console.error('❌ Error initializing socket handlers:', socketError);
  }

  // UI hooks
  const createJoinBtn = uiManager.$('create-join');
  if (createJoinBtn) {
    createJoinBtn.onclick = () => {
      const nameInput = uiManager.getNameInput();
      const name = getInputValue(nameInput).trim();
      if (!name) {
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

  const backToLobbyButton = uiManager.getBackToLobbyButton();
  if (backToLobbyButton) {
    backToLobbyButton.onclick = () => {
      sessionStorage.clear();
      uiManager.showLobbyForm();
    };
  }

  // === MODAL CLOSE HANDLERS ===
  const rulesModal = document.getElementById('rules-modal');
  const overlay = document.getElementById('modal-overlay');
  
  if (rulesModal && overlay) {
    // Close button in rules modal
    const closeBtn = rulesModal.querySelector('.modal__close-button');
    if (closeBtn) {
      closeBtn.onclick = hideRulesModalAndOverlay;
    }

    // Close modal when clicking overlay
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        hideRulesModalAndOverlay();
      }
    };

    // "Got it!" button in rules modal
    const gotItBtn = document.getElementById('rules-gotit-btn');
    if (gotItBtn) {
      gotItBtn.onclick = hideRulesModalAndOverlay;
    }
  }

  // === RULES MODAL FEATURES ===

  // Expand/Collapse All Rules Sections
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

    // Update label when modal is shown (handled by the main onclick handler above)

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
  const totalPlayersInput = document.getElementById('total-players-input') as HTMLInputElement;
  const cpuPlayersInput = document.getElementById('cpu-players-input') as HTMLInputElement;
  const playerCountErrorDisplay = document.getElementById('player-count-error');
  // Remove the old lobby form submit handler - Deal button now handles game starting
  // const lobbyForm = document.getElementById('lobby-form');
  // if (lobbyForm && nameInput && playerCountErrorDisplay) {
  //   lobbyForm.addEventListener('submit', (e) => {
  //     // ... old submit handler code removed
  //   });
  // }

  // Keep input validation for real-time feedback
  const nameInput = document.getElementById('player-name-input') as HTMLInputElement;
  if (nameInput && playerCountErrorDisplay) {
    nameInput.addEventListener('input', () => {
      playerCountErrorDisplay.classList.add('hidden');
    });
  }

  function validatePlayerCounts() {
    const totalPlayersInput = document.getElementById('total-players-input') as HTMLInputElement;
    const cpuPlayersInput = document.getElementById('cpu-players-input') as HTMLInputElement;
    const playerCountErrorDisplay = document.getElementById('player-count-error');
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

  try {
    // Initialize counter buttons
    initializeCounterButtons();
    console.log('✅ Counter buttons initialized');
  } catch (counterError) {
    console.error('❌ Error initializing counter buttons:', counterError);
  }
}

// —– UI helper functions —–
function updateStartGameButton() {
  // Update to target the setup Deal button instead of header button
  const startGameBtn = document.getElementById('setup-deal-button');
  if (startGameBtn) {
    const totalPlayersInput = document.getElementById('total-players-input') as HTMLInputElement;
    const cpuPlayersInput = document.getElementById('cpu-players-input') as HTMLInputElement;
    const humanCount = parseInt(totalPlayersInput?.value || '1', 10);
    const computerCount = parseInt(cpuPlayersInput?.value || '1', 10);
    setButtonDisabled(startGameBtn, !(humanCount > 0 && humanCount + computerCount >= 2));
  }
}

// Separate handler functions to prevent duplicate listeners
function handleRulesClick() {
  console.log('🎯 Rules button clicked!');
  const rulesModal = document.getElementById('rules-modal');
  const overlay = document.getElementById('modal-overlay');
  
  if (rulesModal && overlay) {
    rulesModal.classList.remove('modal--hidden');
    overlay.classList.remove('modal__overlay--hidden');
    console.log('✅ Rules modal opened');
  } else {
    console.error('❌ Rules modal or overlay not found');
  }
}

function handleDealClick() {
  console.log('🎯 Deal button clicked!');
  
  // Check if we're already in a game room and game is started
  if (state.currentRoom && state.myId) {
    console.log('✅ Already in game room, checking game state...');
    
    // If we're in a room, try to start the game with current lobby settings
    const totalPlayersInput = document.getElementById('total-players-input') as HTMLInputElement;
    const cpuPlayersInput = document.getElementById('cpu-players-input') as HTMLInputElement;
    
    const humanCount = totalPlayersInput ? parseInt(totalPlayersInput.value || '1', 10) : 1;
    const computerCount = cpuPlayersInput ? parseInt(cpuPlayersInput.value || '0', 10) : 0;
    
    console.log(`🎯 Starting game with ${humanCount} human players and ${computerCount} CPU players`);
    state.socket.emit('START_GAME', { computerCount });
    
  } else {
    console.log('✅ Not in game room, need to join/create room first...');
    
    // Validate lobby form first
    const nameInput = document.getElementById('player-name-input') as HTMLInputElement;
    const totalPlayersInput = document.getElementById('total-players-input') as HTMLInputElement;
    const cpuPlayersInput = document.getElementById('cpu-players-input') as HTMLInputElement;
    const playerCountErrorDisplay = document.getElementById('player-count-error');
    
    if (!nameInput || !totalPlayersInput || !cpuPlayersInput || !playerCountErrorDisplay) {
      console.error('❌ Required form elements not found');
      return;
    }
    
    const name = nameInput.value.trim();
    
    // --- Name validation ---
    if (!name) {
      playerCountErrorDisplay.textContent = 'Name is required';
      playerCountErrorDisplay.classList.remove('hidden');
      nameInput.focus();
      return;
    }
    if (name.length < 2) {
      playerCountErrorDisplay.textContent = 'Name must be at least 2 characters';
      playerCountErrorDisplay.classList.remove('hidden');
      nameInput.focus();
      return;
    }
    
    // --- Get player counts ---
    const numHumans = parseInt(totalPlayersInput.value, 10) || 1;
    const numCPUs = parseInt(cpuPlayersInput.value, 10) || 0;
    
    // --- Validate player counts ---
    if (numHumans < 1) {
      playerCountErrorDisplay.textContent = 'At least one human player is required.';
      playerCountErrorDisplay.classList.remove('hidden');
      return;
    }
    if (numHumans + numCPUs < 2) {
      playerCountErrorDisplay.textContent = 'A minimum of 2 total players is required.';
      playerCountErrorDisplay.classList.remove('hidden');
      return;
    }
    if (numHumans + numCPUs > 4) {
      playerCountErrorDisplay.textContent = 'Total players cannot exceed 4.';
      playerCountErrorDisplay.classList.remove('hidden');
      return;
    }
    
    // Clear any previous errors
    playerCountErrorDisplay.classList.add('hidden');
    
    // --- Join game with player setup ---
    const playerDataForEmit = {
      name: name,
      numHumans: numHumans,
      numCPUs: numCPUs,
    };
    
    console.log('🎯 Deal button: Joining game with data:', playerDataForEmit);
    state.socket.emit(JOIN_GAME, playerDataForEmit);
    
    // Disable the Deal button temporarily to prevent multiple clicks
    const dealButton = document.getElementById('setup-deal-button') as HTMLButtonElement;
    if (dealButton) {
      dealButton.disabled = true;
      dealButton.textContent = 'Starting...';
      
      // Re-enable after a delay (will be overridden by game state updates)
      setTimeout(() => {
        if (dealButton) {
          dealButton.disabled = false;
          dealButton.textContent = 'Deal';
        }
      }, 3000);
    }
  }
  
  console.log('✅ Deal button action completed');
}

// Failsafe: Always hide overlay when hiding rules modal
function hideRulesModalAndOverlay() {
  const rulesModal = document.getElementById('rules-modal');
  const overlay = document.getElementById('modal-overlay');
  if (rulesModal) rulesModal.classList.add('modal--hidden');
  if (overlay) overlay.classList.add('modal__overlay--hidden');
  console.log('✅ Rules modal closed');
}
