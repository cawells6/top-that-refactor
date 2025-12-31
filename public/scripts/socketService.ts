import { renderGameState } from './render.js';
import * as state from './state.js';
import {
  showLobbyForm,
  showGameTable,
  showError,
} from './uiManager.js';
import {
  JOINED,
  STATE_UPDATE,
  REJOIN,
} from '../../src/shared/events.js';
import { GameStateData } from '../../src/shared/types.js';

export async function initializeSocketHandlers(): Promise<void> {
  await state.socketReady;
  state.socket.on('connect', () => {
    if (state.currentRoom && state.myId) {
      state.socket.emit(REJOIN, {
        playerId: state.myId,
        roomId: state.currentRoom,
      });
      // Do NOT call showLobbyForm() here. Wait for server response.
    } else {
      showLobbyForm();
    }
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
