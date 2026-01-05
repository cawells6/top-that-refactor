import { renderGameState, showCardEvent, renderPlayedCards, resetHandTracking, animateCardFromPlayer, waitForFlyingCard } from './render.js';
import * as state from './state.js';
import { waitForTestContinue } from './manualMode.js';
import {
  showLobbyForm,
  showGameTable,
  showError,
} from './uiManager.js';
import { showToast } from './uiHelpers.js';
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
import { isSpecialCard } from '../../utils/cardUtils.js';

let isAnimatingSpecialEffect = false;
let pendingStateUpdate: GameStateData | null = null;
let cardsBeingAnimated: Card[] | null = null;

// --- The Waiting Room for fast CPU cards ---
let bufferedCardPlay: Card[] | null = null;

let safetyUnlockTimer: ReturnType<typeof setTimeout> | null = null;
let burnHoldTimer: ReturnType<typeof setTimeout> | null = null;
const ANIMATION_DELAY_MS = 2000;

export async function initializeSocketHandlers(): Promise<void> {
  await state.socketReady;

  state.socket.on('connect', () => {
    if (state.currentRoom && state.myId) {
      state.socket.emit(REJOIN, {
        playerId: state.myId,
        roomId: state.currentRoom,
      });
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

  state.socket.on(CARD_PLAYED, async (data: { cards: Card[]; playerId?: string }) => {
    console.log('[CARD_PLAYED] Received:', data.cards, 'from player:', data.playerId);

    // If we were holding a "Burn" (Empty Pile) state, but a new card came in,
    // cancel the hold so we don't overwrite this new card with an empty pile later.
    if (burnHoldTimer) {
      console.log('[Socket] New card played during burn hold - cancelling hold');
      clearTimeout(burnHoldTimer);
      burnHoldTimer = null;
      pendingStateUpdate = null;
      isAnimatingSpecialEffect = false;
    }

    if (data.cards && data.cards.length > 0) {
      
      // 1. TRAFFIC COP: If we are watching an explosion, STOP the CPU card.
      if (isAnimatingSpecialEffect) {
        console.log('[Socket] Animation busy. Buffering CPU play:', data.cards);
        bufferedCardPlay = data.cards;
        return; // <--- This prevents the new card from appearing/overwriting the explosion
      }

      // 2. ANIMATION STEP
      // Only animate if we have an ID and it's NOT ME (I already animated on click)
      if (data.playerId && data.playerId !== state.myId) {
        // Wait for the ghost to fly before showing it on the pile
        await animateCardFromPlayer(data.playerId, data.cards);
      }

      // 3. RENDER (Now safe to show on pile)
      renderPlayedCards(data.cards);
      cardsBeingAnimated = data.cards;

      // 4. CHECK SPECIAL EFFECTS
      const topCard = data.cards[data.cards.length - 1];
      if (isSpecialCard(topCard.value)) {
        console.log('[Socket] Special card detected. Locking input.');
        isAnimatingSpecialEffect = true;

        // Safety: Unlock after 3s if server hangs
        if (safetyUnlockTimer) clearTimeout(safetyUnlockTimer);
        safetyUnlockTimer = setTimeout(() => {
          forceUnlock();
        }, 3000);
      }
    }
  });

  state.socket.on(STATE_UPDATE, (s: GameStateData) => {
    state.setLastGameState(s);
    if (s.started === true) {
      showGameTable();
    }
    
    // Always buffer state updates if busy
    if (isAnimatingSpecialEffect) {
      console.log('[BUFFERED] STATE_UPDATE during animation.');
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

  state.socket.on(
    SPECIAL_CARD_EFFECT,
    async (payload: { type?: string; value?: number | string | null }) => {
      console.log('[SPECIAL_CARD_EFFECT]', payload?.type);
      
      if (safetyUnlockTimer) clearTimeout(safetyUnlockTimer);

      // Wait for any card to land first
      await waitForFlyingCard();

      let effectType = payload?.type ?? 'regular';
      
      // Fix: Don't show "Copy" icon if pile was empty (treat as regular 5)
      if (effectType === 'five') {
        const lastState = state.getLastGameState();
        if (!lastState || !lastState.pile || lastState.pile.length === 0) {
          effectType = 'regular';
        }
      }

      isAnimatingSpecialEffect = true;
      
      setTimeout(() => {
        showCardEvent(payload?.value ?? null, effectType);
      }, 50);
      
      // Wait full duration to let the user see the "Blank Pile" or "Effect"
      setTimeout(async () => {
        console.log('[ANIMATION END] Releasing buffers.');
        
        // 1. Process the "Game Math" update (e.g. clearing the pile)
        if (pendingStateUpdate) {
            // If it was a Burn (10), hold the "Empty Pile" state for a moment
            // so the user sees the emptiness before the CPU's buffered card slams down.
            if (pendingStateUpdate.pile.length === 0 && cardsBeingAnimated && cardsBeingAnimated.length > 0) {
                console.log('[ANIMATION] Holding empty state for effect...');
                
                // Show Empty State (Explosion aftermath)
                renderGameState(pendingStateUpdate, state.myId); 
                
                // Wait 1.0s to let the "Empty" state sink in
                burnHoldTimer = setTimeout(async () => {
                    burnHoldTimer = null;
                    // Check buffer again inside the timeout in case it arrived during wait
                    processBufferedCard();
                    finishAnimationSequence();
                    await waitForTestContinue();
                }, 1000);
                return; // Exit here, let timeout finish sequence
            } else {
                // Copy/Reset - just update
                renderGameState(pendingStateUpdate, state.myId);
            }
        }

        processBufferedCard();
        finishAnimationSequence();
        await waitForTestContinue();

      }, ANIMATION_DELAY_MS);
    }
  );

  function processBufferedCard() {
    // NOW let the CPU's buffered card play (if any)
    if (bufferedCardPlay) {
      console.log('[ANIMATION] Releasing buffered CPU play:', bufferedCardPlay);
      // Render the card that was waiting
      renderPlayedCards(bufferedCardPlay);
      
      // Note: If this buffered card is ALSO special (e.g. CPU played a 10), 
      // we treat it as "played" but don't re-lock for a full animation 
      // to avoid infinite lag loops in fast games.
      cardsBeingAnimated = bufferedCardPlay;
      bufferedCardPlay = null;
    }
  }

  function finishAnimationSequence() {
    pendingStateUpdate = null;
    cardsBeingAnimated = null;
    bufferedCardPlay = null;
    isAnimatingSpecialEffect = false;
    if (safetyUnlockTimer) clearTimeout(safetyUnlockTimer);
    if (burnHoldTimer) {
        clearTimeout(burnHoldTimer);
        burnHoldTimer = null;
    }
  }

  function forceUnlock() {
    console.warn('[Socket] Force unlocking state.');
    finishAnimationSequence();
    // Try to render mostly correct state
    const lastS = state.getLastGameState();
    if (lastS) renderGameState(lastS, state.myId);
  }

  state.socket.on(PILE_PICKED_UP, (data: { playerId: string; pileSize: number }) => {
    console.log('Pile picked up by:', data.playerId);
    
    if (data.playerId === state.myId) {
      // Reset hand tracking to prevent bouncing animations when taking pile
      resetHandTracking();
    }
    
    // Show take animation with player ID so cards fly to the correct player
    showCardEvent(null, 'take', data.playerId);
  });

  state.socket.on(ERROR, (msg: string) => {
    if (!document.body.classList.contains('showing-game')) {
      showLobbyForm();
      showToast(msg, 'error');
    } else {
      // In-game: show invalid icon in pile, no toast needed
      showCardEvent(null, 'invalid');
      
      // Error Recovery: Re-render game state to restore hidden cards
      // If we optimistically hid cards but the server rejected the play,
      // we must re-render the state to make them visible again.
      const lastState = state.getLastGameState();
      if (lastState && state.myId) {
        console.log('[Error Recovery] Re-rendering game state to restore hidden cards.');
        renderGameState(lastState, state.myId);
      }
    }
  });

  state.socket.on(SESSION_ERROR, (msg: string) => {
    showLobbyForm();
    showToast(msg, 'error');
    state.setCurrentRoom(null);
    state.setMyId(null);
    state.saveSession();
  });
}
