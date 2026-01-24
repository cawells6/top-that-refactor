import * as state from './state.js';
import * as uiManager from './uiManager.js';
import type { AvatarItem } from '../../src/shared/avatars.js';
import {
  JOIN_GAME,
  JOINED,
  LOBBY_STATE_UPDATE,
  START_GAME,
} from '../../src/shared/events.js';

// --- Avatar State Management ---
let royaltyAvatars: AvatarItem[] = [];
let selectedAvatar: AvatarItem | null = null;
let shuffledBotAvatars: AvatarItem[] = [];
let botAvatarAssignments: AvatarItem[] = [];
// A single randomized order chosen at lobby init to avoid reshuffling on every open
let initialAvatarOrder: AvatarItem[] = [];
// Map of avatar URL -> preloaded Image object
const avatarPreloads: Map<string, { img: HTMLImageElement; loaded: boolean }> = new Map();

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

function getBotAvatarPool(): AvatarItem[] {
  return shuffledBotAvatars.length > 0 ? shuffledBotAvatars : royaltyAvatars;
}

function updateAvatarDropdownUI() {
  const preview = document.getElementById('selected-avatar-preview');
  const text = document.getElementById('selected-avatar-text');

  if (preview) {
    preview.innerHTML = '';
    if (selectedAvatar) {
        preview.appendChild(renderAvatarVisual(selectedAvatar.icon));
    } else {
        preview.textContent = '?';
    }
  }

  if (text) {
    text.textContent = selectedAvatar
      ? selectedAvatar.label
      : 'Select an avatar';
  }
}

function openAvatarDropdown() {
  const dropdown = document.getElementById(
    'avatar-dropdown'
  ) as HTMLDetailsElement | null;
  if (!dropdown) return;
  dropdown.classList.remove('hidden');
  dropdown.open = true;
  dropdown.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  // Start progressive loading of avatar images when the picker opens
  loadAvatarGridImages();
}

function closeAvatarDropdown() {
  const dropdown = document.getElementById(
    'avatar-dropdown'
  ) as HTMLDetailsElement | null;
  if (!dropdown) return;
  dropdown.open = false;
  dropdown.classList.add('hidden');
}

function getFallbackBotAvatar(slotIndex: number): AvatarItem {
  return {
    id: `robot_${slotIndex + 1}`,
    icon: '🤖',
    label: 'Automan',
  };
}

function isImageAvatar(value: string): boolean {
  return (
    /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(value) ||
    value.startsWith('/assets/')
  );
}

function renderAvatarVisual(avatarValue: string): HTMLElement {
  if (isImageAvatar(avatarValue)) {
    const img = document.createElement('img');
    img.className = 'image-avatar';
    img.src = avatarValue;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  const emoji = document.createElement('div');
  emoji.className = 'emoji-avatar';
  emoji.textContent = avatarValue;
  return emoji;
}

function reconcileBotAvatarAssignments(desiredCpuCount: number) {
  const pool = getBotAvatarPool();
  if (pool.length === 0) {
    botAvatarAssignments = [];
    return;
  }

  // Keep previous bot choices stable across UI updates. Only change a bot's
  // avatar if it conflicts with the selected human avatar or duplicates another bot.
  const targetLen = Math.max(botAvatarAssignments.length, desiredCpuCount);
  const excludedId = selectedAvatar?.id;
  const used = new Set<string>();
  const next: Array<AvatarItem | null> = new Array(targetLen).fill(null);

  for (let i = 0; i < targetLen; i++) {
    const existing = botAvatarAssignments[i];
    if (!existing) continue;
    if (existing.id === excludedId) continue;
    if (used.has(existing.id)) continue;
    next[i] = existing;
    used.add(existing.id);
  }

  const pickNext = () =>
    pool.find((a) => a.id !== excludedId && !used.has(a.id)) || null;

  for (let i = 0; i < targetLen; i++) {
    if (next[i]) continue;
    const chosen = pickNext();
    if (!chosen) break;
    next[i] = chosen;
    used.add(chosen.id);
  }

  for (let i = 0; i < targetLen; i++) {
    if (!next[i]) next[i] = getFallbackBotAvatar(i);
  }

  botAvatarAssignments = next as AvatarItem[];
}

// Create a player silhouette element
function createPlayerSilhouette(
  type: 'human' | 'cpu',
  avatarIcon: string | null,
  isPicker = false
): HTMLElement {
  const silhouette = document.createElement('div');

  if (avatarIcon) {
    silhouette.className = `player-silhouette ${type}`;
    silhouette.appendChild(renderAvatarVisual(avatarIcon));
  } else {
    // Empty state / Placeholder
    silhouette.className = `player-silhouette ${type} placeholder`;
    silhouette.textContent = '?';
  }

  // Only add the hover helper for the actual local picker slot
  if (type === 'human' && isPicker) {
    const help = document.createElement('div');
    help.className = 'avatar-hover-help';
    help.textContent = 'Tap avatar to change';
    silhouette.appendChild(help);
  }

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

  reconcileBotAvatarAssignments(cpuCount);

  // 1. Render Human (Use selected avatar or null)
  // Render humans; pass isPicker=true for the local slot (index 0)
  updateSilhouettesInContainer(
    humanSilhouettesContainer,
    'human',
    humanCount,
    selectedAvatar ? selectedAvatar.icon : null
  );

  // Make the local human slot clickable to open the avatar picker.
  const localSlot =
    humanSilhouettesContainer.firstElementChild as HTMLElement | null;
  if (localSlot) {
    localSlot.classList.add('is-avatar-picker');
    // Tooltip removed — hover helper displays contextual help
    localSlot.removeAttribute('title');
    localSlot.tabIndex = 0;
    localSlot.setAttribute('role', 'button');
    localSlot.onclick = () => openAvatarDropdown();
    localSlot.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openAvatarDropdown();
      }
    };
  }

  // 2. Render CPU (Stable randomized pool)
  updateSilhouettesInContainer(
    cpuSilhouettesContainer,
    'cpu',
    cpuCount,
    null,
    botAvatarAssignments
  );
}

