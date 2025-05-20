import * as state from './state.js';
import { renderGameState } from './render.js';
import { JOINED, PLAYER_JOINED, LOBBY, STATE_UPDATE, REJOIN } from '../../src/shared/events.js';

export const getLobbyContainer = (): HTMLElement | null => document.getElementById('lobby-container');
export const getLobbyFormContent = (): HTMLElement | null => document.getElementById('lobby-form-content');
export const getWaitingStateDiv = (): HTMLElement | null => document.getElementById('waiting-state');
export const getTable = (): HTMLElement | null => document.getElementById('table');
export const getCopyLinkBtn = (): HTMLButtonElement | null => document.getElementById('copy-link-button') as HTMLButtonElement | null;
export const getRulesButton = (): HTMLButtonElement | null => document.getElementById('rules-button') as HTMLButtonElement | null;
export const getRulesModal = (): HTMLElement | null => document.getElementById('rules-modal');
export const getModalOverlay = (): HTMLElement | null => document.querySelector('.modal__backdrop');
export const getBackToLobbyButton = (): HTMLButtonElement | null => document.getElementById('back-to-lobby-button') as HTMLButtonElement | null;
export const getGameLogEntries = (): HTMLElement | null => document.getElementById('game-log-entries');
export const getNameInput = (): HTMLInputElement | null => document.getElementById('name-input') as HTMLInputElement | null;
export const $ = (id: string): HTMLElement | null => document.getElementById(id);

export function showLobbyForm(): void {
  // Implementation for showing the lobby form
}

export function showWaitingState(roomId: string, currentPlayers: number, maxPlayers: number, players: any[]): void {
  // Implementation for showing the waiting state
}

export function showGameTable(): void {
  // Implementation for showing the game table
}

export function showError(msg: string): void {
  // Implementation for showing an error message
}

export function initializeSocketHandlers(): void {
  state.socket.on('connect', () => {
    if (state.myId && state.currentRoom) {
      state.socket.emit(REJOIN, state.myId, state.currentRoom);
    } else {
      showLobbyForm();
    }
  });
  state.socket.on(JOINED, ({ id, roomId }: { id: string; roomId: string }) => {
    state.setMyId(id);
    state.setCurrentRoom(roomId);
    state.saveSession();
  });
  state.socket.on(PLAYER_JOINED, () => {
    // Handle player joined logic
  });
  state.socket.on(LOBBY, (data: { roomId: string; players: any[]; maxPlayers: number }) => {
    const { roomId, players, maxPlayers } = data;
    showWaitingState(roomId, players.length, maxPlayers, players);
  });
  state.socket.on(STATE_UPDATE, (s: any) => {
    console.log('Received STATE_UPDATE:', s); // Added for debugging
    renderGameState(s);
    if (s.started) showGameTable();
  });
  state.socket.on('err', (msg: string) => {
    showError(msg);
  });
}