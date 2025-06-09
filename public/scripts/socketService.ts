import { JOINED, STATE_UPDATE, REJOIN } from '@shared/events.ts';
import { GameStateData } from '@shared/types.ts';

import { renderGameState } from './render.js';
import * as state from './state.js';
import { showLobbyForm, showGameTable, showError } from './uiManager.js';

let socketHandlersInitialized = false;

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
  state.socket.on(JOINED, ({ id, roomId }: { id: string; roomId: string }) => {
    state.setMyId(id);
    state.setCurrentRoom(roomId);
    state.saveSession();
  });
  state.socket.on(STATE_UPDATE, (s: GameStateData) => {
    console.log('[socketService] STATE_UPDATE received:', { started: s.started, payload: s });
    if (s.started === true) {
      console.log('[socketService] STATE_UPDATE: Game has started, calling showGameTable()');
      showGameTable();
    } else {
      console.log('[socketService] STATE_UPDATE: Game not started, not showing game table.');
    }
    renderGameState(s, state.myId);
  });

  // Handle error or failed rejoin from server
  state.socket.on('err', (msg: string) => {
    showLobbyForm();
    showError(msg);
  });
}
