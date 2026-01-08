import * as state from './state.js';
import * as uiManager from './uiManager.js';
import {
  JOIN_GAME,
  JOINED,
  LOBBY_STATE_UPDATE,
  START_GAME,
} from '../../src/shared/events.js';
import type { AvatarItem } from '../../src/shared/avatars.js';

// --- Avatar State Management ---
let royaltyAvatars: AvatarItem[] = [];
let selectedAvatar: AvatarItem | null = null;
let defaultAvatar: AvatarItem | null = null;

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
  return messageQueue.some((msg) =>
    nameErrorKeywords.some((keyword) => msg.includes(keyword))
  );
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

// Helper to safely set disabled on button elements
function setButtonDisabled(el: HTMLElement | null, disabled: boolean) {
  if (el && 'disabled' in el) (el as HTMLButtonElement).disabled = disabled;
}

// Create a player silhouette element
function createPlayerSilhouette(
  type: 'human' | 'cpu',
  avatarIcon: string
): HTMLElement {
  const silhouette = document.createElement('div');
  silhouette.className = `player-silhouette ${type}`;

  const avatarSpan = document.createElement('span');
  avatarSpan.className = 'lobby-avatar-emoji';
  avatarSpan.textContent = avatarIcon;
  silhouette.appendChild(avatarSpan);

  return silhouette;
}


// Update player silhouettes based on current counts
function updatePlayerSilhouettes() {
  const totalPlayersInput = document.getElementById(
    'total-players-input'
  ) as HTMLInputElement;
  const cpuPlayersInput = document.getElementById(
    'cpu-players-input'
  ) as HTMLInputElement;
  const humanSilhouettesContainer =
    document.getElementById('human-silhouettes');
  const cpuSilhouettesContainer = document.getElementById('cpu-silhouettes');

  if (
    !humanSilhouettesContainer ||
    !cpuSilhouettesContainer ||
    !totalPlayersInput ||
    !cpuPlayersInput
  ) {
    return;
  }

  const humanCount = parseInt(totalPlayersInput.value, 10) || 0;
  const cpuCount = parseInt(cpuPlayersInput.value, 10) || 0;

  // --- Human Silhouettes ---
  updateSilhouettesInContainer(
    humanSilhouettesContainer,
    'human',
    humanCount,
    selectedAvatar?.icon || defaultAvatar?.icon || '🤴'
  );

  // --- CPU Silhouettes ---
  // Filter out the currently selected avatar to avoid duplicates
  const availableBotAvatars = royaltyAvatars.filter(
    (av) => av.id !== selectedAvatar?.id
  );

  updateSilhouettesInContainer(
    cpuSilhouettesContainer,
    'cpu',
    cpuCount,
    null, // Pass null to use the list
    availableBotAvatars
  );
}


function syncCounterUI() {
  const humansMinusBtn = document.getElementById('humans-minus');
  const humansPlusBtn = document.getElementById('humans-plus');
  const cpusMinusBtn = document.getElementById('cpus-minus');
  const cpusPlusBtn = document.getElementById('cpus-plus');
  const totalPlayersInput = document.getElementById(
    'total-players-input'
  ) as HTMLInputElement | null;
  const cpuPlayersInput = document.getElementById(
    'cpu-players-input'
  ) as HTMLInputElement | null;
  const totalCountSpan = document.getElementById('total-count');

  if (!totalPlayersInput || !cpuPlayersInput) return;

  ensureSilhouetteContainers();
  const humans = parseInt(totalPlayersInput.value || '1', 10);
  const cpus = parseInt(cpuPlayersInput.value || '0', 10);
  const total = humans + cpus;
  const minHumans = state.getIsSpectator() ? 0 : 1;

  if (totalCountSpan) {
    totalCountSpan.textContent = total.toString();
  }

  updatePlayerSilhouettes();
  updateStartGameButton();
}

