import { renderGameState, showCardEvent, renderPlayedCards } from './render.js';
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
  CARD_PLAYED,
} from '../../src/shared/events.js';
import { GameStateData, Card } from '../../src/shared/types.js';

let isAnimatingSpecialEffect = false;
let pendingStateUpdate: GameStateData | null = null;
const ANIMATION_DELAY_MS = 2000;

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

  // 1. Force the card to appear immediately (before the effect logic hides it)
  state.socket.on(CARD_PLAYED, (data: { cards: Card[] }) => {
    if (data.cards && data.cards.length > 0) {
      renderPlayedCards(data.cards);
    }
  });

  state.socket.on(STATE_UPDATE, (s: GameStateData) => {
    state.setLastGameState(s);
    if (s.started === true) {
      showGameTable();
    }
    
    // 3. Buffer the update if we are busy showing an explosion
    if (isAnimatingSpecialEffect) {
      pendingStateUpdate = s;
    } else {
      renderGameState(s, state.myId);
    }
  });

  state.socket.on(GAME_STARTED, (s?: GameStateData) => {
    showGameTable();
    if (s) {
      state.setLastGameState(s);
      renderGameState(s, state.myId);
    }
  });

  // 2. Trigger animation and block subsequent state updates
  state.socket.on(
    SPECIAL_CARD_EFFECT,
    (payload: { type?: string; value?: number | string | null }) => {
      isAnimatingSpecialEffect = true;
      showCardEvent(payload?.value ?? null, payload?.type ?? 'regular');
      
      setTimeout(() => {
        isAnimatingSpecialEffect = false;
        if (pendingStateUpdate) {
          renderGameState(pendingStateUpdate, state.myId);
          pendingStateUpdate = null;
        }
      }, ANIMATION_DELAY_MS);
    }
  );

  state.socket.on(PILE_PICKED_UP, () => {
    // Removed icon - just let the state update handle the visual change
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
