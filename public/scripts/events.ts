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

  const img = document.createElement('img');

  // Optimized sizing for consistent layout
  img.width = 64;
  img.height = 64;
  img.style.width = '64px';
  img.style.height = '64px';
  img.style.minWidth = '64px';
  img.style.minHeight = '64px';
  img.style.maxWidth = '64px';
  img.style.maxHeight = '64px';
  img.style.objectFit = 'contain';

  if (type === 'human') {
    img.src = '/assets/Player.svg';
    img.alt = 'User Icon';
    img.className = 'user-icon';
  } else if (type === 'cpu') {
    img.src = '/assets/ROBOT.svg';
    img.alt = 'Bot Icon';
    img.className = 'robot-icon';
  } else {
    img.alt = 'Player Icon';
  }

  img.onerror = function () {
    img.style.display = 'none';
    silhouette.textContent = type === 'cpu' ? '🤖' : '🙂';
  };

  silhouette.appendChild(img);
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

// Helper function to update the contextual player requirement message
function updatePlayerRequirementMessage() {
  const totalPlayersInput = document.getElementById('total-players-input') as HTMLInputElement;
  const cpuPlayersInput = document.getElementById('cpu-players-input') as HTMLInputElement;
  const playerRequirementMessage = document.getElementById('player-requirement-message');

  if (!totalPlayersInput || !cpuPlayersInput || !playerRequirementMessage) {
    return;
  }

  const numHumans = parseInt(totalPlayersInput.value || '1', 10);
  const numCPUs = parseInt(cpuPlayersInput.value || '0', 10);
  const totalPlayers = numHumans + numCPUs;

  // Show message only when player count is invalid
  if (totalPlayers < 2) {
    playerRequirementMessage.classList.remove('hidden');
    const messageText = playerRequirementMessage.querySelector('p');
    if (messageText) {
      messageText.textContent = 'A minimum of 2 players are required.';
    }
  } else if (totalPlayers > 4) {
    playerRequirementMessage.classList.remove('hidden');
    const messageText = playerRequirementMessage.querySelector('p');
    if (messageText) {
      messageText.textContent = 'A maximum of 4 players are allowed.';
    }
  } else {
    // Hide message when player count is valid (2-4 players)
    playerRequirementMessage.classList.add('hidden');
  }
}