// Update silhouettes in a specific container
function updateSilhouettesInContainer(
  container: HTMLElement,
  type: 'human' | 'cpu',
  targetCount: number,
  icon: string | null,
  iconList: AvatarItem[] = []
) {
  // Clear the container before re-rendering
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (targetCount === 0) return;

  // If a specific icon is provided (for humans), use it
  if (icon) {
    for (let i = 0; i < targetCount; i++) {
      const silhouette = createPlayerSilhouette(type, icon);
      container.appendChild(silhouette);
    }
  }
  // Otherwise, use the list of icons (for CPUs)
  else if (iconList.length > 0) {
    for (let i = 0; i < targetCount; i++) {
      // Cycle through the provided list of avatars
      const avatar = iconList[i % iconList.length];
      const silhouette = createPlayerSilhouette(type, avatar.icon);
      container.appendChild(silhouette);
    }
  }
  // Fallback for CPUs if list is somehow empty
  else if (type === 'cpu') {
    for (let i = 0; i < targetCount; i++) {
      const silhouette = createPlayerSilhouette(type, '💂');
      container.appendChild(silhouette);
    }
  }
}


// Validation functions that only check, don't show messages
function validatePlayerCounts(): { isValid: boolean; message: string } {
  const totalPlayersInput = document.getElementById(
    'total-players-input'
  ) as HTMLInputElement;
  const cpuPlayersInput = document.getElementById(
    'cpu-players-input'
  ) as HTMLInputElement;

  if (!totalPlayersInput || !cpuPlayersInput) {
    return { isValid: false, message: 'Form inputs not found.' };
  }

  const numHumans = parseInt(totalPlayersInput.value || '1', 10);
  const numCPUs = parseInt(cpuPlayersInput.value || '0', 10);
  const totalPlayers = numHumans + numCPUs;
  const minHumans = state.getIsSpectator() ? 0 : 1;

  if (totalPlayers < 2) {
    return {
      isValid: false,
      message: 'Minimum of 2 participants are required.',
    };
  }
  if (numHumans < minHumans) {
    return {
      isValid: false,
      message: 'At least 1 human is required.',
    };
  }
  if (totalPlayers > 4) {
    return { isValid: false, message: 'Maximum of 4 players are allowed.' };
  }
  return { isValid: true, message: '' };
}

interface NameValidationResult {
  isValid: boolean;
  message: string;
  name: string;
}

function validateNameInput(): NameValidationResult {
  const nameInput = uiManager.getNameInput();
  if (!nameInput) {
    return { isValid: false, message: 'Name input not found.', name: '' };
  }
  const name = nameInput.value.trim();
  if (!name) {
    if (state.getIsSpectator()) {
      return { isValid: true, message: '', name: 'Spectator' };
    }
    return { isValid: false, message: 'Please enter a valid name.', name };
  }
  if (name.length < 2) {
    return {
      isValid: false,
      message: 'Name must be at least 2 characters.',
      name,
    };
  }
  return { isValid: true, message: '', name };
}

function ensureSilhouetteContainers() {
  let humanSilhouettesContainer = document.getElementById('human-silhouettes');
  let cpuSilhouettesContainer = document.getElementById('cpu-silhouettes');
  if (!humanSilhouettesContainer) {
    const parent = document.querySelector('.player-section--users');
    if (parent) {
      const div = document.createElement('div');
      div.id = 'human-silhouettes';
      div.className = 'player-silhouettes';
      parent.appendChild(div);
      console.debug('[Lobby] Created human-silhouettes container');
    }
  }
  if (!cpuSilhouettesContainer) {
    const parent = document.querySelector('.player-section--bots');
    if (parent) {
      const div = document.createElement('div');
      div.id = 'cpu-silhouettes';
      div.className = 'player-silhouettes';
      parent.appendChild(div);
      console.debug('[Lobby] Created cpu-silhouettes container');
    }
  }
}

