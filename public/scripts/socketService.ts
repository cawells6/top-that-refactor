import { renderGameState, showCardEvent, renderPlayedCards } from './render.js';
import * as state from './state.js';
import { waitForTestContinue } from './manualMode.js';
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
let cardsBeingAnimated: Card[] | null = null;
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
    console.log('[CARD_PLAYED] Received:', data.cards);
    if (data.cards && data.cards.length > 0) {
      renderPlayedCards(data.cards);
      // Store cards being animated so we can keep them visible
      cardsBeingAnimated = data.cards;
    }
  });

  state.socket.on(STATE_UPDATE, (s: GameStateData) => {
    state.setLastGameState(s);
    if (s.started === true) {
      showGameTable();
    }
    
    // 3. Buffer the update if we are busy showing an explosion
    if (isAnimatingSpecialEffect) {
      console.log('[BUFFERED] STATE_UPDATE during animation. Pile:', s.pile);
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
    async (payload: { type?: string; value?: number | string | null }) => {
      console.log('[SPECIAL_CARD_EFFECT] Type:', payload?.type, 'Value:', payload?.value);
      
      isAnimatingSpecialEffect = true;
      
      // Delay icon display slightly to ensure card element exists
      setTimeout(() => {
        showCardEvent(payload?.value ?? null, payload?.type ?? 'regular');
      }, 100);
      
      setTimeout(async () => {
        console.log('[ANIMATION END] Rendering buffered state:', pendingStateUpdate?.pile);
        
        if (pendingStateUpdate) {
          // For burn effects, keep the burned cards visible during icon display
          if (pendingStateUpdate.pile.length === 0 && cardsBeingAnimated && cardsBeingAnimated.length > 0) {
            console.log('[ANIMATION] Keeping cards visible during burn animation');
            // Wait extra time before rendering empty pile
            setTimeout(async () => {
              if (pendingStateUpdate) {
                renderGameState(pendingStateUpdate, state.myId);
              }
              pendingStateUpdate = null;
              cardsBeingAnimated = null;
              isAnimatingSpecialEffect = false;
              
              // BLOCK HERE for test mode
              await waitForTestContinue();
            }, 1500);
          } else {
            renderGameState(pendingStateUpdate, state.myId);
            pendingStateUpdate = null;
            cardsBeingAnimated = null;
            isAnimatingSpecialEffect = false;
            
            // BLOCK HERE for test mode
            await waitForTestContinue();
          }
        } else {
          cardsBeingAnimated = null;
          isAnimatingSpecialEffect = false;
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
