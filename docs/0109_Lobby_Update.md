Here is the complete, updated code for public/scripts/events.ts.



This version includes the fix to automatically randomize the human avatar when the lobby loads. Because the updatePlayerSilhouettes function (called during initialization) already contains logic to reconcile bot avatars against the human choice, this single change ensures the human gets a random avatar and bots automatically avoid picking the same one.

public/scripts/events.ts

TypeScript



import \* as state from './state.js';

import \* as uiManager from './uiManager.js';

import type { AvatarItem } from '../../src/shared/avatars.js';

import {

&nbsp; JOIN\_GAME,

&nbsp; JOINED,

&nbsp; LOBBY\_STATE\_UPDATE,

&nbsp; START\_GAME,

} from '../../src/shared/events.js';



// --- Avatar State Management ---

let royaltyAvatars: AvatarItem\[] = \[];

let selectedAvatar: AvatarItem | null = null;

let shuffledBotAvatars: AvatarItem\[] = \[];

let botAvatarAssignments: AvatarItem\[] = \[];



// --- Message Queue Logic for Single Error Display ---

let messageQueue: string\[] = \[];

let isDisplayingMessage = false;

let messageTimeoutId: number | null = null;



const LOBBY\_MESSAGE\_CONTAINER\_ID = 'lobby-validation-message';

const MESSAGE\_DISPLAY\_DURATION = 2000; // 2 seconds



function displayNextMessage() {

&nbsp; if (messageTimeoutId) {

&nbsp;   clearTimeout(messageTimeoutId);

&nbsp;   messageTimeoutId = null;

&nbsp; }



&nbsp; const outerContainer = document.getElementById(LOBBY\_MESSAGE\_CONTAINER\_ID);

&nbsp; if (!outerContainer) return;

&nbsp; const innerMessageBox = outerContainer.querySelector(

&nbsp;   '.message-box-content'

&nbsp; ) as HTMLElement | null;

&nbsp; const messageParagraph = outerContainer.querySelector('p');



&nbsp; if (!innerMessageBox || !messageParagraph) return;



&nbsp; if (messageQueue.length > 0) {

&nbsp;   isDisplayingMessage = true;

&nbsp;   const messageText = messageQueue.shift(); // Get the next message

&nbsp;   messageParagraph.textContent = messageText || '';

&nbsp;   innerMessageBox.classList.add('active');



&nbsp;   messageTimeoutId = window.setTimeout(() => {

&nbsp;     // If this was the last message, hide the box, otherwise show next

&nbsp;     if (messageQueue.length === 0) {

&nbsp;       innerMessageBox.classList.remove('active');

&nbsp;       isDisplayingMessage = false;

&nbsp;     } else {

&nbsp;       // Briefly hide before showing next for a "blink" effect

&nbsp;       innerMessageBox.classList.remove('active');

&nbsp;       setTimeout(() => displayNextMessage(), 100); // Short delay for blink

&nbsp;     }

&nbsp;   }, MESSAGE\_DISPLAY\_DURATION);

&nbsp; } else {

&nbsp;   innerMessageBox.classList.remove('active');

&nbsp;   isDisplayingMessage = false;

&nbsp; }

}



function queueMessage(message: string) {

&nbsp; if (!message) return;

&nbsp; messageQueue.push(message);

&nbsp; if (!isDisplayingMessage) {

&nbsp;   displayNextMessage();

&nbsp; }

}



function removeNameErrorsFromQueue() {

&nbsp; // Remove any name-related error messages from the queue

&nbsp; const nameErrorKeywords = \['name', 'Name'];

&nbsp; messageQueue = messageQueue.filter(

&nbsp;   (msg) => !nameErrorKeywords.some((keyword) => msg.includes(keyword))

&nbsp; );

}



function hasNameErrorInQueue(): boolean {

&nbsp; const nameErrorKeywords = \['name', 'Name'];

&nbsp; return messageQueue.some((msg) =>

&nbsp;   nameErrorKeywords.some((keyword) => msg.includes(keyword))

&nbsp; );

}



function isCurrentlyShowingNameError(): boolean {

&nbsp; if (!isDisplayingMessage) return false;



&nbsp; const outerContainer = document.getElementById(LOBBY\_MESSAGE\_CONTAINER\_ID);

&nbsp; if (!outerContainer) return false;



&nbsp; const messageParagraph = outerContainer.querySelector('p');

&nbsp; if (!messageParagraph) return false;



&nbsp; const currentText = messageParagraph.textContent || '';

&nbsp; const nameErrorKeywords = \['name', 'Name'];

&nbsp; return nameErrorKeywords.some((keyword) => currentText.includes(keyword));

}



function clearMessageQueueAndHide() {

&nbsp; messageQueue = \[];

&nbsp; if (messageTimeoutId) {

&nbsp;   clearTimeout(messageTimeoutId);

&nbsp;   messageTimeoutId = null;

&nbsp; }

&nbsp; const outerContainer = document.getElementById(LOBBY\_MESSAGE\_CONTAINER\_ID);

&nbsp; if (!outerContainer) return;

&nbsp; const innerMessageBox = outerContainer.querySelector(

&nbsp;   '.message-box-content'

&nbsp; ) as HTMLElement | null;

&nbsp; if (innerMessageBox) {

&nbsp;   innerMessageBox.classList.remove('active');

&nbsp; }

&nbsp; isDisplayingMessage = false;

}



// Helper to safely set disabled on button elements

function setButtonDisabled(el: HTMLElement | null, disabled: boolean) {

&nbsp; if (el \&\& 'disabled' in el) (el as HTMLButtonElement).disabled = disabled;

}



function getBotAvatarPool(): AvatarItem\[] {

&nbsp; return shuffledBotAvatars.length > 0 ? shuffledBotAvatars : royaltyAvatars;

}



function updateAvatarDropdownUI() {

&nbsp; const preview = document.getElementById('selected-avatar-preview');

&nbsp; const text = document.getElementById('selected-avatar-text');



&nbsp; if (preview) preview.textContent = selectedAvatar ? selectedAvatar.icon : '?';

&nbsp; if (text) {

&nbsp;   text.textContent = selectedAvatar

&nbsp;     ? selectedAvatar.label

&nbsp;     : 'Select an avatar';

&nbsp; }

}



function openAvatarDropdown() {

&nbsp; const dropdown = document.getElementById(

&nbsp;   'avatar-dropdown'

&nbsp; ) as HTMLDetailsElement | null;

&nbsp; if (!dropdown) return;

&nbsp; dropdown.open = true;

&nbsp; dropdown.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

}



function closeAvatarDropdown() {

&nbsp; const dropdown = document.getElementById(

&nbsp;   'avatar-dropdown'

&nbsp; ) as HTMLDetailsElement | null;

&nbsp; if (!dropdown) return;

&nbsp; dropdown.open = false;

}



