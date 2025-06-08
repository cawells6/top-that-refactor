import { JOINED, STATE_UPDATE, REJOIN } from '@shared/events.ts';
import { GameStateData } from '@shared/types.ts';

import { renderGameState } from './render.js';
import * as state from './state.js';
import { showLobbyForm, showGameTable, showError } from './uiManager.js';

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
  state.socket.on(STATE_UPDATE, (s: GameStateData) => {
    console.log('Received STATE_UPDATE payload:', JSON.stringify(s, null, 2));
    renderGameState(s, state.myId);
    if (s.started) showGameTable();
  });
  state.socket.on('err', (msg: string) => {
    showError(msg);
  });
}