function validateRoomCodeInput(): {
  isValid: boolean;
  message: string;
  code: string;
} {
  const codeInput = document.getElementById(
    'join-code-input'
  ) as HTMLInputElement | null;
  if (!codeInput) {
    return { isValid: false, message: 'Game code input not found.', code: '' };
  }
  const code = codeInput.value.trim().toUpperCase();
  if (code.length !== 6) {
    return { isValid: false, message: 'Enter a valid 6 character code.', code };
  }
  return { isValid: true, message: '', code };
}

// Helper function to update the contextual player requirement message
function updatePlayerRequirementMessage() {
  // This function is no longer needed since we're using the queue system
  // All validation messages are now shown only when Deal button is clicked
  // Keeping function for compatibility but it does nothing
}

// Helper function to update the contextual name validation message
function updateNameValidationMessage(
  _message: string = '',
  _showDefault: boolean = false
) {
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
  const totalPlayersInput = document.getElementById(
    'total-players-input'
  ) as HTMLInputElement;
  const cpuPlayersInput = document.getElementById(
    'cpu-players-input'
  ) as HTMLInputElement;

  function updateTotalCount() {
    syncCounterUI();
    updatePlayerRequirementMessage();
  }

  // Human counter buttons
  if (humansMinusBtn) {
    humansMinusBtn.onclick = () => {
      const current = parseInt(totalPlayersInput?.value || '1', 10);
      const minHumans = state.getIsSpectator() ? 0 : 1;
      if (current > minHumans) {
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
    cpusMinusBtn.onclick = () => {
      const current = parseInt(cpuPlayersInput?.value || '0', 10);
      if (current > 0) {
        cpuPlayersInput.value = (current - 1).toString();
        updateTotalCount();
      }
    };
  }

  if (cpusPlusBtn) {
    cpusPlusBtn.onclick = () => {
      const current = parseInt(cpuPlayersInput?.value || '0', 10);
      const humans = parseInt(totalPlayersInput?.value || '1', 10);

      if (current + humans < 4) {
        cpuPlayersInput.value = (current + 1).toString();
        updateTotalCount();
      }
    };
  }

  // Initialize states
  updateTotalCount();
}

function applySpectatorMode(): void {
  if (!state.getIsSpectator()) {
    return;
  }
  document.body.classList.add('spectator-mode');
  const nameInput = document.getElementById(
    'player-name-input'
  ) as HTMLInputElement | null;
  if (nameInput) {
    nameInput.value = 'Spectator';
    nameInput.disabled = true;
  }
  const totalPlayersInput = document.getElementById(
    'total-players-input'
  ) as HTMLInputElement | null;
  if (totalPlayersInput) {
    totalPlayersInput.value = '0';
  }
  const startBtn = document.getElementById(
    'setup-deal-button'
  ) as HTMLButtonElement | null;
  if (startBtn) {
    startBtn.textContent = 'START CPU MATCH';
  }
  syncCounterUI();
}

// Initialize the Avatar Picker
function initializeAvatarPicker() {
  const grid = document.getElementById('avatar-grid');
  if (!grid) return;

  grid.innerHTML = ''; // Clear existing options

  royaltyAvatars.forEach((av) => {
    const el = document.createElement('div');
    el.className = 'avatar-option';
    el.textContent = av.icon;
    el.title = av.label;

    // Set initial selected state
    if (selectedAvatar && selectedAvatar.id === av.id) {
      el.classList.add('selected');
    }

    el.onclick = () => {
      // Update state
      selectedAvatar = av;

      // Update UI
      grid
        .querySelectorAll('.avatar-option')
        .forEach((opt) => opt.classList.remove('selected'));
      el.classList.add('selected');

      // Re-render silhouettes with the new avatar
      updatePlayerSilhouettes();
    };
    grid.appendChild(el);
  });
}

/**
 * Main entry point for initializing the lobby.
 * Pre-loads avatar data and then sets up all event listeners.
 */
export async function initializeLobby() {
  console.log('🚀 [events.ts] Initializing lobby...');
  try {
    const avatarModule = await import('../../src/shared/avatars.js');
    royaltyAvatars = avatarModule.ROYALTY_AVATARS;
    defaultAvatar = royaltyAvatars.find((a) => a.id === 'king') || royaltyAvatars[0];
    selectedAvatar = defaultAvatar;

    console.log('✅ Avatars loaded successfully.');

    // Now that data is ready, initialize the rest of the page
    initializePageEventListeners();
  } catch (err) {
    console.error('🚨 Failed to load critical avatar data. Lobby may not function correctly.', err);
    // Still attempt to initialize the page, but avatars will be broken.
    initializePageEventListeners();
  }
}


export function initializePageEventListeners() {
  console.log('🚀 [events.ts] initializePageEventListeners called!');

  // Initialize avatar picker
  initializeAvatarPicker();
  syncCounterUI();
  // Ensure silhouettes render after DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    updatePlayerSilhouettes();
  });

  // Only setup modal buttons now (header buttons removed)
  const setupRulesButton = document.getElementById('setup-rules-button');
  const setupTutorialButton = document.getElementById('setup-tutorial-button');
  const setupDealButton = document.getElementById('setup-deal-button');
  const joinRulesButton = document.getElementById('join-rules-button');
  const gameRulesButton = document.getElementById('game-rules-button');

  if (setupRulesButton) {
    setupRulesButton.addEventListener('click', handleRulesClick);
  }

  if (setupTutorialButton) {
    setupTutorialButton.addEventListener('click', () => {
      // Reload page with tutorial flag
      window.location.href = '/?tutorial=true';
    });
  }

  if (joinRulesButton) {
    joinRulesButton.addEventListener('click', handleRulesClick);
  }

  if (gameRulesButton) {
    gameRulesButton.addEventListener('click', handleGameRulesClick);
  }

  if (setupDealButton) {
    setupDealButton.addEventListener('click', handleDealClick);
  }

  const lobbyForm = document.getElementById('lobby-form');
  const lobbyTabButtons = document.querySelectorAll(
    '.lobby-tab-button'
  ) as NodeListOf<HTMLButtonElement>;
  const lobbyTabPanels = document.querySelectorAll(
    '.lobby-tab-panel'
  ) as NodeListOf<HTMLElement>;

  let hostPanelHeight = 0;

  function setLobbyTab(tab: 'host' | 'join') {
    if (lobbyForm) {
      lobbyForm.setAttribute('data-lobby-tab', tab);
    }

    lobbyTabButtons.forEach((button) => {
      const isActive = button.dataset.tab === tab;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    lobbyTabPanels.forEach((panel) => {
      const isActive = panel.dataset.tabPanel === tab;
      panel.classList.toggle('is-active', isActive);
    });

    const hostPanel = document.querySelector(
      '.lobby-tab-panel--host'
    ) as HTMLElement | null;
    const joinPanel = document.querySelector(
      '.lobby-tab-panel--join'
    ) as HTMLElement | null;

    if (tab === 'host' && hostPanel) {
      hostPanelHeight = hostPanel.offsetHeight;
      if (joinPanel) {
        joinPanel.style.minHeight = '';
      }
    }

    if (tab === 'join' && joinPanel && hostPanelHeight > 0) {
      joinPanel.style.minHeight = `${hostPanelHeight}px`;
    }
  }

  if (lobbyTabButtons.length > 0) {
    setLobbyTab('host');
    lobbyTabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab === 'join' ? 'join' : 'host';
        setLobbyTab(tab);
      });
    });
  }

  try {
    // Load state after handlers are attached
    state.loadSession();
    applySpectatorMode();
  } catch (stateError) {
    console.error('❌ Error loading state:', stateError);
  }


  // UI hooks
  const joinGameButton = document.getElementById('join-game-button');
  if (joinGameButton) {
    joinGameButton.addEventListener('click', handleJoinGameClick);
  }

  // Dev-only restart button (only works if button is visible)
  const devRestartButton = document.getElementById('dev-restart-button');
  if (devRestartButton) {
    devRestartButton.addEventListener('click', handleDevRestart);
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
    const closeBtn = rulesModal.querySelector(
      '.modal__close-button'
    ) as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.onclick = hideRulesModalAndOverlay;
    }

    // Close modal when clicking overlay
    overlay.addEventListener('click', (e) => {
      if (
        e.target === overlay &&
        !rulesModal.classList.contains('modal--hidden')
      ) {
        hideRulesModalAndOverlay();
      }
    });

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
        return;
      }

      detailsList.forEach((d, i) => {
        const summaryEl = d.querySelector('summary');
        const summaryText = summaryEl
          ? summaryEl.textContent?.trim()
          : 'Summary N/A';
      });

      const allOpen =
        detailsList.length > 0 && detailsList.every((d) => d.open);
      expandCollapseBtn.textContent = allOpen ? 'Collapse All' : 'Expand All';
    };

    expandCollapseBtn.addEventListener('click', function () {
      const detailsList = getDetailsList();

      if (detailsList.length === 0) {
        updateExpandCollapseLabel(); // Ensure label is correct
        return;
      }

      // Determine the desired state: if button says "Expand All", we want them open.
      const shouldBeOpen = expandCollapseBtn.textContent === 'Expand All';

      detailsList.forEach((d, index) => {
        const summaryElement = d.querySelector('summary');
        if (!summaryElement) {
          return; // Skip this one
        }

        // If the current state is different from the desired state, click the summary
        if (d.open !== shouldBeOpen) {
          summaryElement.click(); // This will trigger the 'toggle' event, which calls updateExpandCollapseLabel
        }
      });
      // The 'toggle' event listener on rulesModal (which calls updateExpandCollapseLabel)
      // should handle updating the main button's text after each programmatic click.
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
          updateExpandCollapseLabel();
        }
      },
      true
    );

    // Initial label setup when the page loads
    updateExpandCollapseLabel();
  }
  // Ensure the Start Game button is enabled/disabled when lobby updates
  const observer = new MutationObserver(updateStartGameButton);
  const playerList = document.getElementById('player-list');
  if (playerList) {
    observer.observe(playerList, { childList: true, subtree: false });
  }
  // Lobby form validation and error handling
  const totalPlayersInput = document.getElementById(
    'total-players-input'
  ) as HTMLInputElement;
  const cpuPlayersInput = document.getElementById(
    'cpu-players-input'
  ) as HTMLInputElement;

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
    const totalPlayersInput = document.getElementById(
      'total-players-input'
    ) as HTMLInputElement;
    const cpuPlayersInput = document.getElementById(
      'cpu-players-input'
    ) as HTMLInputElement;
    const humanCount = parseInt(totalPlayersInput?.value || '1', 10);
    const computerCount = parseInt(cpuPlayersInput?.value || '1', 10);
    const minHumans = state.getIsSpectator() ? 0 : 1;
    setButtonDisabled(
      startGameBtn,
      !(humanCount >= minHumans && humanCount + computerCount >= 2)
    );
  }
}

