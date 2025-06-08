import { initializeSocketHandlers } from './socketService.js';
import * as state from './state.js';
import * as uiManager from './uiManager.js';
import { JOIN_GAME, START_GAME } from '../../src/shared/events.js';

// --- Message Queue Logic for Single Error Display ---
let messageQueue: string[] = [];
let isDisplayingMessage = false;
let messageTimeoutId: number | null = null;

const LOBBY_MESSAGE_CONTAINER_ID = 'lobby-validation-message';
const MESSAGE_DISPLAY_DURATION = 2000; // 2 seconds

function displayNextMessage() {
  if (messageTimeoutId) {
    clearTimeout(messageTimeoutId);
    messageTimeoutId = null;
  }

  const outerContainer = document.getElementById(LOBBY_MESSAGE_CONTAINER_ID);
  if (!outerContainer) return;
  const innerMessageBox = outerContainer.querySelector(
    '.message-box-content'
  ) as HTMLElement | null;
  const messageParagraph = outerContainer.querySelector('p');

  if (!innerMessageBox || !messageParagraph) return;

  if (messageQueue.length > 0) {
    isDisplayingMessage = true;
    const messageText = messageQueue.shift(); // Get the next message
    messageParagraph.textContent = messageText || '';
    innerMessageBox.classList.add('active');

    messageTimeoutId = window.setTimeout(() => {
      // If this was the last message, hide the box, otherwise show next
      if (messageQueue.length === 0) {
        innerMessageBox.classList.remove('active');
        isDisplayingMessage = false;
      } else {
        // Briefly hide before showing next for a "blink" effect
        innerMessageBox.classList.remove('active');
        setTimeout(() => displayNextMessage(), 100); // Short delay for blink
      }
    }, MESSAGE_DISPLAY_DURATION);
  } else {
    innerMessageBox.classList.remove('active');
    isDisplayingMessage = false;
  }
}

function queueMessage(message: string) {
  if (!message) return;
  messageQueue.push(message);
  if (!isDisplayingMessage) {
    displayNextMessage();
  }
}

function removeNameErrorsFromQueue() {
  // Remove any name-related error messages from the queue
  const nameErrorKeywords = ['name', 'Name'];
  messageQueue = messageQueue.filter(
    (msg) => !nameErrorKeywords.some((keyword) => msg.includes(keyword))
  );
}

function hasNameErrorInQueue(): boolean {
  const nameErrorKeywords = ['name', 'Name'];
  return messageQueue.some((msg) => nameErrorKeywords.some((keyword) => msg.includes(keyword)));
}

function isCurrentlyShowingNameError(): boolean {
  if (!isDisplayingMessage) return false;

  const outerContainer = document.getElementById(LOBBY_MESSAGE_CONTAINER_ID);
  if (!outerContainer) return false;

  const messageParagraph = outerContainer.querySelector('p');
  if (!messageParagraph) return false;

  const currentText = messageParagraph.textContent || '';
  const nameErrorKeywords = ['name', 'Name'];
  return nameErrorKeywords.some((keyword) => currentText.includes(keyword));
}

function clearMessageQueueAndHide() {
  messageQueue = [];
  if (messageTimeoutId) {
    clearTimeout(messageTimeoutId);
    messageTimeoutId = null;
  }
  const outerContainer = document.getElementById(LOBBY_MESSAGE_CONTAINER_ID);
  if (!outerContainer) return;
  const innerMessageBox = outerContainer.querySelector(
    '.message-box-content'
  ) as HTMLElement | null;
  if (innerMessageBox) {
    innerMessageBox.classList.remove('active');
  }
  isDisplayingMessage = false;
}

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
  // Intentionally set alt to empty if you only want emoji on error,
  // or set proper alt text for accessibility and ensure it's visually hidden if image loads.
  img.alt = ''; // Prevents alt text from showing if image is slow to load but not erroring

  if (type === 'human') {
    img.src = '/assets/Player.svg';
    img.className = 'user-icon'; // For specific styling if needed
  } else {
    // 'cpu'
    img.src = '/assets/robot.svg'; // Fixed capitalization to match actual file name
    img.className = 'robot-icon'; // For specific styling if needed
  }

  const emojiFallback = document.createElement('span');
  emojiFallback.className = 'silhouette-emoji-fallback';
  emojiFallback.textContent = type === 'cpu' ? '🤖' : '🙂';
  emojiFallback.style.display = 'none'; // Initially hidden

  img.onload = function () {
    // Image loaded successfully, ensure emoji is hidden and image is shown
    img.style.display = '';
    emojiFallback.style.display = 'none';
  };

  img.onerror = function () {
    // Image failed to load, hide img tag and show emoji
    img.style.display = 'none'; // Hide the broken image element
    emojiFallback.style.display = ''; // Show the emoji
  };

  silhouette.appendChild(img);
  silhouette.appendChild(emojiFallback); // Add emoji fallback to the DOM but hidden
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