function getFallbackBotAvatar(slotIndex: number): AvatarItem {

&nbsp; return {

&nbsp;   id: `robot\_${slotIndex + 1}`,

&nbsp;   icon: '🤖',

&nbsp;   label: 'Robot',

&nbsp; };

}



function reconcileBotAvatarAssignments(desiredCpuCount: number) {

&nbsp; const pool = getBotAvatarPool();

&nbsp; if (pool.length === 0) {

&nbsp;   botAvatarAssignments = \[];

&nbsp;   return;

&nbsp; }



&nbsp; // Keep previous bot choices stable across UI updates. Only change a bot's

&nbsp; // avatar if it conflicts with the selected human avatar or duplicates another bot.

&nbsp; const targetLen = Math.max(botAvatarAssignments.length, desiredCpuCount);

&nbsp; const excludedId = selectedAvatar?.id;

&nbsp; const used = new Set<string>();

&nbsp; const next: Array<AvatarItem | null> = new Array(targetLen).fill(null);



&nbsp; for (let i = 0; i < targetLen; i++) {

&nbsp;   const existing = botAvatarAssignments\[i];

&nbsp;   if (!existing) continue;

&nbsp;   if (existing.id === excludedId) continue;

&nbsp;   if (used.has(existing.id)) continue;

&nbsp;   next\[i] = existing;

&nbsp;   used.add(existing.id);

&nbsp; }



&nbsp; const pickNext = () =>

&nbsp;   pool.find((a) => a.id !== excludedId \&\& !used.has(a.id)) || null;



&nbsp; for (let i = 0; i < targetLen; i++) {

&nbsp;   if (next\[i]) continue;

&nbsp;   const chosen = pickNext();

&nbsp;   if (!chosen) break;

&nbsp;   next\[i] = chosen;

&nbsp;   used.add(chosen.id);

&nbsp; }



&nbsp; for (let i = 0; i < targetLen; i++) {

&nbsp;   if (!next\[i]) next\[i] = getFallbackBotAvatar(i);

&nbsp; }



&nbsp; botAvatarAssignments = next as AvatarItem\[];

}



// Create a player silhouette element

function createPlayerSilhouette(

&nbsp; type: 'human' | 'cpu',

&nbsp; avatarIcon: string | null

): HTMLElement {

&nbsp; const silhouette = document.createElement('div');



&nbsp; if (avatarIcon) {

&nbsp;   silhouette.className = `player-silhouette ${type}`;

&nbsp;   const emoji = document.createElement('div');

&nbsp;   emoji.className = 'emoji-avatar';

&nbsp;   emoji.textContent = avatarIcon;

&nbsp;   silhouette.appendChild(emoji);

&nbsp; } else {

&nbsp;   // Empty state / Placeholder

&nbsp;   silhouette.className = `player-silhouette ${type} placeholder`;

&nbsp;   silhouette.textContent = '?';

&nbsp; }



&nbsp; return silhouette;

}



// Update player silhouettes based on current counts

function updatePlayerSilhouettes() {

&nbsp; const totalPlayersInput = document.getElementById(

&nbsp;   'total-players-input'

&nbsp; ) as HTMLInputElement;

&nbsp; const cpuPlayersInput = document.getElementById(

&nbsp;   'cpu-players-input'

&nbsp; ) as HTMLInputElement;

&nbsp; const humanSilhouettesContainer =

&nbsp;   document.getElementById('human-silhouettes');

&nbsp; const cpuSilhouettesContainer = document.getElementById('cpu-silhouettes');



&nbsp; if (

&nbsp;   !humanSilhouettesContainer ||

&nbsp;   !cpuSilhouettesContainer ||

&nbsp;   !totalPlayersInput ||

&nbsp;   !cpuPlayersInput

&nbsp; ) {

&nbsp;   return;

&nbsp; }



&nbsp; const humanCount = parseInt(totalPlayersInput.value, 10) || 0;

&nbsp; const cpuCount = parseInt(cpuPlayersInput.value, 10) || 0;



&nbsp; reconcileBotAvatarAssignments(cpuCount);



&nbsp; // 1. Render Human (Use selected avatar or null)

&nbsp; updateSilhouettesInContainer(

&nbsp;   humanSilhouettesContainer,

&nbsp;   'human',

&nbsp;   humanCount,

&nbsp;   selectedAvatar ? selectedAvatar.icon : null

&nbsp; );



&nbsp; // Make the local human slot clickable to open the avatar picker.

&nbsp; const localSlot =

&nbsp;   humanSilhouettesContainer.firstElementChild as HTMLElement | null;

&nbsp; if (localSlot) {

&nbsp;   localSlot.classList.add('is-avatar-picker');

&nbsp;   localSlot.title = 'Click to choose your avatar';

&nbsp;   localSlot.tabIndex = 0;

&nbsp;   localSlot.setAttribute('role', 'button');

&nbsp;   localSlot.onclick = () => openAvatarDropdown();

&nbsp;   localSlot.onkeydown = (e) => {

&nbsp;     if (e.key === 'Enter' || e.key === ' ') {

&nbsp;       e.preventDefault();

&nbsp;       openAvatarDropdown();

&nbsp;     }

&nbsp;   };

&nbsp; }



&nbsp; // 2. Render CPU (Stable randomized pool)

&nbsp; updateSilhouettesInContainer(

&nbsp;   cpuSilhouettesContainer,

&nbsp;   'cpu',

&nbsp;   cpuCount,

&nbsp;   null,

&nbsp;   botAvatarAssignments

&nbsp; );

}



function syncCounterUI() {

&nbsp; const totalPlayersInput = document.getElementById(

&nbsp;   'total-players-input'

&nbsp; ) as HTMLInputElement | null;

&nbsp; const cpuPlayersInput = document.getElementById(

&nbsp;   'cpu-players-input'

&nbsp; ) as HTMLInputElement | null;

&nbsp; const totalCountSpan = document.getElementById('total-count');



&nbsp; if (!totalPlayersInput || !cpuPlayersInput) return;

&nbsp; const humans = parseInt(totalPlayersInput.value || '1', 10);

&nbsp; const cpus = parseInt(cpuPlayersInput.value || '0', 10);

&nbsp; const total = humans + cpus;



&nbsp; if (totalCountSpan) {

&nbsp;   totalCountSpan.textContent = total.toString();

&nbsp; }



&nbsp; updatePlayerSilhouettes();

&nbsp; updateStartGameButton();

}



// Update silhouettes in a specific container

