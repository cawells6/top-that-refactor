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
  LOBBY_STATE_UPDATE,
  STATE_UPDATE,
  REJOIN,
  LOBBY_CREATED,
  GAME_STARTED,
  CREATE_LOBBY,
  JOIN_LOBBY,
  PLAYER_READY,
} from '../../src/types/events.js';
import { GameStateData } from '../../src/types/types.js';

export async function initializeSocketHandlers(): Promise<void> {
  await state.socketReady;
  state.socket.on('connect', () => {
    if (state.currentRoom) {
      const rejoinData = {
        playerId: state.myId,
        roomId: state.currentRoom,
      };
      state.socket.emit(REJOIN, rejoinData);
      // Do NOT call showLobbyForm() here. Wait for server response.
    } else {
      showLobbyForm();
    }
  });
  state.socket.on(LOBBY_CREATED, (roomId: string) => {
    state.setCurrentRoom(roomId);
    state.saveSession();
  });

  state.socket.on(
    LOBBY_STATE_UPDATE,
    (data: {
      roomId: string;
      players: { id: string; name: string; ready: boolean }[];
      hostId: string | null;
    }) => {
      showWaitingState(
        data.roomId,
        data.players.length,
        data.players.length,
        data.players
      );
    }
  );

  state.socket.on(JOINED, (data: { playerId: string; roomId: string }) => {
    state.setMyId(data.playerId);
    state.setCurrentRoom(data.roomId);
    state.saveSession();
  });

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
