// public/scripts/state.ts
import { io, Socket } from 'socket.io-client'; // Corrected import quote style

export const socket: Socket = io({
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
});

export let myId: string | null = null;
export let currentRoom: string | null = null;
export let pileTransition: boolean = false;
export let specialEffectsQueue: any[] = []; // Consider defining a type for effects
export let processingEffects: boolean = false;

export const stateHistory: any[] = []; // Consider defining a type for state history items
export let stateIndex: number = -1;

// handy DOM‑by‑ID shortcut
/**
 * @param {string} id
 * @returns {HTMLElement | null}
 */
export const $ = (id: string): HTMLElement | null => document.getElementById(id);

// DOM element getter functions - called only when needed
export const getLobbyContainer = (): HTMLElement | null => $('lobby-container');
export const getLobbyFormContent = (): HTMLElement | null => $('lobby-form-content');
export const getWaitingStateDiv = (): HTMLElement | null => $('waiting-state');
export const getTable = (): HTMLElement | null => $('table');
export const getCopyLinkBtn = (): HTMLButtonElement | null =>
  $('copy-link-button') as HTMLButtonElement | null;
export const getRulesButton = (): HTMLButtonElement | null =>
  $('rules-button') as HTMLButtonElement | null;
export const getRulesModal = (): HTMLElement | null => $('rules-modal');
export const getModalOverlay = (): HTMLElement | null => document.querySelector('.modal__backdrop');
export const getBackToLobbyButton = (): HTMLButtonElement | null =>
  $('back-to-lobby-button') as HTMLButtonElement | null;
export const getGameLogEntries = (): HTMLElement | null => $('game-log-entries');
export const getNameInput = (): HTMLInputElement | null =>
  $('name-input') as HTMLInputElement | null;

export function loadSession(): void {
  setMyId(sessionStorage.getItem('myId'));
  setCurrentRoom(sessionStorage.getItem('currentRoom'));
}

export function saveSession(): void {
  if (myId) sessionStorage.setItem('myId', myId);
  if (currentRoom) sessionStorage.setItem('currentRoom', currentRoom);
}

export function setMyId(id: string | null): void {
  myId = id;
}
export function setCurrentRoom(room: string | null): void {
  currentRoom = room;
}
export function setPileTransition(value: boolean): void {
  pileTransition = value;
}
export function setProcessingEffects(value: boolean): void {
  processingEffects = value;
}
export function addSpecialEffect(effect: any): void {
  specialEffectsQueue.push(effect);
}
export function clearSpecialEffects(): void {
  specialEffectsQueue = [];
}
export function setStateIndex(index: number): void {
  stateIndex = index;
}