function updateSilhouettesInContainer(

&nbsp; container: HTMLElement,

&nbsp; type: 'human' | 'cpu',

&nbsp; targetCount: number,

&nbsp; specificIcon: string | null,

&nbsp; iconList: AvatarItem\[] = \[]

) {

&nbsp; // Simple diff: Clear and Rebuild (safest for "Frankenstein" code)

&nbsp; container.innerHTML = '';



&nbsp; if (targetCount === 0) return;



&nbsp; if (type === 'human') {

&nbsp;   // Humans: Only the local player gets the selected avatar; other human slots

&nbsp;   // stay as placeholders until those players join.

&nbsp;   for (let i = 0; i < targetCount; i++) {

&nbsp;     const iconForSlot = i === 0 ? specificIcon : null;

&nbsp;     container.appendChild(createPlayerSilhouette(type, iconForSlot));

&nbsp;   }

&nbsp; } else {

&nbsp;   // CPUs: Cycle through the randomized list

&nbsp;   for (let i = 0; i < targetCount; i++) {

&nbsp;     const avatar =

&nbsp;       iconList.length > 0 ? iconList\[i % iconList.length] : { icon: '🤖' };

&nbsp;     container.appendChild(

&nbsp;       createPlayerSilhouette(type, avatar.icon as string)

&nbsp;     );

&nbsp;   }

&nbsp; }

}



// Validation functions that only check, don't show messages

function validatePlayerCounts(): { isValid: boolean; message: string } {

&nbsp; const totalPlayersInput = document.getElementById(

&nbsp;   'total-players-input'

&nbsp; ) as HTMLInputElement;

&nbsp; const cpuPlayersInput = document.getElementById(

&nbsp;   'cpu-players-input'

&nbsp; ) as HTMLInputElement;



&nbsp; if (!totalPlayersInput || !cpuPlayersInput) {

&nbsp;   return { isValid: false, message: 'Form inputs not found.' };

&nbsp; }



&nbsp; const numHumans = parseInt(totalPlayersInput.value || '1', 10);

&nbsp; const numCPUs = parseInt(cpuPlayersInput.value || '0', 10);

&nbsp; const totalPlayers = numHumans + numCPUs;

&nbsp; const minHumans = state.getIsSpectator() ? 0 : 1;



&nbsp; if (totalPlayers < 2) {

&nbsp;   return {

&nbsp;     isValid: false,

&nbsp;     message: 'Minimum of 2 participants are required.',

&nbsp;   };

&nbsp; }

&nbsp; if (numHumans < minHumans) {

&nbsp;   return {

&nbsp;     isValid: false,

&nbsp;     message: 'At least 1 human is required.',

&nbsp;   };

&nbsp; }

&nbsp; if (totalPlayers > 4) {

&nbsp;   return { isValid: false, message: 'Maximum of 4 players are allowed.' };

&nbsp; }

&nbsp; return { isValid: true, message: '' };

}



interface NameValidationResult {

&nbsp; isValid: boolean;

&nbsp; message: string;

&nbsp; name: string;

}



function validateNameInput(): NameValidationResult {

&nbsp; const nameInput = uiManager.getNameInput();

&nbsp; if (!nameInput) {

&nbsp;   return { isValid: false, message: 'Name input not found.', name: '' };

&nbsp; }

&nbsp; const name = nameInput.value.trim();

&nbsp; if (!name) {

&nbsp;   if (state.getIsSpectator()) {

&nbsp;     return { isValid: true, message: '', name: 'Spectator' };

&nbsp;   }

&nbsp;   return { isValid: false, message: 'Please enter a valid name.', name };

&nbsp; }

&nbsp; if (name.length < 2) {

&nbsp;   return {

&nbsp;     isValid: false,

&nbsp;     message: 'Name must be at least 2 characters.',

&nbsp;     name,

&nbsp;   };

&nbsp; }

&nbsp; return { isValid: true, message: '', name };

}



// ensureSilhouetteContainers removed - containers are expected to exist in DOM



function validateRoomCodeInput(): {

&nbsp; isValid: boolean;

&nbsp; message: string;

&nbsp; code: string;

} {

&nbsp; const codeInput = document.getElementById(

&nbsp;   'join-code-input'

&nbsp; ) as HTMLInputElement | null;

&nbsp; if (!codeInput) {

&nbsp;   return { isValid: false, message: 'Game code input not found.', code: '' };

&nbsp; }

&nbsp; const code = codeInput.value.trim().toUpperCase();

&nbsp; if (code.length !== 6) {

&nbsp;   return { isValid: false, message: 'Enter a valid 6 character code.', code };

&nbsp; }

&nbsp; return { isValid: true, message: '', code };

}



// Helper function to update the contextual player requirement message

function updatePlayerRequirementMessage() {

&nbsp; // This function is no longer needed since we're using the queue system

&nbsp; // All validation messages are now shown only when Deal button is clicked

&nbsp; // Keeping function for compatibility but it does nothing

}



// Helper function to update the contextual name validation message

function updateNameValidationMessage(

&nbsp; \_message: string = '',

&nbsp; \_showDefault: boolean = false

) {

&nbsp; // This function is no longer needed since we're using the queue system

&nbsp; // All validation messages are now shown only when Deal button is clicked

&nbsp; // Keeping function for compatibility but it does nothing

}



// Initialize counter button functionality

function initializeCounterButtons() {

&nbsp; const humansMinusBtn = document.getElementById('humans-minus');

&nbsp; const humansPlusBtn = document.getElementById('humans-plus');

&nbsp; const cpusMinusBtn = document.getElementById('cpus-minus');

&nbsp; const cpusPlusBtn = document.getElementById('cpus-plus');

&nbsp; const totalPlayersInput = document.getElementById(

&nbsp;   'total-players-input'

&nbsp; ) as HTMLInputElement;

&nbsp; const cpuPlayersInput = document.getElementById(

&nbsp;   'cpu-players-input'

&nbsp; ) as HTMLInputElement;



&nbsp; function updateTotalCount() {

&nbsp;   syncCounterUI();

&nbsp;   updatePlayerRequirementMessage();

&nbsp; }



&nbsp; // Human counter buttons

&nbsp; if (humansMinusBtn) {

&nbsp;   humansMinusBtn.onclick = () => {

&nbsp;     const current = parseInt(totalPlayersInput?.value || '1', 10);

&nbsp;     const minHumans = state.getIsSpectator() ? 0 : 1;

&nbsp;     if (current > minHumans) {

&nbsp;       totalPlayersInput.value = (current - 1).toString();

&nbsp;       updateTotalCount();

&nbsp;     }

&nbsp;   };

&nbsp; }



&nbsp; if (humansPlusBtn) {

&nbsp;   humansPlusBtn.onclick = () => {

&nbsp;     const current = parseInt(totalPlayersInput?.value || '1', 10);

&nbsp;     const cpus = parseInt(cpuPlayersInput?.value || '0', 10);

&nbsp;     if (current + cpus < 4) {

&nbsp;       totalPlayersInput.value = (current + 1).toString();

&nbsp;       updateTotalCount();

&nbsp;     }

&nbsp;   };

&nbsp; }



&nbsp; // CPU counter buttons

&nbsp; if (cpusMinusBtn) {

&nbsp;   cpusMinusBtn.onclick = () => {

&nbsp;     const current = parseInt(cpuPlayersInput?.value || '0', 10);

&nbsp;     if (current > 0) {

&nbsp;       cpuPlayersInput.value = (current - 1).toString();

&nbsp;       updateTotalCount();

&nbsp;     }

&nbsp;   };

&nbsp; }



&nbsp; if (cpusPlusBtn) {

&nbsp;   cpusPlusBtn.onclick = () => {

&nbsp;     const current = parseInt(cpuPlayersInput?.value || '0', 10);

&nbsp;     const humans = parseInt(totalPlayersInput?.value || '1', 10);



&nbsp;     if (current + humans < 4) {

&nbsp;       cpuPlayersInput.value = (current + 1).toString();

&nbsp;       updateTotalCount();

&nbsp;     }

&nbsp;   };

&nbsp; }



&nbsp; // Initialize states

&nbsp; updateTotalCount();

}



