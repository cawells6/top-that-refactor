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

  // Legacy PLAYER_JOINED event removed

  state.socket.on(
    LOBBY_STATE_UPDATE,
    (data: { roomId: string; players: { id: string; name: string; ready: boolean }[] }) => {
      showWaitingState(data.roomId, data.players.length, data.players.length, data.players);
    }
  );

  state.socket.on(STATE_UPDATE, (s: GameStateData) => {
    console.log('Received STATE_UPDATE:', s); // Added for debugging
    renderGameState(s, state.myId);
    if (s.started) showGameTable();
  });

  state.socket.on('err', (msg: string) => {
    showError(msg);
  });
}
