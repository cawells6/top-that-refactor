// @ts-nocheck
// socketHandlers.js
// Handles socket events and communication

import * as state from './state.js';
import { renderGameState } from './render.js';
import { showLobbyForm, showWaitingState, showGameTable, showError } from './uiHelpers.js';

import {
  JOINED,
  PLAYER_JOINED,
  LOBBY,
  STATE_UPDATE,
  REJOIN,
} from '../src/shared/events.js';

export function initializeSocketHandlers() {
  state.socket.on('connect', () => {
    if (state.myId && state.currentRoom) {
      state.socket.emit(REJOIN, state.myId, state.currentRoom);
    } else {
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

  state.socket.on(LOBBY, data => {
    const { roomId, players, maxPlayers } = data;
    showWaitingState(roomId, players.length, maxPlayers);
  });

  state.socket.on(STATE_UPDATE, s => {
    renderGameState(s);
    if (s.started) showGameTable();
  });

  state.socket.on('err', msg => {
    showError(msg);
  });

  // Handle special card animations
  state.socket.on('special-card', type => {
    const img = new Image();
    // Map type to icon file (support both new and legacy names)
    let iconFile = '';
    switch (type) {
      case 'burn': iconFile = '/Burn-icon.png'; break;
      case 'reset': iconFile = '/Reset-icon.png'; break;
      case 'copy': iconFile = '/Copy-icon.png'; break;
      case 'take': iconFile = '/Take pile-icon.png'; break;
      case 'invalid': iconFile = '/Invalid play-icon.png'; break;
      default: iconFile = '/Invalid play-icon.png'; break;
    }
    img.src = iconFile;
    img.classList.add('special-animation');
    img.style.position = 'fixed';
    img.style.left = '50%';
    img.style.top = '50%';
    img.style.transform = 'translate(-50%, -50%) scale(1.2)';
    img.style.zIndex = 9999;
    document.body.appendChild(img);
    setTimeout(() => img.remove(), 1200);
  });

  // Handle game over
  state.socket.on('gameOver', ({ winnerName }) => {
    import('./uiHelpers.js').then(({ showGameOverMessage }) => {
      showGameOverMessage(false, winnerName);
    });
  });
}