function applySpectatorMode(): void {

&nbsp; if (!state.getIsSpectator()) {

&nbsp;   return;

&nbsp; }

&nbsp; document.body.classList.add('spectator-mode');

&nbsp; const nameInput = document.getElementById(

&nbsp;   'player-name-input'

&nbsp; ) as HTMLInputElement | null;

&nbsp; if (nameInput) {

&nbsp;   nameInput.value = 'Spectator';

&nbsp;   nameInput.disabled = true;

&nbsp; }

&nbsp; const totalPlayersInput = document.getElementById(

&nbsp;   'total-players-input'

&nbsp; ) as HTMLInputElement | null;

&nbsp; if (totalPlayersInput) {

&nbsp;   totalPlayersInput.value = '0';

&nbsp; }

&nbsp; const startBtn = document.getElementById(

&nbsp;   'setup-deal-button'

&nbsp; ) as HTMLButtonElement | null;

&nbsp; if (startBtn) {

&nbsp;   startBtn.textContent = 'START CPU MATCH';

&nbsp; }

&nbsp; syncCounterUI();

}



// Initialize the Avatar Picker

function initializeAvatarPicker() {

&nbsp; const grid = document.getElementById('avatar-grid');

&nbsp; if (!grid) return;

&nbsp; grid.innerHTML = '';



&nbsp; royaltyAvatars.forEach((av) => {

&nbsp;   const el = document.createElement('div');

&nbsp;   el.className = 'avatar-option';

&nbsp;   el.textContent = av.icon;

&nbsp;   el.title = av.label;



&nbsp;   if (selectedAvatar \&\& selectedAvatar.id === av.id) {

&nbsp;     el.classList.add('selected');

&nbsp;   }



&nbsp;   el.onclick = () => {

&nbsp;     // 1. Select the avatar

&nbsp;     selectedAvatar = av;



&nbsp;     // 2. Visual update of grid

&nbsp;     grid

&nbsp;       .querySelectorAll('.avatar-option')

&nbsp;       .forEach((opt) => opt.classList.remove('selected'));

&nbsp;     el.classList.add('selected');



&nbsp;     updateAvatarDropdownUI();

&nbsp;     closeAvatarDropdown();



&nbsp;     // 3. Re-render silhouettes (this puts the avatar in the user slot)

&nbsp;     updatePlayerSilhouettes();

&nbsp;   };

&nbsp;   grid.appendChild(el);

&nbsp; });

}



function shuffleArray<T>(array: T\[]): T\[] {

&nbsp; const newArr = \[...array];

&nbsp; for (let i = newArr.length - 1; i > 0; i--) {

&nbsp;   const j = Math.floor(Math.random() \* (i + 1));

&nbsp;   \[newArr\[i], newArr\[j]] = \[newArr\[j], newArr\[i]];

&nbsp; }

&nbsp; return newArr;

}



/\*\*

&nbsp;\* Main entry point for initializing the lobby.

&nbsp;\* Pre-loads avatar data and then sets up all event listeners.

&nbsp;\*/

export async function initializeLobby() {

&nbsp; console.log('🚀 \[events.ts] Initializing lobby...');

&nbsp; try {

&nbsp;   const avatarModule = await import('../../src/shared/avatars.js');

&nbsp;   royaltyAvatars = avatarModule.ROYALTY\_AVATARS;



&nbsp;   // Randomize avatar immediately on load

&nbsp;   selectedAvatar = royaltyAvatars\[Math.floor(Math.random() \* royaltyAvatars.length)];



&nbsp;   // Create a shuffled pool for bots so they look random

&nbsp;   shuffledBotAvatars = shuffleArray(royaltyAvatars);



&nbsp;   initializePageEventListeners();

&nbsp; } catch (err) {

&nbsp;   console.error(

&nbsp;     '🚨 Failed to load critical avatar data. Lobby may not function correctly.',

&nbsp;     err

&nbsp;   );

&nbsp;   // Still attempt to initialize the page, but avatars will be broken.

&nbsp;   initializePageEventListeners();

&nbsp; }

}



