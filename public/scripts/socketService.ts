import { renderGameState } from './render.js';
import * as state from './state.js';
import { showLobbyForm, showWaitingState, showGameTable, showError } from './uiManager.js';
import { JOINED, PLAYER_JOINED, LOBBY, STATE_UPDATE, REJOIN } from '../../src/shared/events.js';

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