// Helper function to update the contextual name validation message
function updateNameValidationMessage(message: string = '', showDefault: boolean = false) {
  const nameValidationMessage = document.getElementById('name-validation-message');

  if (!nameValidationMessage) {
    return;
  }

  // Use the same green style as the player requirement message
  const greenBg = '#d4edda';
  const greenBorder = '#137a4b';
  const greenText = '#2d5a3d';

  // Find the inner box and <p>
  const box = nameValidationMessage.querySelector('div');
  const messageText = nameValidationMessage.querySelector('p');

  if (message) {
    nameValidationMessage.classList.remove('hidden');
    if (box) {
      box.setAttribute(
        'style',
        'padding: 1rem; background-color: ' +
          greenBg +
          '; border: 2px solid ' +
          greenBorder +
          '; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); width: 280px; text-align: center;'
      );
    }
    if (messageText) {
      messageText.setAttribute(
        'style',
        'margin: 0; font-weight: 700; font-size: 1.1rem; line-height: 1.2; color: ' +
          greenText +
          ';'
      );
      messageText.textContent = message;
    }
  } else if (showDefault) {
    nameValidationMessage.classList.remove('hidden');
    if (box) {
      box.setAttribute(
        'style',
        'padding: 1rem; background-color: ' +
          greenBg +
          '; border: 2px solid ' +
          greenBorder +
          '; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); width: 280px; text-align: center;'
      );
    }
    if (messageText) {
      messageText.setAttribute(
        'style',
        'margin: 0; font-weight: 700; font-size: 1.1rem; line-height: 1.2; color: ' +
          greenText +
          ';'
      );
      messageText.textContent = 'Please enter your name to start.';
    }
  } else {
    nameValidationMessage.classList.add('hidden');
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
    const cpus = parseInt(cpuPlayersInput?.value || '0', 10);
    const total = humans + cpus;
    if (totalCountSpan) {
      totalCountSpan.textContent = total.toString();
    }

    // Update button states
    updateButtonStates();
    // Update player silhouettes
    updatePlayerSilhouettes();
    // Update player requirement message
    updatePlayerRequirementMessage();
  }

  function updateButtonStates() {
    const humans = parseInt(totalPlayersInput?.value || '1', 10);
    const cpus = parseInt(cpuPlayersInput?.value || '0', 10);
    const total = humans + cpus;

    console.log('🔧 [updateButtonStates] humans:', humans, 'cpus:', cpus, 'total:', total);

    // Update max attributes for inputs dynamically
    if (totalPlayersInput) {
      totalPlayersInput.max = (4 - cpus).toString(); // Max humans = 4 - current CPUs
    }
    if (cpuPlayersInput) {
      cpuPlayersInput.max = (4 - humans).toString(); // Max CPUs = 4 - current humans
      console.log('🔧 Updated CPU input max to:', cpuPlayersInput.max);
    }

    // Human buttons
    if (humansMinusBtn) {
      const shouldDisable = humans <= 1;
      (humansMinusBtn as HTMLButtonElement).disabled = shouldDisable;
      console.log('🔧 Human minus button disabled:', shouldDisable);
    }
    if (humansPlusBtn) {
      const shouldDisable = total >= 4;
      (humansPlusBtn as HTMLButtonElement).disabled = shouldDisable;
      console.log('🔧 Human plus button disabled:', shouldDisable);
    }

    // CPU buttons
    if (cpusMinusBtn) {
      const shouldDisable = cpus <= 0;
      (cpusMinusBtn as HTMLButtonElement).disabled = shouldDisable;
      console.log('🔧 CPU minus button disabled:', shouldDisable);
    }
    if (cpusPlusBtn) {
      const shouldDisable = total >= 4;
      (cpusPlusBtn as HTMLButtonElement).disabled = shouldDisable;
      console.log('🔧 CPU plus button disabled:', shouldDisable, '(total >= 4)');
    }
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
      const cpus = parseInt(cpuPlayersInput?.value || '0', 10);
      if (current + cpus < 4) {
        totalPlayersInput.value = (current + 1).toString();
        updateTotalCount();
      }
    };
  }

  // CPU counter buttons
  if (cpusMinusBtn) {
    console.log('✅ CPU minus button found and handler attached');
    cpusMinusBtn.onclick = () => {
      console.log('🤖 CPU minus button clicked');
      const current = parseInt(cpuPlayersInput?.value || '0', 10);
      console.log('🤖 Current CPU count:', current);
      if (current > 0) {
        cpuPlayersInput.value = (current - 1).toString();
        console.log('🤖 CPU count decreased to:', cpuPlayersInput.value);
        updateTotalCount();
      } else {
        console.log('🤖 Cannot decrease CPU count - already at minimum (0)');
      }
    };
  } else {
    console.error('❌ CPU minus button not found!');
  }

  if (cpusPlusBtn) {
    console.log('✅ CPU plus button found and handler attached');
    cpusPlusBtn.onclick = () => {
      console.log('🤖 CPU plus button clicked');
      const current = parseInt(cpuPlayersInput?.value || '0', 10);
      const humans = parseInt(totalPlayersInput?.value || '1', 10);
      const total = current + humans;
      console.log('🤖 Current CPU count:', current);
      console.log('🤖 Current human count:', humans);
      console.log('🤖 Total players would be:', total);

      if (current + humans < 4) {
        cpuPlayersInput.value = (current + 1).toString();
        console.log('🤖 CPU count increased to:', cpuPlayersInput.value);
        updateTotalCount();
      } else {
        console.log('🤖 Cannot add CPU - would exceed maximum of 4 players');
      }
    };
  } else {
    console.error('❌ CPU plus button not found!');
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
      if (!nameInput) {
        console.error('❌ Name input element not found');
        return;
      }
      const name = getInputValue(nameInput).trim();
      if (!name) {
        nameInput.focus();
        updateNameValidationMessage('Please enter a valid name.');
        return;
      }
      if (name.length < 2) {
        nameInput.focus();
        updateNameValidationMessage('Name must be at least 2 characters.');
        return;
      }
      // Clear any name validation message if name is valid
      updateNameValidationMessage();
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
    const closeBtn = rulesModal.querySelector('.modal__close-button') as HTMLButtonElement;
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
  // Lobby form validation and error handling
  const totalPlayersInput = document.getElementById('total-players-input') as HTMLInputElement;
  const cpuPlayersInput = document.getElementById('cpu-players-input') as HTMLInputElement;

  // Initialize input event listeners for real-time player count validation
  if (totalPlayersInput) {
    totalPlayersInput.addEventListener('input', () => {
      updatePlayerRequirementMessage();
    });
  }
  if (cpuPlayersInput) {
    cpuPlayersInput.addEventListener('input', () => {
      updatePlayerRequirementMessage();
    });
  }

  try {
    // Initialize counter buttons
    initializeCounterButtons();
    console.log('✅ Counter buttons initialized');
  } catch (counterError) {
    console.error('❌ Error initializing counter buttons:', counterError);
  }

  // Initialize player requirement message on page load
  updatePlayerRequirementMessage();

  // Do not show name validation message on page load
  updateNameValidationMessage();
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

    console.log(
      `🎯 Starting game with ${humanCount} human players and ${computerCount} CPU players`
    );
    state.socket.emit('START_GAME', { computerCount });
  } else {
    console.log('✅ Not in game room, need to join/create room first...');

    // Validate lobby form first
    const totalPlayersInput = document.getElementById('total-players-input') as HTMLInputElement;
    const cpuPlayersInput = document.getElementById('cpu-players-input') as HTMLInputElement;

    if (!totalPlayersInput || !cpuPlayersInput) {
      console.error('❌ Required form elements not found');
      return;
    }

    // --- Get player counts ---
    const numHumans = parseInt(totalPlayersInput.value, 10) || 1;
    const numCPUs = parseInt(cpuPlayersInput.value, 10) || 0;

    // --- Validate player counts using our contextual message system ---
    if (numHumans < 1) {
      alert('At least one human player is required.');
      return;
    }
    if (numHumans + numCPUs < 2 || numHumans + numCPUs > 4) {
      // The contextual message should already be showing, just prevent the action
      return;
    }

    // --- Join game with player setup ---
    const playerDataForEmit = {
      name: 'Player', // Use a default name for now
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