// Separate handler functions to prevent duplicate listeners
function openRulesModal() {
  console.log('dYZ_ Rules button clicked!');
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
    document.body.classList.add('rules-modal-open');
    document.documentElement.classList.add('rules-modal-open');

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

    console.log('Rules modal opened, lobby hidden');
  } else {
    console.error('Rules modal or overlay not found');
  }
}

document.addEventListener('open-rules-modal', openRulesModal);

function handleRulesClick() {
  if (document.body.classList.contains('showing-game')) {
    return;
  }
  openRulesModal();
}

function handleGameRulesClick() {
  openRulesModal();
}

async function handleDealClick() {
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
  const totalPlayersInput = document.getElementById(
    'total-players-input'
  ) as HTMLInputElement;
  const cpuPlayersInput = document.getElementById(
    'cpu-players-input'
  ) as HTMLInputElement;
  const isSpectator = state.getIsSpectator();
  const numHumans = isSpectator
    ? 0
    : parseInt(totalPlayersInput.value, 10) || 1;
  const numCPUs = parseInt(cpuPlayersInput.value, 10) || 0;

  state.setDesiredCpuCount(numCPUs);

  const playerDataForEmit: {
    playerName: string;
    avatar?: string;
    numHumans: number;
    numCPUs: number;
    spectator?: boolean;
  } = {
    playerName: name,
    avatar: selectedAvatar?.icon || defaultAvatar?.icon || '🤴',
    numHumans: numHumans,
    numCPUs: numCPUs,
  };
  if (isSpectator) {
    playerDataForEmit.spectator = true;
  }

  console.log(
    '🎯 Deal button: Validations passed. Joining game with data:',
    playerDataForEmit
  );
  console.log(
    '[CLIENT] handleDealClick: Emitting JOIN_GAME with',
    playerDataForEmit
  );

  // Log socket connection status before attempting to emit
  console.log('[CLIENT] Socket connection status before JOIN_GAME:', {
    socketExists: !!state.socket,
    connected: state.socket?.connected,
    id: state.socket?.id,
    hasJoinedListeners: state.socket
      ? state.socket.listeners(JOINED).length
      : 0,
    hasLobbyStateListeners: state.socket
      ? state.socket.listeners(LOBBY_STATE_UPDATE).length
      : 0,
  });

  // Add a callback to log the server's response
  await state.socketReady;
  if (!state.socket || state.socket.connected === false) {
    queueMessage('Unable to connect to server. Please try again.');
    return;
  }

  state.socket.emit(JOIN_GAME, playerDataForEmit, (response: any) => {
    console.log('[CLIENT] Received JOIN_GAME response from server:', response);
    const dealButton = document.getElementById(
      'setup-deal-button'
    ) as HTMLButtonElement;
    const idleLabel = isSpectator ? 'START CPU MATCH' : "LET'S PLAY";
    if (response.error) {
      console.error('[CLIENT] JOIN_GAME error:', response.error);
      queueMessage(response.error);
      if (dealButton) {
        dealButton.disabled = false;
        dealButton.textContent = idleLabel;
      }
    } else {
      console.log(
        '[CLIENT] JOIN_GAME success - Room ID:',
        response.roomId,
        'Player ID:',
        response.playerId
      );
      // --- BEST PRACTICE: Reset form fields after successful join ---
      const form = document.getElementById(
        'lobby-form'
      ) as HTMLFormElement | null;
      if (form) {
        form.reset();
        syncCounterUI();
      }
      if (dealButton) {
        dealButton.disabled = false;
        dealButton.textContent = idleLabel;
      }
      if (isSpectator) {
        state.socket.emit(START_GAME, { computerCount: numCPUs });
      }
    }
  });

  const dealButton = document.getElementById(
    'setup-deal-button'
  ) as HTMLButtonElement;
  if (dealButton) {
    dealButton.disabled = true;
    dealButton.textContent = 'STARTING...';
  }
}

