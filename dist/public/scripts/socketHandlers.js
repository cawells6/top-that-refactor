// @ts-nocheck
// socketHandlers.ts
// Handles socket events and communication
import * as state from './state.js';
import { renderGameState } from './render.js';
import { showLobbyForm, showWaitingState, showGameTable, showError } from './uiManager.js';
import { JOINED, PLAYER_JOINED, LOBBY, STATE_UPDATE, REJOIN } from '../../src/shared/events.js';
export function initializeSocketHandlers() {
    state.socket.on('connect', () => {
        if (state.myId && state.currentRoom) {
            state.socket.emit(REJOIN, state.myId, state.currentRoom);
        }
        else {
            showLobbyForm();
        }
    });
    state.socket.on(JOINED, ({ id, roomId }) => {
        state.setMyId(id);
        state.setCurrentRoom(roomId);
        state.saveSession();
    });
    state.socket.on(PLAYER_JOINED, () => {
        // Handle player joined logic
    });
    state.socket.on(LOBBY, (data) => {
        const { roomId, players, maxPlayers } = data;
        showWaitingState(roomId, players.length, maxPlayers, players);
    });
    state.socket.on(STATE_UPDATE, (s) => {
        console.log('Received STATE_UPDATE:', s); // Added for debugging
        renderGameState(s);
        if (s.started)
            showGameTable();
    });
    state.socket.on('err', (msg) => {
        showError(msg);
    });
}
