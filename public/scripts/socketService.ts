import { renderGameState, showCardEvent } from './render.js';
import * as state from './state.js';
import {
  showLobbyForm,
  showGameTable,
  showError,
} from './uiManager.js';
import {
  JOINED,
  GAME_STARTED,
  SPECIAL_CARD_EFFECT,
  PILE_PICKED_UP,
  STATE_UPDATE,
  REJOIN,
  ERROR,
  SESSION_ERROR,
  GAME_OVER,
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
    const timestamp = performance.now();
    console.log(`[SOCKET] STATE_UPDATE received at ${timestamp.toFixed(2)}ms - Pile length: ${s.pile?.length || 0}`);
    if (s.pile && s.pile.length > 0) {
      console.log(`[SOCKET] Top card:`, s.pile[s.pile.length - 1]);
    } else {
      console.log(`[SOCKET] Pile is empty`);
    }
    state.setLastGameState(s);
    if (s.started === true) {
      showGameTable();
    }
    
    // Server now handles timing - just render immediately
    renderGameState(s, state.myId);
  });

  state.socket.on(GAME_STARTED, (s?: GameStateData) => {
    showGameTable();
    if (s) {
      state.setLastGameState(s);
      renderGameState(s, state.myId);
    }
  });

  state.socket.on(
    SPECIAL_CARD_EFFECT,
    (payload: { type?: string; value?: number | string | null }) => {
      const timestamp = performance.now();
      console.log(`[SOCKET] SPECIAL_CARD_EFFECT received at ${timestamp.toFixed(2)}ms - Type: ${payload?.type}, Value: ${payload?.value}`);
      showCardEvent(payload?.value ?? null, payload?.type ?? 'regular');
    }
  );

  state.socket.on(PILE_PICKED_UP, () => {
    // Removed effect - too frequent and monotonous
  });

  // Game over - someone won
  state.socket.on(GAME_OVER, (data: { winnerId: string; winnerName: string }) => {
    const didWin = data.winnerId === state.myId;
    
    // Show game over modal
    const over = document.createElement('div');
    over.id = 'game-over-container';
    over.innerHTML = `
      <div class="modal-content">
        <h1>Game Over!</h1>
        <p>${didWin ? '🎉 You win!' : `${data.winnerName} wins!`}</p>
        <div class="game-over-buttons">
          <button id="new-game-btn" class="btn btn-primary">New Game</button>
          <button id="back-to-lobby-btn" class="btn btn-secondary">Back to Lobby</button>
        </div>
      </div>`;
    document.body.appendChild(over);
    
    // New Game - start fresh game in same room
    document.getElementById('new-game-btn')?.addEventListener('click', () => {
      over.remove();
      // Disconnect socket to force clean reconnect
      state.socket.disconnect();
      // Clear ALL session data
      state.setCurrentRoom(null);
      state.setMyId(null);
      state.setLastGameState(null);
      state.saveSession();
      // Reload to reconnect fresh
      window.location.reload();
    });
    
    // Back to Lobby - clear session completely
    document.getElementById('back-to-lobby-btn')?.addEventListener('click', () => {
      over.remove();
      // Disconnect socket to force clean reconnect
      state.socket.disconnect();
      // Clear session
      state.setCurrentRoom(null);
      state.setMyId(null);
      state.setLastGameState(null);
      state.saveSession();
      // Reload to go back to lobby
      window.location.reload();
    });
  });

  // Recoverable/gameplay errors (e.g. invalid play, not your turn).
  state.socket.on(ERROR, (msg: string) => {
    if (!document.body.classList.contains('showing-game')) {
      showLobbyForm();
    }
    showError(msg);
    if (document.body.classList.contains('showing-game')) {
      showCardEvent(null, 'invalid');
    }
  });

  // Session-fatal errors (e.g. invalid room, failed rejoin).
  state.socket.on(SESSION_ERROR, (msg: string) => {
    showLobbyForm();
    showError(msg);
    // Clear stored room and player IDs if rejoin fails
    state.setCurrentRoom(null);
    state.setMyId(null);
    state.saveSession(); // Persist cleared session
  });
}