function syncCounterUI() {
  const totalPlayersInput = document.getElementById(
    'total-players-input'
  ) as HTMLInputElement | null;
  const cpuPlayersInput = document.getElementById(
    'cpu-players-input'
  ) as HTMLInputElement | null;
  const totalCountSpan = document.getElementById('total-count');

  if (!totalPlayersInput || !cpuPlayersInput) return;
  const humans = parseInt(totalPlayersInput.value || '1', 10);
  const cpus = parseInt(cpuPlayersInput.value || '0', 10);
  const total = humans + cpus;

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
  specificIcon: string | null,
  iconList: AvatarItem[] = []
) {
  // Simple diff: Clear and Rebuild (safest for "Frankenstein" code)
  container.innerHTML = '';

  if (targetCount === 0) return;

  if (type === 'human') {
    // Humans: Only the local player gets the selected avatar; other human slots
    // stay as placeholders until those players join.
    for (let i = 0; i < targetCount; i++) {
      const iconForSlot = i === 0 ? specificIcon : null;
      container.appendChild(createPlayerSilhouette(type, iconForSlot));
    }
  } else {
    // CPUs: Cycle through the randomized list
    for (let i = 0; i < targetCount; i++) {
      const avatar =
        iconList.length > 0 ? iconList[i % iconList.length] : { icon: '🤖' };
      container.appendChild(
        createPlayerSilhouette(type, avatar.icon as string)
      );
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

// ensureSilhouetteContainers removed - containers are expected to exist in DOM

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
  grid.innerHTML = '';

  // Create options with placeholder images; actual image src is stored in data-src
  // Shuffle the avatars to avoid showing the same order every time
  const avatarsToShow = shuffleArray(royaltyAvatars);
  avatarsToShow.forEach((av) => {
    const el = document.createElement('div');
    el.className = 'avatar-option';
    el.title = av.label;

    // Check if we have a preload ready
    const preload = avatarPreloads.get(av.icon);
    const isReady = preload && preload.loaded;

    const img = document.createElement('img');
    img.className = 'image-avatar';

    // Only add placeholder class if not ready
    if (!isReady) {
        img.classList.add('avatar-thumb-placeholder');
        img.setAttribute('data-src', av.icon); // Mark for lazy load
    } else {
        img.src = av.icon; // Set directly if ready
    }

    img.alt = av.label;
    img.loading = 'lazy';
    img.decoding = 'async';
    el.appendChild(img);

    if (selectedAvatar && selectedAvatar.id === av.id) {
      el.classList.add('selected');
    }

    el.onclick = () => {
      // 1. Select the avatar
      selectedAvatar = av;

      // 2. Visual update of grid
      grid
        .querySelectorAll('.avatar-option')
        .forEach((opt) => opt.classList.remove('selected'));
      el.classList.add('selected');

      updateAvatarDropdownUI();
      closeAvatarDropdown();

      // 3. Re-render silhouettes (this puts the avatar in the user slot)
      updatePlayerSilhouettes();
      updateJoinAvatar(); // Call new helper
    };

    grid.appendChild(el);
  });
}

// Load avatar images in the picker sequentially to avoid saturating the network
async function loadAvatarGridImages(): Promise<void> {
  const imgs = Array.from(
    document.querySelectorAll<HTMLImageElement>('#avatar-grid img[data-src]')
  );
  if (!imgs.length) return;

  // Attach preloaded images where possible for immediate display.
  const promises: Promise<void>[] = [];
  for (const img of imgs) {
    const src = img.getAttribute('data-src') || '';
    if (!src) continue;

    // If DOM image already has src, remove placeholder and continue
    if (img.src) {
      img.classList.remove('avatar-thumb-placeholder');
      continue;
    }

    const preload = avatarPreloads.get(src);
    if (preload) {
      if (preload.loaded) {
        img.src = src;
        img.classList.remove('avatar-thumb-placeholder');
        img.removeAttribute('data-src');
      } else {
        // Wait for the preloaded image to finish, then set src
        const p = new Promise<void>((resolve) => {
          const onLoaded = () => {
            img.src = src;
            img.classList.remove('avatar-thumb-placeholder');
            img.removeAttribute('data-src');
            resolve();
          };
          preload.img.addEventListener('load', onLoaded, { once: true });
          preload.img.addEventListener('error', () => resolve(), { once: true });
          // safety timeout
          setTimeout(() => resolve(), 4000);
        });
        promises.push(p);
      }
    } else {
      // No preload available, kick off a non-blocking load
      const p = new Promise<void>((resolve) => {
        let settled = false;
        const onDone = () => {
          if (settled) return;
          settled = true;
          img.classList.remove('avatar-thumb-placeholder');
          img.removeAttribute('data-src');
          resolve();
        };
        img.onload = onDone;
        img.onerror = onDone;
        // start load immediately (no stagger)
        img.src = src;
        // safety timeout
        setTimeout(onDone, 4000);
      });
      promises.push(p);
    }
  }

  // Wait for any outstanding loads (but do not block UI longer than necessary)
  await Promise.all(promises);
}

// Preload avatar images in background at lobby init to avoid delay when opening picker
function preloadAvatarsList(list: AvatarItem[]) {
  for (const av of list) {
    if (!av || !av.icon) continue;
    const url = av.icon;
    if (avatarPreloads.has(url)) continue;
    try {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      avatarPreloads.set(url, { img, loaded: false });
      img.onload = () => {
        const rec = avatarPreloads.get(url);
        if (rec) rec.loaded = true;
      };
      img.onerror = () => {
        const rec = avatarPreloads.get(url);
        if (rec) rec.loaded = true; // treat error as settled
      };
      // kick off load (non-blocking)
      img.src = url;
    } catch {
      // ignore
    }
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function getCategoryFromId(id: string): string {
  // id is filename without extension, e.g. 'king_aldric' or 'Prince_Max'
  if (!id) return 'misc';
  // Normalize underscores and hyphens to spaces, then take first word
  const cleaned = id.replace(/[_-]+/g, ' ').trim();
  const first = cleaned.split(' ')[0];
  return first.toLowerCase();
}

function interleaveByCategory(items: AvatarItem[]): AvatarItem[] {
  if (!items || items.length <= 1) return items.slice();
  const buckets = new Map<string, AvatarItem[]>();
  for (const it of items) {
    const cat = getCategoryFromId(it.id || 'misc');
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(it);
  }

  const result: AvatarItem[] = [];
  let prevCat: string | null = null;

  const total = items.length;
  while (result.length < total) {
    // pick bucket with largest remaining count that isn't prevCat
    let chosenCat: string | null = null;
    let maxCount = -1;
    for (const [cat, list] of buckets.entries()) {
      const cnt = list.length;
      if (cnt === 0) continue;
      if (cat === prevCat) continue;
      if (cnt > maxCount) {
        maxCount = cnt;
        chosenCat = cat;
      }
    }

    if (!chosenCat) {
      // no candidate other than prevCat; pick any non-empty bucket
      for (const [cat, list] of buckets.entries()) {
        if (list.length > 0) {
          chosenCat = cat;
          break;
        }
      }
    }

    if (!chosenCat) break; // nothing left

    const item = buckets.get(chosenCat)!.shift()!;
    result.push(item);
    prevCat = chosenCat;
  }

  return result;
}

// --- REPLACES EXISTING initializeLobby ---
export async function initializeLobby() {
  console.log('🚀 [events.ts] Initializing lobby...');
  try {
    const avatarModule = await import('../../src/shared/avatars.js');
    royaltyAvatars = avatarModule.ROYALTY_AVATARS;

    // Do NOT auto-select an avatar on load — leave `selectedAvatar` null so
    // the player must explicitly choose an avatar if they want one.
    // Choose a single shuffled order for this session, then interleave by category
    const randomized = shuffleArray(royaltyAvatars);
    initialAvatarOrder = interleaveByCategory(randomized);
    shuffledBotAvatars = [...initialAvatarOrder];

    // Start background preloads so picker shows instantly when opened
    preloadAvatarsList(initialAvatarOrder);
    
    reconcileBotAvatarAssignments(0); // Pass a default value
    
    initializePageEventListeners();
    
    updatePlayerSilhouettes();
  } catch (err) {
    console.error('🚨 Failed to load avatar data.', err);
    initializePageEventListeners();
  }
}

function bindAvatarPicker(): void {
  const humanSilhouettesContainer = document.getElementById('human-silhouettes');
  if (humanSilhouettesContainer) {
    // delegate click to any human silhouette
    humanSilhouettesContainer.addEventListener('click', (_event: Event) => {
      // open avatar dropdown when any human silhouette is clicked
      const dropdown = document.getElementById('avatar-dropdown') as HTMLDetailsElement;
      if (dropdown && dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
      }
      if (dropdown) {
        dropdown.open = true; // open the details element
      }
    });
  }
}

export function initializePageEventListeners() {
  console.log('🚀 [events.ts] initializePageEventListeners called!');

  // Initialize avatar picker
  initializeAvatarPicker();
  bindAvatarPicker();

  // Close avatar dropdown when clicking outside (or on the X)
  const avatarDropdown = document.getElementById('avatar-dropdown') as HTMLDetailsElement | null;
  if (avatarDropdown) {
    avatarDropdown.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('[data-avatar-dropdown-close]')) {
        ev.preventDefault();
        closeAvatarDropdown();
        return;
      }

      // If the click is not inside the panel, treat it as an outside click.
      if (!target.closest('.avatar-dropdown__panel')) {
        closeAvatarDropdown();
      }
    });

    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      if (!avatarDropdown.open) return;
      closeAvatarDropdown();
    });
  }

  // Sync UI immediately (no avatar selected by default)
  updateAvatarDropdownUI();
  updatePlayerSilhouettes();
  updateJoinAvatar(); // New helper

  // --- FEEDBACK MODAL LOGIC ---
  const feedbackModal = document.getElementById('feedback-modal');
  const feedbackClose = document.getElementById('close-feedback-btn');
  const feedbackForm = document.getElementById('feedback-form') as HTMLFormElement | null;

  // Open buttons (Lobby Menu + Game Menu)
  const openFeedback = () => {
    if (!feedbackModal) return;
    feedbackModal.classList.remove('modal--hidden');
    document.getElementById('modal-overlay')?.classList.remove('modal__overlay--hidden');
    // Close game menu if open
    document.getElementById('game-menu-dropdown')?.classList.add('hidden');
  };

  document.getElementById('lobby-feedback-btn')?.addEventListener('click', openFeedback);
  document.getElementById('game-feedback-btn')?.addEventListener('click', openFeedback);

  if (feedbackClose && feedbackModal) {
    feedbackClose.onclick = () => {
      feedbackModal.classList.add('modal--hidden');
      document.getElementById('modal-overlay')?.classList.add('modal__overlay--hidden');
    };
  }

  if (feedbackForm && feedbackClose && feedbackModal) {
    feedbackForm.onsubmit = async (e) => {
      e.preventDefault();
      const type = (document.getElementById('feedback-type') as HTMLSelectElement | null)
        ?.value;
      const msg = (document.getElementById('feedback-msg') as HTMLTextAreaElement | null)
        ?.value;
      if (!type || msg == null) return;

      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, message: msg }),
        });
        alert('Thanks for the feedback!');
        feedbackClose.click();
        feedbackForm.reset();
      } catch (err) {
        console.error(err);
        alert('Error sending feedback.');
      }
    };

    // Close feedback modal when clicking overlay or pressing Escape
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        if (feedbackModal.classList.contains('modal--hidden')) return;
        feedbackModal.classList.add('modal--hidden');
        overlay.classList.add('modal__overlay--hidden');
      });
    }
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !feedbackModal.classList.contains('modal--hidden')) {
        feedbackModal.classList.add('modal--hidden');
        document.getElementById('modal-overlay')?.classList.add('modal__overlay--hidden');
      }
    });
  }

  // --- LOBBY MENU (TOP-LEFT DROPDOWN) ---
  const lobbyMenu = document.getElementById('lobby-menu') as HTMLDetailsElement | null;
  if (lobbyMenu) {
    // Close after choosing an action
    lobbyMenu.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('button')) {
        lobbyMenu.open = false;
      }
    });

    // Close on outside click
    document.addEventListener('click', (ev) => {
      if (!lobbyMenu.open) return;
      if (!(ev.target instanceof Node)) return;
      if (!lobbyMenu.contains(ev.target)) {
        lobbyMenu.open = false;
      }
    });
  }

  // --- GAME MENU LOGIC ---
  const menuBtn = document.getElementById('table-menu-button');
  const menuDropdown = document.getElementById('game-menu-dropdown');
  if(menuBtn && menuDropdown) {
      menuBtn.onclick = (e) => {
          e.stopPropagation();
          menuDropdown.classList.toggle('hidden');
      };
      // Close menu when clicking elsewhere
      document.addEventListener('click', (e) => {
          if(e.target !== menuBtn && !menuDropdown.contains(e.target as Node)) {
              menuDropdown.classList.add('hidden');
          }
      });
  }

  // Update Join Avatar Click
  const joinAvatar = document.getElementById('join-player-avatar');
  if(joinAvatar) {
      joinAvatar.onclick = () => openAvatarDropdown();
  }

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
  const lobbyTabPanels = document.querySelectorAll(
    '.lobby-tab-panel'
  ) as NodeListOf<HTMLElement>;

  let hostPanelHeight = 0;

  function setLobbyTab(tab: 'host' | 'join') {
    if (lobbyForm) {
      lobbyForm.setAttribute('data-lobby-tab', tab);
    }

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

  setLobbyTab('host');

  const goToJoinButton = document.getElementById('go-to-join-button');
  if (goToJoinButton) {
    goToJoinButton.addEventListener('click', () => setLobbyTab('join'));
  }

  const goToHostButton = document.getElementById('go-to-host-button');
  if (goToHostButton) {
    goToHostButton.addEventListener('click', () => setLobbyTab('host'));
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

      detailsList.forEach((d) => {
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
  syncCounterUI();
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
    numHumans: numHumans,
    numCPUs: numCPUs,
  };
  if (selectedAvatar) {
    (playerDataForEmit as any).avatar = selectedAvatar.icon;
  }
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
    const dealButton = document.getElementById('setup-deal-button') as HTMLButtonElement;
    const idleLabel = isSpectator ? 'START CPU MATCH' : "LET'S PLAY";
    if (!response || response.success === false) {
      const err = response?.error || 'Unable to create/join game.';
      console.error('[CLIENT] JOIN_GAME error:', err);
      queueMessage(err);
      if (dealButton) {
        dealButton.disabled = false;
        dealButton.textContent = idleLabel;
      }
      return;
    }

    console.log('[CLIENT] JOIN_GAME success - Room ID:', response.roomId, 'Player ID:', response.playerId);
    const form = document.getElementById('lobby-form') as HTMLFormElement | null;
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
  const myName =
    players.find((p: any) => p.id === state.myId)?.name || 'Dev Player';

  console.log(
    `[DEV] Extracted settings: ${numHumans} humans, ${numCPUs} CPUs, name: ${myName}`
  );

  // Leave current game
  if (state.socket && state.socket.connected) {
    state.socket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 100));
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
    // Only attach avatar if user explicitly selected one
    ...(selectedAvatar ? { avatar: selectedAvatar.icon } : {}),
  };

  console.log('[DEV] Creating new game with:', playerData);

  state.socket.emit(JOIN_GAME, playerData, (response: any) => {
    if (!response || response.success === false) {
      console.error('[DEV] Failed to create game:', response?.error);
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
    // Only include avatar when selected
    ...(selectedAvatar ? { avatar: selectedAvatar.icon } : {}),
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
    if (!response || response.success === false) {
      const err = response?.error || 'Unable to join room.';
      queueMessage(err);
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

// Helper to update the join tab silhouette
function updateJoinAvatar() {
    const joinEl = document.getElementById('join-player-avatar');
    if(joinEl && selectedAvatar) {
        joinEl.innerHTML = '';
        joinEl.appendChild(renderAvatarVisual(selectedAvatar.icon));
    }
}