export function initializePageEventListeners() {

&nbsp; console.log('🚀 \[events.ts] initializePageEventListeners called!');



&nbsp; // Initialize avatar picker

&nbsp; initializeAvatarPicker();

&nbsp; updateAvatarDropdownUI();

&nbsp; syncCounterUI();

&nbsp; // Ensure silhouettes render after DOM is ready

&nbsp; document.addEventListener('DOMContentLoaded', () => {

&nbsp;   updatePlayerSilhouettes();

&nbsp; });



&nbsp; // Only setup modal buttons now (header buttons removed)

&nbsp; const setupRulesButton = document.getElementById('setup-rules-button');

&nbsp; const setupTutorialButton = document.getElementById('setup-tutorial-button');

&nbsp; const setupDealButton = document.getElementById('setup-deal-button');

&nbsp; const joinRulesButton = document.getElementById('join-rules-button');

&nbsp; const gameRulesButton = document.getElementById('game-rules-button');



&nbsp; if (setupRulesButton) {

&nbsp;   setupRulesButton.addEventListener('click', handleRulesClick);

&nbsp; }



&nbsp; if (setupTutorialButton) {

&nbsp;   setupTutorialButton.addEventListener('click', () => {

&nbsp;     // Reload page with tutorial flag

&nbsp;     window.location.href = '/?tutorial=true';

&nbsp;   });

&nbsp; }



&nbsp; if (joinRulesButton) {

&nbsp;   joinRulesButton.addEventListener('click', handleRulesClick);

&nbsp; }



&nbsp; if (gameRulesButton) {

&nbsp;   gameRulesButton.addEventListener('click', handleGameRulesClick);

&nbsp; }



&nbsp; if (setupDealButton) {

&nbsp;   setupDealButton.addEventListener('click', handleDealClick);

&nbsp; }



&nbsp; const lobbyForm = document.getElementById('lobby-form');

&nbsp; const lobbyTabButtons = document.querySelectorAll(

&nbsp;   '.lobby-tab-button'

&nbsp; ) as NodeListOf<HTMLButtonElement>;

&nbsp; const lobbyTabPanels = document.querySelectorAll(

&nbsp;   '.lobby-tab-panel'

&nbsp; ) as NodeListOf<HTMLElement>;



&nbsp; let hostPanelHeight = 0;



&nbsp; function setLobbyTab(tab: 'host' | 'join') {

&nbsp;   if (lobbyForm) {

&nbsp;     lobbyForm.setAttribute('data-lobby-tab', tab);

&nbsp;   }



&nbsp;   lobbyTabButtons.forEach((button) => {

&nbsp;     const isActive = button.dataset.tab === tab;

&nbsp;     button.classList.toggle('is-active', isActive);

&nbsp;     button.setAttribute('aria-selected', isActive ? 'true' : 'false');

&nbsp;   });



&nbsp;   lobbyTabPanels.forEach((panel) => {

&nbsp;     const isActive = panel.dataset.tabPanel === tab;

&nbsp;     panel.classList.toggle('is-active', isActive);

&nbsp;   });



&nbsp;   const hostPanel = document.querySelector(

&nbsp;     '.lobby-tab-panel--host'

&nbsp;   ) as HTMLElement | null;

&nbsp;   const joinPanel = document.querySelector(

&nbsp;     '.lobby-tab-panel--join'

&nbsp;   ) as HTMLElement | null;



&nbsp;   if (tab === 'host' \&\& hostPanel) {

&nbsp;     hostPanelHeight = hostPanel.offsetHeight;

&nbsp;     if (joinPanel) {

&nbsp;       joinPanel.style.minHeight = '';

&nbsp;     }

&nbsp;   }



&nbsp;   if (tab === 'join' \&\& joinPanel \&\& hostPanelHeight > 0) {

&nbsp;     joinPanel.style.minHeight = `${hostPanelHeight}px`;

&nbsp;   }

&nbsp; }



&nbsp; if (lobbyTabButtons.length > 0) {

&nbsp;   setLobbyTab('host');

&nbsp;   lobbyTabButtons.forEach((button) => {

&nbsp;     button.addEventListener('click', () => {

&nbsp;       const tab = button.dataset.tab === 'join' ? 'join' : 'host';

&nbsp;       setLobbyTab(tab);

&nbsp;     });

&nbsp;   });

&nbsp; }



&nbsp; try {

&nbsp;   // Load state after handlers are attached

&nbsp;   state.loadSession();

&nbsp;   applySpectatorMode();

&nbsp; } catch (stateError) {

&nbsp;   console.error('❌ Error loading state:', stateError);

&nbsp; }



&nbsp; // UI hooks

&nbsp; const joinGameButton = document.getElementById('join-game-button');

&nbsp; if (joinGameButton) {

&nbsp;   joinGameButton.addEventListener('click', handleJoinGameClick);

&nbsp; }



&nbsp; // Dev-only restart button (only works if button is visible)

&nbsp; const devRestartButton = document.getElementById('dev-restart-button');

&nbsp; if (devRestartButton) {

&nbsp;   devRestartButton.addEventListener('click', handleDevRestart);

&nbsp; }



&nbsp; const backToLobbyButton = uiManager.getBackToLobbyButton();

&nbsp; if (backToLobbyButton) {

&nbsp;   backToLobbyButton.onclick = () => {

&nbsp;     sessionStorage.clear();

&nbsp;     uiManager.showLobbyForm();

&nbsp;   };

&nbsp; }



&nbsp; // === MODAL CLOSE HANDLERS ===

&nbsp; const rulesModal = document.getElementById('rules-modal');

&nbsp; const overlay = document.getElementById('modal-overlay');



&nbsp; if (rulesModal \&\& overlay) {

&nbsp;   // Close button in rules modal

&nbsp;   const closeBtn = rulesModal.querySelector(

&nbsp;     '.modal\_\_close-button'

&nbsp;   ) as HTMLButtonElement;

&nbsp;   if (closeBtn) {

&nbsp;     closeBtn.onclick = hideRulesModalAndOverlay;

&nbsp;   }



&nbsp;   // Close modal when clicking overlay

&nbsp;   overlay.addEventListener('click', (e) => {

&nbsp;     if (

&nbsp;       e.target === overlay \&\&

&nbsp;       !rulesModal.classList.contains('modal--hidden')

&nbsp;     ) {

&nbsp;       hideRulesModalAndOverlay();

&nbsp;     }

&nbsp;   });



&nbsp;   // "Got it!" button in rules modal

&nbsp;   const gotItBtn = document.getElementById('rules-gotit-btn');

&nbsp;   if (gotItBtn) {

&nbsp;     gotItBtn.onclick = hideRulesModalAndOverlay;

&nbsp;   }

&nbsp; }



&nbsp; // === RULES MODAL FEATURES ===



&nbsp; // Expand/Collapse All Rules Sections

&nbsp; const expandCollapseBtn = document.getElementById('expand-collapse-all-btn');

&nbsp; if (expandCollapseBtn \&\& rulesModal) {

&nbsp;   const getDetailsList = () =>

&nbsp;     Array.from(rulesModal.querySelectorAll('details.rules-section')).filter(

&nbsp;       (el): el is HTMLDetailsElement => el instanceof HTMLDetailsElement

&nbsp;     );



&nbsp;   const updateExpandCollapseLabel = () => {

&nbsp;     const detailsList = getDetailsList();

&nbsp;     if (!expandCollapseBtn) {

&nbsp;       return;

&nbsp;     }



&nbsp;     const allOpen =

&nbsp;       detailsList.length > 0 \&\& detailsList.every((d) => d.open);

&nbsp;     expandCollapseBtn.textContent = allOpen ? 'Collapse All' : 'Expand All';

&nbsp;   };



&nbsp;   expandCollapseBtn.addEventListener('click', function () {

&nbsp;     const detailsList = getDetailsList();



&nbsp;     if (detailsList.length === 0) {

&nbsp;       updateExpandCollapseLabel(); // Ensure label is correct

&nbsp;       return;

&nbsp;     }



&nbsp;     // Determine the desired state: if button says "Expand All", we want them open.

&nbsp;     const shouldBeOpen = expandCollapseBtn.textContent === 'Expand All';



&nbsp;     detailsList.forEach((d) => {

&nbsp;       const summaryElement = d.querySelector('summary');

&nbsp;       if (!summaryElement) {

&nbsp;         return; // Skip this one

&nbsp;       }



&nbsp;       // If the current state is different from the desired state, click the summary

&nbsp;       if (d.open !== shouldBeOpen) {

&nbsp;         summaryElement.click(); // This will trigger the 'toggle' event, which calls updateExpandCollapseLabel

&nbsp;       }

&nbsp;     });

&nbsp;     // The 'toggle' event listener on rulesModal (which calls updateExpandCollapseLabel)

&nbsp;     // should handle updating the main button's text after each programmatic click.

&nbsp;   });



&nbsp;   // Update label when modal is shown (handled by the main onclick handler above)



&nbsp;   // Also update label when any individual section is toggled by the user

&nbsp;   rulesModal.addEventListener(

&nbsp;     'toggle',

&nbsp;     (event) => {

&nbsp;       if (

&nbsp;         event.target instanceof HTMLDetailsElement \&\&

&nbsp;         event.target.classList.contains('rules-section')

&nbsp;       ) {

&nbsp;         updateExpandCollapseLabel();

&nbsp;       }

&nbsp;     },

&nbsp;     true

&nbsp;   );



&nbsp;   // Initial label setup when the page loads

&nbsp;   updateExpandCollapseLabel();

&nbsp; }

&nbsp; // Ensure the Start Game button is enabled/disabled when lobby updates

&nbsp; const observer = new MutationObserver(updateStartGameButton);

&nbsp; const playerList = document.getElementById('player-list');

&nbsp; if (playerList) {

&nbsp;   observer.observe(playerList, { childList: true, subtree: false });

&nbsp; }

&nbsp; // Lobby form validation and error handling

&nbsp; const totalPlayersInput = document.getElementById(

&nbsp;   'total-players-input'

&nbsp; ) as HTMLInputElement;

&nbsp; const cpuPlayersInput = document.getElementById(

&nbsp;   'cpu-players-input'

&nbsp; ) as HTMLInputElement;



&nbsp; // Initialize input event listeners for real-time player count validation

&nbsp; if (totalPlayersInput) {

&nbsp;   totalPlayersInput.addEventListener('input', () => {

&nbsp;     updatePlayerRequirementMessage();

&nbsp;   });

&nbsp; }

&nbsp; if (cpuPlayersInput) {

&nbsp;   cpuPlayersInput.addEventListener('input', () => {

&nbsp;     updatePlayerRequirementMessage();

&nbsp;   });

&nbsp; }



&nbsp; try {

&nbsp;   // Initialize counter buttons

&nbsp;   initializeCounterButtons();

&nbsp; } catch (counterError) {

&nbsp;   console.error('❌ Error initializing counter buttons:', counterError);

&nbsp; }



&nbsp; // Initialize player requirement message on page load

&nbsp; updatePlayerRequirementMessage();



&nbsp; // Do not show name validation message on page load

&nbsp; updateNameValidationMessage();



&nbsp; // Initialize the validation message queue system - hide any messages on page load

&nbsp; clearMessageQueueAndHide();



&nbsp; // Add real-time validation for the name input field

&nbsp; const nameInput = uiManager.getNameInput();

&nbsp; if (nameInput) {

&nbsp;   nameInput.addEventListener('input', () => {

&nbsp;     const nameValidation = validateNameInput();



&nbsp;     if (nameValidation.isValid) {

&nbsp;       // Name is now valid - remove any name errors from queue and hide if currently showing

&nbsp;       if (hasNameErrorInQueue() || isCurrentlyShowingNameError()) {

&nbsp;         removeNameErrorsFromQueue();



&nbsp;         // If currently showing a name error, either hide it or show next message

&nbsp;         if (isCurrentlyShowingNameError()) {

&nbsp;           if (messageQueue.length > 0) {

&nbsp;             // Skip to next message in queue

&nbsp;             if (messageTimeoutId) {

&nbsp;               clearTimeout(messageTimeoutId);

&nbsp;               messageTimeoutId = null;

&nbsp;             }

&nbsp;             displayNextMessage();

&nbsp;           } else {

&nbsp;             // No more messages, hide the display

&nbsp;             clearMessageQueueAndHide();

&nbsp;           }

&nbsp;         }

&nbsp;       }

&nbsp;     }

&nbsp;     // Removed the else block - don't show errors during typing

&nbsp;     // Errors will only be shown when "Let's Play" button is clicked

&nbsp;   });

&nbsp; }

}



