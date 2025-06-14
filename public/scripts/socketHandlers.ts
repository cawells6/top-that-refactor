// socketHandlers.ts
// Handles socket events and communication

import { renderGameState } from './render.js';
import * as state from './state.js';
import { showLobbyForm, showWaitingState, showGameTable, showError } from './uiManager.js';
import {
  JOINED,
  LOBBY_STATE_UPDATE,
  STATE_UPDATE,
  REJOIN,
} from '../../src/shared/events.js';
import { GameStateData } from '../../src/shared/types.js';

export async function initializeSocketHandlers(): Promise<void> {
  await state.socketReady;
  console.log('[CLIENT] initializeSocketHandlers: Socket ready, setting up event listeners');

  // Debug existing listeners using the public API
  if (state.socket) {
    const allEvents = [
      'connect', 'disconnect', 'joined', 'lobby-state-update', 'state-update', 'err',
      // Add any other events you want to check
    ];
    const listenersSummary = allEvents.reduce((acc, event) => {
      acc[event] = state.socket.listeners(event).length;
      return acc;
    }, {} as Record<string, number>);
    console.log('[CLIENT] Existing socket listeners:', listenersSummary);
  }

  state.socket.on('connect', () => {
    console.log('[CLIENT] Socket connected! ID:', state.socket.id);
    if (state.myId && state.currentRoom) {
      console.log('[CLIENT] Attempting to rejoin with ID:', state.myId, 'Room:', state.currentRoom);
      state.socket.emit(REJOIN, state.myId, state.currentRoom);
    } else {
      console.log('[CLIENT] No saved session, showing lobby form');
      showLobbyForm();
    }
  });

  state.socket.on(JOINED, (data: { id: string; roomId: string }) => {
    console.log('[CLIENT] Received JOINED event:', data);
    state.setMyId(data.id);
    state.setCurrentRoom(data.roomId);
    state.saveSession();
  });

  state.socket.on(
    LOBBY_STATE_UPDATE,
    (data: { roomId: string; players: { id: string; name: string; ready: boolean }[] }) => {
      console.log('[CLIENT] Received LOBBY_STATE_UPDATE:', data);
      showWaitingState(data.roomId, data.players.length, data.players.length, data.players);
    }
  );

  state.socket.on(STATE_UPDATE, (s: GameStateData) => {
    console.log('[CLIENT] Received STATE_UPDATE:', s);
    renderGameState(s, state.myId);
    if (s.started) showGameTable();
  });

  state.socket.on('err', (msg: string) => {
    console.error('[CLIENT] Received error event:', msg);
    showError(msg);
  });

  // Add handlers for disconnect and connection problems
  state.socket.on('disconnect', (reason) => {
    console.warn('[CLIENT] Socket disconnected, reason:', reason);
  });

  state.socket.on('connect_error', (error) => {
    console.error('[CLIENT] Connection error:', error);
  });

  console.log('[CLIENT] Socket event handlers initialized');
}
