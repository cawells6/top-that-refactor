import { 
  renderGameState, 
  showCardEvent, 
  renderPlayedCards, 
  resetHandTracking, 
  animateCardFromPlayer, 
  waitForFlyingCard 
} from './render.js';
import * as state from './state.js';
import { waitForTestContinue } from './manualMode.js';
import {
  showLobbyForm,
  showGameTable,
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

// --- VISUAL & QUEUE STATE ---
let isAnimatingSpecialEffect = false;
let pendingStateUpdate: GameStateData | null = null;
let cardsBeingAnimated: Card[] | null = null;

interface QueuedPlay {
  cards: Card[];
  playerId?: string;
}
const playQueue: QueuedPlay[] = [];
let isProcessingQueue = false;

// 450ms = 25% faster than previous 600ms
const BOT_THINKING_TIME = 450; 

// --- The Waiting Room for fast CPU cards (Legacy Buffer) ---
let bufferedCardPlay: Card[] | null = null;

let safetyUnlockTimer: ReturnType<typeof setTimeout> | null = null;
let burnHoldTimer: ReturnType<typeof setTimeout> | null = null;
const ANIMATION_DELAY_MS = 2000;

/**
 * Process the queue of card plays one by one.
 * This serializes the chaos: "Think -> Fly -> Land" happen in order.
 */
async function processPlayQueue() {
  // If we are already running the loop, or a special effect (explosion) is happening, do nothing.
  if (isProcessingQueue || isAnimatingSpecialEffect) return;
  
  isProcessingQueue = true;

  while (playQueue.length > 0) {
    // Peek at the first item
    const play = playQueue[0]; 

    // 1. THINKING & ANIMATION STEP
    // Only animate if it's an opponent (Local player animates instantly on click)
    if (play.playerId && play.playerId !== state.myId) {
       // "Thinking" pause (gives the human time to breathe)
       await new Promise(resolve => setTimeout(resolve, BOT_THINKING_TIME));
       
       // Fly animation (Wait for completion)
       await animateCardFromPlayer(play.playerId, play.cards);
    } else {
       // Local player: minimal tick just to ensure logical ordering
       await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 2. RENDER STEP (Card hits the pile)
    renderPlayedCards(play.cards);
    cardsBeingAnimated = play.cards;

    // 3. SPECIAL CARD CHECK
    const topCard = play.cards[play.cards.length - 1];
    if (isSpecialCard(topCard.value)) {
       // Stop processing queue. The SPECIAL_CARD_EFFECT event will pick up from here.
       console.log('[Queue] Special card landed. Pausing queue for effect.');
       
       isAnimatingSpecialEffect = true;
       playQueue.shift(); // Remove this item as we've "played" it
       isProcessingQueue = false; // Release lock so Special Effect can take over
       
       // Safety unlock if server fails to send effect
       if (safetyUnlockTimer) clearTimeout(safetyUnlockTimer);
       safetyUnlockTimer = setTimeout(() => {
         forceUnlock();
       }, 3000);
       
       return; // EXIT LOOP and wait for SPECIAL_CARD_EFFECT event
    }

    // Move to next item
    playQueue.shift();
  }

  isProcessingQueue = false;

  // 4. SYNC STATE
  // Now that animations are done, apply the latest game state (Turn indicators, hand counts)
  if (pendingStateUpdate && !isAnimatingSpecialEffect) {
      console.log('[Queue] Animations done. Applying buffered state.');
      renderGameState(pendingStateUpdate, state.myId);
      pendingStateUpdate = null;
  }
}

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

    if (burnHoldTimer) {
      console.log('[Socket] New card played during burn hold - cancelling hold');
      clearTimeout(burnHoldTimer);
      burnHoldTimer = null;
      pendingStateUpdate = null;
      isAnimatingSpecialEffect = false;
    }

    if (data.cards && data.cards.length > 0) {
      // INSTEAD of processing immediately, we add to the Queue.
      // This ensures order is preserved.
      playQueue.push(data);
      processPlayQueue();
    }
  });

  state.socket.on(STATE_UPDATE, (s: GameStateData) => {
    state.setLastGameState(s);
    if (s.started === true) {
      showGameTable();
    }
    
    // Buffer the update if we are busy animating (Queue or Special Effect)
    // This prevents the turn arrow from jumping to the next player while the card is still flying.
    if (isAnimatingSpecialEffect || isProcessingQueue || playQueue.length > 0) {
      console.log('[BUFFERED] STATE_UPDATE deferred due to animation.');
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

      // Wait for any flying cards (just in case of race condition)
      await waitForFlyingCard();

      let effectType = payload?.type ?? 'regular';
      
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
      
      setTimeout(async () => {
        console.log('[ANIMATION END] Releasing buffers.');
        
        // Prioritize the Pending Update (which likely contains the post-effect state)
        const stateToRender = pendingStateUpdate || state.getLastGameState();
        
        if (stateToRender) {
            // Check if this was a Burn (Empty Pile) to hold the dramatic pause
            if (stateToRender.pile.length === 0 && cardsBeingAnimated && cardsBeingAnimated.length > 0) {
                console.log('[ANIMATION] Holding empty state for effect...');
                renderGameState(stateToRender, state.myId); 
                burnHoldTimer = setTimeout(async () => {
                    burnHoldTimer = null;
                    finishAnimationSequence();
                    await waitForTestContinue();
                }, 1000);
                return;
            } else {
                renderGameState(stateToRender, state.myId);
            }
        }

        finishAnimationSequence();
        await waitForTestContinue();

      }, ANIMATION_DELAY_MS);
    }
  );

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
    
    // Important: Kick the queue again.
    // If cards arrived while we were watching the explosion, they are waiting in the queue.
    processPlayQueue(); 
  }

  function forceUnlock() {
    console.warn('[Socket] Force unlocking state.');
    finishAnimationSequence();
    const lastS = state.getLastGameState();
    if (lastS) renderGameState(lastS, state.myId);
  }

  state.socket.on(PILE_PICKED_UP, (data: { playerId: string; pileSize: number }) => {
    console.log('Pile picked up by:', data.playerId);
    
    if (data.playerId === state.myId) {
      resetHandTracking();
    }
    
    showCardEvent(null, 'take', data.playerId);
  });

  state.socket.on(ERROR, (msg: string) => {
    if (!document.body.classList.contains('showing-game')) {
      showLobbyForm();
      showToast(msg, 'error');
    } else {
      showCardEvent(null, 'invalid');
      
      // If error occurs, assume visual state is wrong and force a re-render
      const lastState = state.getLastGameState();
      if (lastState && state.myId) {
        console.log('[Error Recovery] Re-rendering game state.');
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
