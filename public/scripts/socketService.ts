import { renderGameState } from './render.js';
import * as state from './state.js';
import { showLobbyForm, showWaitingState, showGameTable, showError } from './uiManager.js';
import {
  CREATE_LOBBY,
  LOBBY_CREATED,
  JOIN_LOBBY,
  PLAYER_READY,
  LOBBY_STATE_UPDATE,
  GAME_STARTED,
  STATE_UPDATE,
  REJOIN,
  JOINED,
} from '../../src/shared/events.js';
import { GameStateData, ClientStatePlayer } from '../../src/shared/types.js';

export async function initializeSocketHandlers(): Promise<void> {
  await state.socketReady;
  state.socket.on('connect', () => {
    if (state.myId && state.currentRoom) {
      state.socket.emit(REJOIN, state.myId, state.currentRoom);
    } else {
      showLobbyForm();
    }
  });
  state.socket.on(LOBBY_CREATED, (roomId: string) => {
    state.setCurrentRoom(roomId);
  });

  state.socket.on(
    LOBBY_STATE_UPDATE,
    (data: {
      roomId: string;
      players: { id: string; name: string; ready: boolean }[];
      hostId: string | null;
    }) => {
      showWaitingState(data.roomId, data.players.length, data.players.length, data.players);
    }
  );

  state.socket.on(GAME_STARTED, () => {
    showGameTable();
  });
  state.socket.on(STATE_UPDATE, (s: GameStateData) => {
    console.log('Received STATE_UPDATE payload:', JSON.stringify(s, null, 2));
    renderGameState(s, state.myId);
    if (s.started) showGameTable();
  });
  state.socket.on('err', (msg: string) => {
    showError(msg);
  });
}

export function createLobby(playerName: string): void {
  state.socket.emit(CREATE_LOBBY, playerName);
}

export function joinLobby(roomId: string, playerName: string): void {
  state.socket.emit(JOIN_LOBBY, roomId, playerName);
}

export function playerReady(): void {
  state.socket.emit(PLAYER_READY, true);
}