// Dev-only: Restart game with same settings
async function handleDevRestart() {
  console.log('🔄 [DEV] Restarting game with same settings...');
  
  const lastState = state.getLastGameState();
  if (!lastState) {
    console.warn('[DEV] No previous game state found');
    return;
  }

  // Extract settings from last game
  const players = lastState.players || [];
  const numHumans = players.filter((p: any) => !p.isComputer).length;
  const numCPUs = players.filter((p: any) => p.isComputer).length;
  const myName = players.find((p: any) => p.id === state.myId)?.name || 'Dev Player';

  console.log(`[DEV] Extracted settings: ${numHumans} humans, ${numCPUs} CPUs, name: ${myName}`);

  // Leave current game
  if (state.socket && state.socket.connected) {
    state.socket.disconnect();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Clear session
  state.setCurrentRoom(null);
  state.setMyId(null);
  state.saveSession();

  // Reconnect and create new game
  await state.socketReady;
  state.socket.connect();
  
  // Wait for connection
  await new Promise<void>((resolve) => {
    if (state.socket.connected) {
      resolve();
    } else {
      state.socket.once('connect', () => resolve());
    }
  });

  // Create new game with same settings
  const playerData = {
    playerName: myName,
    numHumans: numHumans,
    numCPUs: numCPUs,
    avatar: selectedAvatar?.icon || defaultAvatar?.icon || '🤴',
  };

  console.log('[DEV] Creating new game with:', playerData);
  
  state.socket.emit(JOIN_GAME, playerData, (response: any) => {
    if (response?.error) {
      console.error('[DEV] Failed to create game:', response.error);
    } else {
      console.log('[DEV] Game created successfully, animation will trigger on STATE_UPDATE');
    }
  });
}

async function handleJoinGameClick() {
  console.log('🎯 Join game button clicked!');
  clearMessageQueueAndHide();

  const joinBtn = document.getElementById(
    'join-game-button'
  ) as HTMLButtonElement | null;
  if (joinBtn && joinBtn.disabled) {
    // Prevent duplicate emits if already disabled
    return;
  }

  const nameValidation = validateNameInput();
  const codeValidation = validateRoomCodeInput();

  let allValid = true;
  if (!nameValidation.isValid) {
    queueMessage(nameValidation.message);
    allValid = false;
  }
  if (!codeValidation.isValid) {
    queueMessage(codeValidation.message);
    allValid = false;
  }

  if (!allValid) {
    if (!nameValidation.isValid) {
      const nameInput = uiManager.getNameInput();
      if (nameInput) nameInput.focus();
    }
    if (joinBtn) joinBtn.disabled = false; // Re-enable button on validation error
    return;
  }

  const name = nameValidation.name;
  const code = codeValidation.code;
  state.setCurrentRoom(code);
  state.saveSession();
  
  const joinPayload = {
    roomId: code,
    playerName: name,
    avatar: selectedAvatar?.icon || defaultAvatar?.icon || '🤴',
    numHumans: 1,
    numCPUs: 0,
  };
  console.log(
    '[CLIENT] handleJoinGameClick: Emitting JOIN_GAME with',
    joinPayload
  );
  await state.socketReady;
  if (!state.socket || state.socket.connected === false) {
    queueMessage('Unable to connect to server. Please try again.');
    if (joinBtn) joinBtn.disabled = false;
    return;
  }

  state.socket.emit(JOIN_GAME, joinPayload, (response: any) => {
    if (joinBtn) joinBtn.disabled = false; // Re-enable button after server response
    if (response && response.error) {
      queueMessage(response.error);
      state.setCurrentRoom(null);
      state.saveSession();
      return;
    }
    // --- BEST PRACTICE: Reset form fields after successful join ---
    const form = document.getElementById(
      'lobby-form'
    ) as HTMLFormElement | null;
    if (form) {
      form.reset();
      syncCounterUI();
    }
  });

  if (joinBtn) joinBtn.disabled = true;
}

// Failsafe: Always hide overlay when hiding rules modal
function hideRulesModalAndOverlay() {
  const rulesModal = document.getElementById('rules-modal');
  const overlay = document.getElementById('modal-overlay');
  const lobbyContainer = document.getElementById('lobby-container');

  if (rulesModal) rulesModal.classList.add('modal--hidden');
  if (overlay) overlay.classList.add('modal__overlay--hidden');
  document.body.classList.remove('rules-modal-open');
  document.documentElement.classList.remove('rules-modal-open');

  // Show the lobby container again when hiding the rules modal
  if (lobbyContainer) {
    lobbyContainer.style.display = ''; // Resets to default display value
  }

  console.log('✅ Rules modal closed, lobby restored');
}


export { handleRulesClick, hideRulesModalAndOverlay };