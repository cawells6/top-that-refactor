import { renderGameState } from './render.js';
import * as state from './state.js';
import {
  showLobbyForm,
  showWaitingState,
  showGameTable,
  showError,
} from './uiManager.js';
import {
  JOINED,
  STATE_UPDATE,
  REJOIN,
  CREATE_LOBBY,
  LOBBY_CREATED,
  JOIN_LOBBY,
  PLAYER_READY,
  LOBBY_STATE_UPDATE,
  GAME_STARTED,
} from '../../src/shared/events.js';
import { GameStateData, InSessionLobbyState } from '../../src/shared/types.js';

export async function initializeSocketHandlers(): Promise<void> {
  await state.socketReady;
  state.socket.on('connect', () => {
    if (state.currentRoom) {
      state.socket.emit(REJOIN, state.myId, state.currentRoom);
      // Do NOT call showLobbyForm() here. Wait for server response.
    } else {
      showLobbyForm();
    }
  });
  state.socket.on(LOBBY_CREATED, (roomId: string) => {
    state.setCurrentRoom(roomId);
    state.saveSession();
  });

  state.socket.on(LOBBY_STATE_UPDATE, (data: InSessionLobbyState) => {
    showWaitingState(
      data.roomId,
      data.players.length,
      data.players.length,
      data.players
    );
  });

  state.socket.on(
    JOINED,
    (data: { playerId?: string; id?: string; roomId: string }) => {
      const playerId = data.playerId || data.id;
      if (!playerId) {
        console.warn('[Client] JOINED payload missing player id:', data);
        return;
      }
      state.setMyId(playerId);
      state.setCurrentRoom(data.roomId);
      state.saveSession();
    }
  );

  state.socket.on(GAME_STARTED, () => {
    showGameTable();
  });
  state.socket.on(STATE_UPDATE, (s: GameStateData) => {
    if (s.started === true) {
      showGameTable();
    }
    renderGameState(s, state.myId);
  });
  // Handle error or failed rejoin from server
  state.socket.on('err', (msg: string) => {
    showLobbyForm();
    showError(msg);
    // Clear stored room and player IDs if rejoin fails
    state.setCurrentRoom(null);
    state.setMyId(null);
    state.saveSession(); // Persist cleared session
  });
}

export function createLobby(playerName: string): void {
  state.socket.emit(CREATE_LOBBY, playerName);
}

export function joinLobby(roomId: string, playerName: string): void {
  state.socket.emit(JOIN_LOBBY, roomId, playerName);
}

export function playerReady(playerName: string): void {
  state.socket.emit(PLAYER_READY, playerName);
}