// —– UI helper functions —–

function updateStartGameButton() {

&nbsp; // Update to target the setup Deal button instead of header button

&nbsp; const startGameBtn = document.getElementById('setup-deal-button');

&nbsp; if (startGameBtn) {

&nbsp;   const totalPlayersInput = document.getElementById(

&nbsp;     'total-players-input'

&nbsp;   ) as HTMLInputElement;

&nbsp;   const cpuPlayersInput = document.getElementById(

&nbsp;     'cpu-players-input'

&nbsp;   ) as HTMLInputElement;

&nbsp;   const humanCount = parseInt(totalPlayersInput?.value || '1', 10);

&nbsp;   const computerCount = parseInt(cpuPlayersInput?.value || '1', 10);

&nbsp;   const minHumans = state.getIsSpectator() ? 0 : 1;

&nbsp;   setButtonDisabled(

&nbsp;     startGameBtn,

&nbsp;     !(humanCount >= minHumans \&\& humanCount + computerCount >= 2)

&nbsp;   );

&nbsp; }

}



// Separate handler functions to prevent duplicate listeners

function openRulesModal() {

&nbsp; console.log('dYZ\_ Rules button clicked!');

&nbsp; const rulesModal = document.getElementById('rules-modal');

&nbsp; const overlay = document.getElementById('modal-overlay');

&nbsp; const lobbyContainer = document.getElementById('lobby-container');



&nbsp; if (rulesModal \&\& overlay) {

&nbsp;   // Hide the lobby container when showing the rules modal

&nbsp;   if (lobbyContainer) {

&nbsp;     lobbyContainer.style.display = 'none';

&nbsp;   }



&nbsp;   rulesModal.classList.remove('modal--hidden');

&nbsp;   overlay.classList.remove('modal\_\_overlay--hidden');

&nbsp;   document.body.classList.add('rules-modal-open');

&nbsp;   document.documentElement.classList.add('rules-modal-open');



&nbsp;   // Trigger card image updates by dispatching a custom event

&nbsp;   setTimeout(() => {

&nbsp;     try {

&nbsp;       // Dispatch a custom event that rules-cards.ts will listen for

&nbsp;       const cardUpdateEvent = new CustomEvent('update-rule-cards');

&nbsp;       document.dispatchEvent(cardUpdateEvent);

&nbsp;     } catch (e) {

&nbsp;       console.error('Failed to dispatch card update event:', e);

&nbsp;     }

&nbsp;   }, 100);



&nbsp;   console.log('Rules modal opened, lobby hidden');

&nbsp; } else {

&nbsp;   console.error('Rules modal or overlay not found');

&nbsp; }

}



