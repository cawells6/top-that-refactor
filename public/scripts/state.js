// public/scripts/state.js
export const socket = io({
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
});

export let myId = null;
export let currentRoom = null;
export let pileTransition = false;
export let specialEffectsQueue = [];
export let processingEffects = false;

export const stateHistory = [];
export let stateIndex = -1;

// handy DOM‑by‑ID shortcut
/**
 * @param {string} id
 * @returns {HTMLElement}
 */
export const $ = (id) => document.getElementById(id);

// DOM element getter functions - called only when needed
export const getLobbyContainer = () => $('lobby-container');
export const getLobbyFormContent = () => $('lobby-form-content');
export const getWaitingStateDiv = () => $('waiting-state');
export const getTable = () => $('table');
export const getCopyLinkBtn = () => $('copy-link-button');
export const getRulesButton = () => $('rules-button');
export const getRulesModal = () => $('rules-modal');
export const getModalOverlay = () => document.querySelector('.modal__backdrop');
export const getBackToLobbyButton = () => $('back-to-lobby-button');
export const getGameLogEntries = () => $('game-log-entries');
export const getNameInput = () => $('name-input');

export function loadSession() {
  setMyId(sessionStorage.getItem('myId'));
  setCurrentRoom(sessionStorage.getItem('currentRoom'));
}

export function saveSession() {
  sessionStorage.setItem('myId', myId);
  sessionStorage.setItem('currentRoom', currentRoom);
}

export function setMyId(id) {
  myId = id;
}
export function setCurrentRoom(room) {
  currentRoom = room;
}
export function setPileTransition(value) {
  pileTransition = value;
}
export function setProcessingEffects(value) {
  processingEffects = value;
}
export function addSpecialEffect(effect) {
  specialEffectsQueue.push(effect);
}
export function clearSpecialEffects() {
  specialEffectsQueue = [];
}
export function setStateIndex(index) {
  stateIndex = index;
}