// Validation functions that only check, don't show messages
function validatePlayerCounts(): { isValid: boolean; message: string } {
  const totalPlayersInput = document.getElementById('total-players-input') as HTMLInputElement;
  const cpuPlayersInput = document.getElementById('cpu-players-input') as HTMLInputElement;

  if (!totalPlayersInput || !cpuPlayersInput) {
    return { isValid: false, message: 'Form inputs not found.' };
  }

  const numHumans = parseInt(totalPlayersInput.value || '1', 10);
  const numCPUs = parseInt(cpuPlayersInput.value || '0', 10);
  const totalPlayers = numHumans + numCPUs;

  if (totalPlayers < 2) {
    return { isValid: false, message: 'Minimum of 2 participants are required.' };
  }
  if (totalPlayers > 4) {
    return { isValid: false, message: 'Maximum of 4 players are allowed.' };
  }
  return { isValid: true, message: '' };
}

function validateNameInput(): { isValid: boolean; message: string; name: string } {
  const nameInput = uiManager.getNameInput();
  if (!nameInput) {
    return { isValid: false, message: 'Name input not found.', name: '' };
  }
  const name = nameInput.value.trim();
  if (!name) {
    return { isValid: false, message: 'Please enter a valid name.', name };
  }
  if (name.length < 2) {
    return { isValid: false, message: 'Name must be at least 2 characters.', name };
  }
  return { isValid: true, message: '', name };
}

// Helper function to update the contextual player requirement message
function updatePlayerRequirementMessage() {
  // This function is no longer needed since we're using the queue system
  // All validation messages are now shown only when Deal button is clicked
  // Keeping function for compatibility but it does nothing
}

// Helper function to update the contextual name validation message
function updateNameValidationMessage(_message: string = '', _showDefault: boolean = false) {
  // This function is no longer needed since we're using the queue system
  // All validation messages are now shown only when Deal button is clicked
  // Keeping function for compatibility but it does nothing
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
        return;
      }
      if (name.length < 2) {
        nameInput.focus();
        return;
      }
      const payload = state.currentRoom ? { name, id: state.currentRoom } : { name };
      state.socket.emit(JOIN_GAME, payload);
      setButtonDisabled(createJoinBtn, true);
    };
  }

  const copyLinkBtn = uiManager.getCopyLinkBtn();
  if (copyLinkBtn) {
    copyLinkBtn.onclick = () => {
      const inviteInput = document.getElementById('invite-link') as HTMLInputElement | null;
      const linkToCopy = inviteInput ? inviteInput.value : window.location.href;
      navigator.clipboard.writeText(linkToCopy);
    };
  }

  const startGameLobbyBtn = document.getElementById('start-game-button');
  if (startGameLobbyBtn) {
    startGameLobbyBtn.onclick = () => {
      const cpuCount = state.getDesiredCpuCount();
      state.socket.emit(START_GAME, { computerCount: cpuCount });
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

  // Initialize the validation message queue system - hide any messages on page load
  clearMessageQueueAndHide();

  // Add real-time validation for the name input field
  const nameInput = uiManager.getNameInput();
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const nameValidation = validateNameInput();

      if (nameValidation.isValid) {
        // Name is now valid - remove any name errors from queue and hide if currently showing
        if (hasNameErrorInQueue() || isCurrentlyShowingNameError()) {
          removeNameErrorsFromQueue();

          // If currently showing a name error, either hide it or show next message
          if (isCurrentlyShowingNameError()) {
            if (messageQueue.length > 0) {
              // Skip to next message in queue
              if (messageTimeoutId) {
                clearTimeout(messageTimeoutId);
                messageTimeoutId = null;
              }
              displayNextMessage();
            } else {
              // No more messages, hide the display
              clearMessageQueueAndHide();
            }
          }
        }
      }
      // Removed the else block - don't show errors during typing
      // Errors will only be shown when "Let's Play" button is clicked
    });
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
  const lobbyContainer = document.getElementById('lobby-container');

  if (rulesModal && overlay) {
    // Hide the lobby container when showing the rules modal
    if (lobbyContainer) {
      lobbyContainer.style.display = 'none';
    }

    rulesModal.classList.remove('modal--hidden');
    overlay.classList.remove('modal__overlay--hidden');

    // Trigger card image updates by dispatching a custom event
    setTimeout(() => {
      try {
        // Dispatch a custom event that rules-cards.ts will listen for
        const cardUpdateEvent = new CustomEvent('update-rule-cards');
        document.dispatchEvent(cardUpdateEvent);
      } catch (e) {
        console.error('Failed to dispatch card update event:', e);
      }
    }, 100);

    console.log('✅ Rules modal opened, lobby hidden');
  } else {
    console.error('❌ Rules modal or overlay not found');
  }
}