document.addEventListener('open-rules-modal', openRulesModal);



function handleRulesClick() {

&nbsp; if (document.body.classList.contains('showing-game')) {

&nbsp;   return;

&nbsp; }

&nbsp; openRulesModal();

}



function handleGameRulesClick() {

&nbsp; openRulesModal();

}



async function handleDealClick() {

&nbsp; console.log('🎯 Deal button clicked!');

&nbsp; clearMessageQueueAndHide(); // Clear any old messages first



&nbsp; const nameValidation = validateNameInput();

&nbsp; const playerCountValidation = validatePlayerCounts();



&nbsp; let allValid = true;



&nbsp; if (!nameValidation.isValid) {

&nbsp;   queueMessage(nameValidation.message);

&nbsp;   allValid = false;

&nbsp; }

&nbsp; if (!playerCountValidation.isValid) {

&nbsp;   queueMessage(playerCountValidation.message);

&nbsp;   allValid = false;

&nbsp; }



&nbsp; if (!allValid) {

&nbsp;   if (!nameValidation.isValid) {

&nbsp;     const nameInput = uiManager.getNameInput();

&nbsp;     if (nameInput) nameInput.focus();

&nbsp;   }

&nbsp;   return; // Stop processing if there are errors

&nbsp; }



&nbsp; // --- If all validations pass, proceed with game logic ---

&nbsp; const name = nameValidation.name;

&nbsp; const totalPlayersInput = document.getElementById(

&nbsp;   'total-players-input'

&nbsp; ) as HTMLInputElement;

&nbsp; const cpuPlayersInput = document.getElementById(

&nbsp;   'cpu-players-input'

&nbsp; ) as HTMLInputElement;

&nbsp; const isSpectator = state.getIsSpectator();

&nbsp; const numHumans = isSpectator

&nbsp;   ? 0

&nbsp;   : parseInt(totalPlayersInput.value, 10) || 1;

&nbsp; const numCPUs = parseInt(cpuPlayersInput.value, 10) || 0;



&nbsp; state.setDesiredCpuCount(numCPUs);



&nbsp; const playerDataForEmit: {

&nbsp;   playerName: string;

&nbsp;   avatar?: string;

&nbsp;   numHumans: number;

&nbsp;   numCPUs: number;

&nbsp;   spectator?: boolean;

&nbsp; } = {

&nbsp;   playerName: name,

&nbsp;   numHumans: numHumans,

&nbsp;   numCPUs: numCPUs,

&nbsp; };

&nbsp; if (selectedAvatar) {

&nbsp;   (playerDataForEmit as any).avatar = selectedAvatar.icon;

&nbsp; }

&nbsp; if (isSpectator) {

&nbsp;   playerDataForEmit.spectator = true;

&nbsp; }



&nbsp; console.log(

&nbsp;   '🎯 Deal button: Validations passed. Joining game with data:',

&nbsp;   playerDataForEmit

&nbsp; );

&nbsp; console.log(

&nbsp;   '\[CLIENT] handleDealClick: Emitting JOIN\_GAME with',

&nbsp;   playerDataForEmit

&nbsp; );



&nbsp; // Log socket connection status before attempting to emit

&nbsp; console.log('\[CLIENT] Socket connection status before JOIN\_GAME:', {

&nbsp;   socketExists: !!state.socket,

&nbsp;   connected: state.socket?.connected,

&nbsp;   id: state.socket?.id,

&nbsp;   hasJoinedListeners: state.socket

&nbsp;     ? state.socket.listeners(JOINED).length

&nbsp;     : 0,

&nbsp;   hasLobbyStateListeners: state.socket

&nbsp;     ? state.socket.listeners(LOBBY\_STATE\_UPDATE).length

&nbsp;     : 0,

&nbsp; });



&nbsp; // Add a callback to log the server's response

&nbsp; await state.socketReady;

&nbsp; if (!state.socket || state.socket.connected === false) {

&nbsp;   queueMessage('Unable to connect to server. Please try again.');

&nbsp;   return;

&nbsp; }



&nbsp; state.socket.emit(JOIN\_GAME, playerDataForEmit, (response: any) => {

&nbsp;   console.log('\[CLIENT] Received JOIN\_GAME response from server:', response);

&nbsp;   const dealButton = document.getElementById(

&nbsp;     'setup-deal-button'

&nbsp;   ) as HTMLButtonElement;

&nbsp;   const idleLabel = isSpectator ? 'START CPU MATCH' : "LET'S PLAY";

&nbsp;   if (response.error) {

&nbsp;     console.error('\[CLIENT] JOIN\_GAME error:', response.error);

&nbsp;     queueMessage(response.error);

&nbsp;     if (dealButton) {

&nbsp;       dealButton.disabled = false;

&nbsp;       dealButton.textContent = idleLabel;

&nbsp;     }

&nbsp;   } else {

&nbsp;     console.log(

&nbsp;       '\[CLIENT] JOIN\_GAME success - Room ID:',

&nbsp;       response.roomId,

&nbsp;       'Player ID:',

&nbsp;       response.playerId

&nbsp;     );

&nbsp;     // --- BEST PRACTICE: Reset form fields after successful join ---

&nbsp;     const form = document.getElementById(

&nbsp;       'lobby-form'

&nbsp;     ) as HTMLFormElement | null;

&nbsp;     if (form) {

&nbsp;       form.reset();

&nbsp;       syncCounterUI();

&nbsp;     }

&nbsp;     if (dealButton) {

&nbsp;       dealButton.disabled = false;

&nbsp;       dealButton.textContent = idleLabel;

&nbsp;     }

&nbsp;     if (isSpectator) {

&nbsp;       state.socket.emit(START\_GAME, { computerCount: numCPUs });

&nbsp;     }

&nbsp;   }

&nbsp; });



&nbsp; const dealButton = document.getElementById(

&nbsp;   'setup-deal-button'

&nbsp; ) as HTMLButtonElement;

&nbsp; if (dealButton) {

&nbsp;   dealButton.disabled = true;

&nbsp;   dealButton.textContent = 'STARTING...';

&nbsp; }

}



// Dev-only: Restart game with same settings

async function handleDevRestart() {

&nbsp; console.log('🔄 \[DEV] Restarting game with same settings...');



&nbsp; const lastState = state.getLastGameState();

&nbsp; if (!lastState) {

&nbsp;   console.warn('\[DEV] No previous game state found');

&nbsp;   return;

&nbsp; }



&nbsp; // Extract settings from last game

&nbsp; const players = lastState.players || \[];

&nbsp; const numHumans = players.filter((p: any) => !p.isComputer).length;

&nbsp; const numCPUs = players.filter((p: any) => p.isComputer).length;

&nbsp; const myName =

&nbsp;   players.find((p: any) => p.id === state.myId)?.name || 'Dev Player';



&nbsp; console.log(

&nbsp;   `\[DEV] Extracted settings: ${numHumans} humans, ${numCPUs} CPUs, name: ${myName}`

&nbsp; );



&nbsp; // Leave current game

&nbsp; if (state.socket \&\& state.socket.connected) {

&nbsp;   state.socket.disconnect();

&nbsp;   await new Promise((resolve) => setTimeout(resolve, 100));

&nbsp; }



&nbsp; // Clear session

&nbsp; state.setCurrentRoom(null);

&nbsp; state.setMyId(null);

&nbsp; state.saveSession();



&nbsp; // Reconnect and create new game

&nbsp; await state.socketReady;

&nbsp; state.socket.connect();



&nbsp; // Wait for connection

&nbsp; await new Promise<void>((resolve) => {

&nbsp;   if (state.socket.connected) {

&nbsp;     resolve();

&nbsp;   } else {

&nbsp;     state.socket.once('connect', () => resolve());

&nbsp;   }

&nbsp; });



&nbsp; // Create new game with same settings

&nbsp; const playerData = {

&nbsp;   playerName: myName,

&nbsp;   numHumans: numHumans,

&nbsp;   numCPUs: numCPUs,

&nbsp;   // Only attach avatar if user explicitly selected one

&nbsp;   ...(selectedAvatar ? { avatar: selectedAvatar.icon } : {}),

&nbsp; };



&nbsp; console.log('\[DEV] Creating new game with:', playerData);



&nbsp; state.socket.emit(JOIN\_GAME, playerData, (response: any) => {

&nbsp;   if (response?.error) {

&nbsp;     console.error('\[DEV] Failed to create game:', response.error);

&nbsp;   } else {

&nbsp;     console.log(

&nbsp;       '\[DEV] Game created successfully, animation will trigger on STATE\_UPDATE'

&nbsp;     );

&nbsp;   }

&nbsp; });

}



async function handleJoinGameClick() {

&nbsp; console.log('🎯 Join game button clicked!');

&nbsp; clearMessageQueueAndHide();



&nbsp; const joinBtn = document.getElementById(

&nbsp;   'join-game-button'

&nbsp; ) as HTMLButtonElement | null;

&nbsp; if (joinBtn \&\& joinBtn.disabled) {

&nbsp;   // Prevent duplicate emits if already disabled

&nbsp;   return;

&nbsp; }



&nbsp; const nameValidation = validateNameInput();

&nbsp; const codeValidation = validateRoomCodeInput();



&nbsp; let allValid = true;

&nbsp; if (!nameValidation.isValid) {

&nbsp;   queueMessage(nameValidation.message);

&nbsp;   allValid = false;

&nbsp; }

&nbsp; if (!codeValidation.isValid) {

&nbsp;   queueMessage(codeValidation.message);

&nbsp;   allValid = false;

&nbsp; }



&nbsp; if (!allValid) {

&nbsp;   if (!nameValidation.isValid) {

&nbsp;     const nameInput = uiManager.getNameInput();

&nbsp;     if (nameInput) nameInput.focus();

&nbsp;   }

&nbsp;   if (joinBtn) joinBtn.disabled = false; // Re-enable button on validation error

&nbsp;   return;

&nbsp; }



&nbsp; const name = nameValidation.name;

&nbsp; const code = codeValidation.code;

&nbsp; state.setCurrentRoom(code);

&nbsp; state.saveSession();



&nbsp; const joinPayload = {

&nbsp;   roomId: code,

&nbsp;   playerName: name,

&nbsp;   // Only include avatar when selected

&nbsp;   ...(selectedAvatar ? { avatar: selectedAvatar.icon } : {}),

&nbsp;   numHumans: 1,

&nbsp;   numCPUs: 0,

&nbsp; };

&nbsp; console.log(

&nbsp;   '\[CLIENT] handleJoinGameClick: Emitting JOIN\_GAME with',

&nbsp;   joinPayload

&nbsp; );

&nbsp; await state.socketReady;

&nbsp; if (!state.socket || state.socket.connected === false) {

&nbsp;   queueMessage('Unable to connect to server. Please try again.');

&nbsp;   if (joinBtn) joinBtn.disabled = false;

&nbsp;   return;

&nbsp; }



&nbsp; state.socket.emit(JOIN\_GAME, joinPayload, (response: any) => {

&nbsp;   if (joinBtn) joinBtn.disabled = false; // Re-enable button after server response

&nbsp;   if (response \&\& response.error) {

&nbsp;     queueMessage(response.error);

&nbsp;     state.setCurrentRoom(null);

&nbsp;     state.saveSession();

&nbsp;     return;

&nbsp;   }

&nbsp;   // --- BEST PRACTICE: Reset form fields after successful join ---

&nbsp;   const form = document.getElementById(

&nbsp;     'lobby-form'

&nbsp;   ) as HTMLFormElement | null;

&nbsp;   if (form) {

&nbsp;     form.reset();

&nbsp;     syncCounterUI();

&nbsp;   }

&nbsp; });



&nbsp; if (joinBtn) joinBtn.disabled = true;

}



// Failsafe: Always hide overlay when hiding rules modal

function hideRulesModalAndOverlay() {

&nbsp; const rulesModal = document.getElementById('rules-modal');

&nbsp; const overlay = document.getElementById('modal-overlay');

&nbsp; const lobbyContainer = document.getElementById('lobby-container');



&nbsp; if (rulesModal) rulesModal.classList.add('modal--hidden');

&nbsp; if (overlay) overlay.classList.add('modal\_\_overlay--hidden');

&nbsp; document.body.classList.remove('rules-modal-open');

&nbsp; document.documentElement.classList.remove('rules-modal-open');



&nbsp; // Show the lobby container again when hiding the rules modal

&nbsp; if (lobbyContainer) {

&nbsp;   lobbyContainer.style.display = ''; // Resets to default display value

&nbsp; }



&nbsp; console.log('✅ Rules modal closed, lobby restored');

}



export { handleRulesClick, hideRulesModalAndOverlay };