function handleDealClick() {
  console.log('🎯 Deal button clicked!');
  clearMessageQueueAndHide(); // Clear any old messages first

  const nameValidation = validateNameInput();
  const playerCountValidation = validatePlayerCounts();

  let allValid = true;

  if (!nameValidation.isValid) {
    queueMessage(nameValidation.message);
    allValid = false;
  }
  if (!playerCountValidation.isValid) {
    queueMessage(playerCountValidation.message);
    allValid = false;
  }

  if (!allValid) {
    if (!nameValidation.isValid) {
      const nameInput = uiManager.getNameInput();
      if (nameInput) nameInput.focus();
    }
    return; // Stop processing if there are errors
  }

  // --- If all validations pass, proceed with game logic ---
  const name = nameValidation.name;
  const totalPlayersInput = document.getElementById('total-players-input') as HTMLInputElement;
  const cpuPlayersInput = document.getElementById('cpu-players-input') as HTMLInputElement;
  const numHumans = parseInt(totalPlayersInput.value, 10) || 1;
  const numCPUs = parseInt(cpuPlayersInput.value, 10) || 0;

  state.setDesiredCpuCount(numCPUs);

  const currentRoom = state.currentRoom;

  const playerDataForEmit = {
    name: name,
    numHumans: numHumans,
    numCPUs: numCPUs,
    ...(currentRoom ? { id: currentRoom } : {}),
  };

  console.log('🎯 Deal button: Validations passed. Joining game with data:', playerDataForEmit);
  state.saveSession();
  state.socket.emit(JOIN_GAME, playerDataForEmit);

  const dealButton = document.getElementById('setup-deal-button') as HTMLButtonElement;
  if (dealButton) {
    dealButton.disabled = true;
    dealButton.textContent = 'Starting...';
    setTimeout(() => {
      if (dealButton) {
        dealButton.disabled = false;
        dealButton.textContent = "Let's Play";
      }
    }, 3000);
  }
}

// Failsafe: Always hide overlay when hiding rules modal
function hideRulesModalAndOverlay() {
  const rulesModal = document.getElementById('rules-modal');
  const overlay = document.getElementById('modal-overlay');
  const lobbyContainer = document.getElementById('lobby-container');

  if (rulesModal) rulesModal.classList.add('modal--hidden');
  if (overlay) overlay.classList.add('modal__overlay--hidden');

  // Show the lobby container again when hiding the rules modal
  if (lobbyContainer) {
    lobbyContainer.style.display = ''; // Resets to default display value
  }

  console.log('✅ Rules modal closed, lobby restored');
}

export { handleRulesClick, hideRulesModalAndOverlay };
