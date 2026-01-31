import { performOpeningDeal } from './dealing-animation.js';
import { waitForTestContinue } from './manualMode.js';
import {
  animateCardFromPlayer,
  animateDeckToPlayPile,
  animateVictory,
  blankDrawPileFor,
  logCardPlayed,
  logGameOver,
  logGameStart,
  logPileTaken,
  logPlayToDraw,
  logSpecialEffect,
  renderGameState,
  renderPlayedCards,
  resetHandTracking,
  showCardEvent,
  waitForFlyingCard,
} from './render.js';
import * as state from './state.js';
import { showToast } from './uiHelpers.js';
import { showGameTable, showLobbyForm } from './uiManager.js';
import { debugLog } from './debugLog.js';
import {
  CARD_PLAYED,
  ERROR,
  GAME_OVER,
  GAME_STARTED,
  JOINED,
  PILE_PICKED_UP,
  REJOIN,
  SESSION_ERROR,
  SPECIAL_CARD_EFFECT,
  STATE_UPDATE,
} from '../../src/shared/events.js';
import { JOIN_GAME } from '../../src/shared/events.js';
import type {
  Card,
  CardPlayedPayload,
  GameStateData,
  JoinGamePayload,
  JoinGameResponse,
  PilePickedUpPayload,
  SpecialCardEffectPayload,
} from '../../src/shared/types.js';
import { isSpecialCard } from '../../utils/cardUtils.js';

// --- VISUAL & QUEUE STATE ---
let isAnimatingSpecialEffect = false;
let isAnimatingPilePickup = false;
let lockedSpecialEffectState: GameStateData | null = null;
let pendingStateUpdate: GameStateData | null = null;
let cardsBeingAnimatedPlayerId: string | null = null;
// Track if we've dealt the opening hand to avoid re-triggering animation
// Reset this when switching games (dev restart)
let hasDealtOpeningHand = false;
// Used to skip the deck-to-play animation right after the opening deal (Phase D already animates it)
let hasPlayedOpeningDeal = false;

interface QueuedPlay {
  cards: Card[];
  playerId?: string;
}

function debugSnapshot(
  tag: string,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  const s = state.getLastGameState();
  return {
    tag,
    queueLen: playQueue.length,
    isProcessingQueue,
    isAnimatingSpecialEffect,
    isAnimatingPilePickup,
    burnHoldActive: Boolean(burnHoldTimer),
    safetyUnlockActive: Boolean(safetyUnlockTimer),
    pilePickupUnlockActive: Boolean(pilePickupUnlockTimer),
    lastStatePileLen: s?.pile?.length ?? null,
    lastStateCurrentPlayerId: (s as any)?.currentPlayerId ?? null,
    ...extra,
  };
}

function joinGameWithAck(payload: JoinGamePayload): Promise<JoinGameResponse> {
  return new Promise((resolve, reject) => {
    if (!state.socket || !state.socket.connected) {
      return reject(new Error('Socket not connected'));
    }
    const timeout = setTimeout(() => {
      reject(new Error('Join request timed out (server did not respond)'));
    }, 5000);

    state.socket.emit(JOIN_GAME, payload, (response: JoinGameResponse) => {
      clearTimeout(timeout);
      if (response && response.success) {
        console.log('[Client] Join Ack Successful:', response);
        if (response.playerId) state.setMyId(response.playerId);
        if (response.roomId) state.setCurrentRoom(response.roomId);
        state.saveSession();
        resolve(response);
      } else {
        console.warn('[Client] Join Ack Failed:', response?.error);
        reject(new Error(response?.error || 'Join refused'));
      }
    });
  });
}

/**
 * ARCHITECTURE FIX: Centralized join logic for invite links.
 * Moves 'emit' logic out of the UI layer (main.ts) and into the Application layer.
 * @param roomId - The room ID from the URL
 * @param socketOverride - Optional mock socket for unit testing
 */
export async function joinGameViaLink(
  roomId: string,
  socketOverride?: { emit: (event: string, payload: unknown) => void }
) {
  const payload = {
    roomId,
    playerName: 'Guest',
    numHumans: 1,
    numCPUs: 0,
  };

  if (socketOverride) {
    socketOverride.emit(JOIN_GAME, payload);
    return;
  }

  // Wait for socket
  if (!state.socket || !state.socket.connected) {
    console.log('[Join] Waiting for socket...');
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (state.socket && state.socket.connected) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }

  try {
    await joinGameWithAck(payload);
  } catch (err) {
    console.error('[Join] Link join failed:', err);
    showToast('Failed to join game: ' + (err as Error).message, 'error');
  }
}
const playQueue: QueuedPlay[] = [];
let isProcessingQueue = false;

// 450ms = 25% faster than previous 600ms
const BOT_THINKING_TIME = 450;

// --- The Waiting Room for fast CPU cards (Legacy Buffer) ---
let safetyUnlockTimer: ReturnType<typeof setTimeout> | null = null;
let burnHoldTimer: ReturnType<typeof setTimeout> | null = null;
let pilePickupUnlockTimer: ReturnType<typeof setTimeout> | null = null;
const ANIMATION_DELAY_MS = 2000;
const BURN_TURN_HOLD_MS = 1000;
const TAKE_PILE_BLANK_MS = 1000;
const DECK_TO_PILE_ANIMATION_MS = 500;
const POST_FLIP_RENDER_BUFFER_MS = 50;

/**
 * Process the queue of card plays one by one.
 * This serializes the chaos: "Think -> Fly -> Land" happen in order.
 */
async function processPlayQueue() {
  // If we are already running the loop, or a special effect (explosion) is happening, do nothing.
  if (isProcessingQueue || isAnimatingSpecialEffect || isAnimatingPilePickup) {
    return;
  }

  isProcessingQueue = true;

  while (playQueue.length > 0) {
    // Peek at the first item
    const play = playQueue[0];

    // 1. THINKING & ANIMATION STEP
    // Only animate if it's an opponent (Local player animates instantly on click)
    if (play.playerId && play.playerId !== state.myId) {
      // "Thinking" pause (gives the human time to breathe)
      await new Promise((resolve) => setTimeout(resolve, BOT_THINKING_TIME));

      // Fly animation (Wait for completion)
      await animateCardFromPlayer(play.playerId, play.cards);
    } else {
      // Local player animation is already in flight; wait before rendering
      await waitForFlyingCard();
    }

    // 2. RENDER STEP (Card hits the pile)
    renderPlayedCards(play.cards);
    cardsBeingAnimatedPlayerId = play.playerId ?? state.myId ?? null;

    // 3. SPECIAL CARD CHECK
    const topCard = play.cards[play.cards.length - 1];
    if (isSpecialCard(topCard.value)) {
      // Stop processing queue. The SPECIAL_CARD_EFFECT event will pick up from here.
      console.log('[Queue] Special card landed. Pausing queue for effect.');

      isAnimatingSpecialEffect = true;
      lockedSpecialEffectState = null; // capture the first post-effect STATE_UPDATE
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

function finishAnimationSequence() {
  cardsBeingAnimatedPlayerId = null;
  isAnimatingSpecialEffect = false;
  lockedSpecialEffectState = null;
  debugLog('finishAnimationSequence', debugSnapshot('finishAnimationSequence'));

  if (safetyUnlockTimer) {
    clearTimeout(safetyUnlockTimer);
    safetyUnlockTimer = null;
  }
  if (burnHoldTimer) {
    clearTimeout(burnHoldTimer);
    burnHoldTimer = null;
  }

  // Important: Kick the queue again.
  // If cards arrived while we were watching the explosion, they are waiting in the queue.
  processPlayQueue();
}

function finishPilePickupSequence(): void {
  isAnimatingPilePickup = false;
  cardsBeingAnimatedPlayerId = null;

  if (pilePickupUnlockTimer) {
    clearTimeout(pilePickupUnlockTimer);
    pilePickupUnlockTimer = null;
  }

  // Apply any buffered state now that the pickup+flip animation window has ended.
  if (pendingStateUpdate && !isAnimatingSpecialEffect && !isProcessingQueue) {
    renderGameState(pendingStateUpdate, state.myId);
    pendingStateUpdate = null;
  }

  debugLog('finishPilePickupSequence', debugSnapshot('finishPilePickupSequence'));
  processPlayQueue();
}

function forceUnlock() {
  console.warn('[Socket] Force unlocking state.');
  finishAnimationSequence();
  const lastS = state.getLastGameState();
  if (lastS) renderGameState(lastS, state.myId);
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

  // Reset animation flag when disconnecting (for dev restart)
  state.socket.on('disconnect', () => {
    hasDealtOpeningHand = false;
  });

  state.socket.on(
    JOINED,
    (data: JoinGameResponse) => {
      if (!data.success) {
        console.warn('[Client] JOINED failure payload:', data.error);
        return;
      }
      if (!data.playerId) {
        console.warn('[Client] JOINED payload missing playerId:', data);
        return;
      }
      state.setMyId(data.playerId);
      state.setCurrentRoom(data.roomId);
      state.saveSession();
    }
  );

  state.socket.on(
    CARD_PLAYED,
    async (data: CardPlayedPayload) => {
      debugLog(
        'CARD_PLAYED',
        debugSnapshot('CARD_PLAYED', {
          playerId: data.playerId ?? null,
          cardCount: data.cards?.length ?? 0,
          topCard: data.cards?.length
            ? data.cards[data.cards.length - 1]?.value
            : null,
        })
      );
      console.log(
        '[CARD_PLAYED] Received:',
        data.cards,
        'from player:',
        data.playerId
      );

      if (data.cards && data.cards.length > 0) {
        // Log the card play
        const currentState = state.getLastGameState();
        if (currentState && data.playerId) {
          logCardPlayed(data.playerId, data.cards, currentState.players);
        }

        // INSTEAD of processing immediately, we add to the Queue.
        // This ensures order is preserved.
        playQueue.push(data);
        processPlayQueue();
      }
    }
  );

  state.socket.on(STATE_UPDATE, async (s: GameStateData) => {
    state.setLastGameState(s);
    debugLog(
      'STATE_UPDATE',
      debugSnapshot('STATE_UPDATE', {
        pileLen: s?.pile?.length ?? null,
        currentPlayerId: (s as any)?.currentPlayerId ?? null,
      })
    );
    if (s.started === true) {
      showGameTable();
    }

    // DETECT FRESH GAME START and trigger opening deal animation once
    // We rely on hasDealtOpeningHand flag to run this only once per session
    const players = s.players ?? [];
    if (s.started && !hasDealtOpeningHand && players.length > 0) {
      // Check if this looks like a fresh deal (all players have cards)
      const looksLikeFreshDeal = players.every(
        (p) =>
          (p.handCount || 0) > 0 &&
          (p.downCount || 0) === 3 &&
          (p.upCards?.length || 0) === 3
      );

      if (looksLikeFreshDeal) {
        hasDealtOpeningHand = true;

        // 1. Clear any existing cards from the table
        const gameTable = document.getElementById('game-table');
        if (gameTable) {
          // Clear all player areas
          const playerAreas = gameTable.querySelectorAll('.player-area');
          playerAreas.forEach((area) => {
            const handRow = area.querySelector('.hand-row');
            const stackRow = area.querySelector('.stack-row');
            if (handRow) handRow.innerHTML = '';
            if (stackRow) {
              stackRow.querySelectorAll('.stack-col').forEach((col) => {
                col.innerHTML = '';
              });
            }
          });

          // Note: Don't hide discard-pile container - it needs to show placeholder during skeleton mode
        }

        // 2. Render skeleton (shows slots/names, hides cards and icons)
        renderGameState(s, state.myId, null, { skeletonMode: true });

        // Hide special card icons in skeleton mode
        document.querySelectorAll('.card-ability-icon').forEach((icon) => {
          (icon as HTMLElement).style.visibility = 'hidden';
        });

        // 3. Play the dealing animation
        await performOpeningDeal(s, state.myId || '');
        hasPlayedOpeningDeal = true; // Mark that opening deal has been shown

        // 4. Render normal (shows everything and restore icon visibility)
        document.querySelectorAll('.card-ability-icon').forEach((icon) => {
          (icon as HTMLElement).style.visibility = 'visible';
        });
        renderGameState(s, state.myId);
        return;
      }
    }

    // Buffer the update if we are busy animating (Queue or Special Effect)
    // This prevents the turn arrow from jumping to the next player while the card is still flying.
    if (
      isAnimatingSpecialEffect ||
      isAnimatingPilePickup ||
      isProcessingQueue ||
      playQueue.length > 0
    ) {
      console.log('[BUFFERED] STATE_UPDATE deferred due to animation.');
      debugLog(
        'STATE_UPDATE:BUFFERED',
        debugSnapshot('STATE_UPDATE:BUFFERED', {
          pileLen: s?.pile?.length ?? null,
          currentPlayerId: (s as any)?.currentPlayerId ?? null,
        })
      );
      if (isAnimatingSpecialEffect && !lockedSpecialEffectState) {
        lockedSpecialEffectState = s;
      }
      pendingStateUpdate = s;
    } else {
      debugLog(
        'STATE_UPDATE:RENDER',
        debugSnapshot('STATE_UPDATE:RENDER', {
          pileLen: s?.pile?.length ?? null,
          currentPlayerId: (s as any)?.currentPlayerId ?? null,
        })
      );
      renderGameState(s, state.myId);
    }
  });

  state.socket.on(GAME_STARTED, (s?: GameStateData) => {
    showGameTable();
    logGameStart();
    if (s) {
      state.setLastGameState(s);
      renderGameState(s, state.myId);
    }
  });

  state.socket.on(
    SPECIAL_CARD_EFFECT,
    async (payload: SpecialCardEffectPayload) => {
      debugLog(
        'SPECIAL_CARD_EFFECT',
        debugSnapshot('SPECIAL_CARD_EFFECT', {
          type: payload?.type ?? null,
          value: payload?.value ?? null,
        })
      );
      console.log('[SPECIAL_CARD_EFFECT]', payload?.type);

      // Wait for any flying cards (just in case of race condition)
      await waitForFlyingCard();

      // Ensure the queue finishes rendering the special card before showing the icon
      while (isProcessingQueue) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Note: SPECIAL_CARD_EFFECT can arrive before the queue has scheduled the safety unlock.
      // Clear it here after waiting so we don't force-unlock mid-animation.
      if (safetyUnlockTimer) {
        clearTimeout(safetyUnlockTimer);
        safetyUnlockTimer = null;
      }

      let effectType = payload?.type ?? 'regular';

      if (effectType === 'five') {
        const lastState = state.getLastGameState();
        if (!lastState || !lastState.pile || lastState.pile.length === 0) {
          effectType = 'regular';
        }
      }

      isAnimatingSpecialEffect = true;

      // Log the special effect
      logSpecialEffect(effectType, payload?.value);

      setTimeout(() => {
        showCardEvent(payload?.value ?? null, effectType);
      }, 50);

      // Render the post-effect state (e.g., 5 + copied card) during the effect window,
      // but DO NOT jump ahead to later states that include subsequent plays.
      if (effectType === 'five') {
        (async () => {
          const deadline = Date.now() + 500;
          while (!lockedSpecialEffectState && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          if (lockedSpecialEffectState) {
            renderGameState(lockedSpecialEffectState, state.myId);
          }
        })();
      }

      setTimeout(async () => {
        console.log('[ANIMATION END] Releasing buffers.');
        debugLog(
          'SPECIAL_CARD_EFFECT:END',
          debugSnapshot('SPECIAL_CARD_EFFECT:END', {
            type: effectType,
          })
        );

        if (effectType === 'ten' || effectType === 'four-of-a-kind') {
          const latestState = pendingStateUpdate ?? state.getLastGameState();
          const holdPlayerId = cardsBeingAnimatedPlayerId;

          if (
            latestState &&
            holdPlayerId &&
            (latestState.pile?.length ?? 0) === 0
          ) {
            // Show the burned pile (empty) immediately, but hold the turn highlight briefly
            // so the burn state reads clearly before the next player is highlighted.
            renderGameState(
              { ...latestState, currentPlayerId: holdPlayerId },
              state.myId
            );

            if (burnHoldTimer) clearTimeout(burnHoldTimer);
            burnHoldTimer = setTimeout(async () => {
              burnHoldTimer = null;
              finishAnimationSequence();
              await waitForTestContinue();
            }, BURN_TURN_HOLD_MS);

            return;
          }
        }

        finishAnimationSequence();
        await waitForTestContinue();
      }, ANIMATION_DELAY_MS);
    }
  );

  state.socket.on(
    PILE_PICKED_UP,
    (data: PilePickedUpPayload) => {
      debugLog(
        'PILE_PICKED_UP',
        debugSnapshot('PILE_PICKED_UP', {
          playerId: data.playerId ?? null,
          pileSize: (data as any)?.pileSize ?? null,
        })
      );
      console.log('Pile picked up by:', data.playerId);

      isAnimatingPilePickup = true;
      cardsBeingAnimatedPlayerId = data.playerId ?? null;
      if (pilePickupUnlockTimer) {
        clearTimeout(pilePickupUnlockTimer);
        pilePickupUnlockTimer = null;
      }

      // Log the pile pickup
      const currentState = state.getLastGameState();
      if (currentState) {
        logPileTaken(data.playerId, data.pileSize, currentState.players);
      }

      if (data.playerId === state.myId) {
        resetHandTracking();
      }

      showCardEvent(null, 'take', data.playerId);

      // Skip the deck-to-play animation if we just finished the opening deal
      // (the opening deal already includes this animation in Phase D)
      if (hasPlayedOpeningDeal) {
        hasPlayedOpeningDeal = false; // Reset flag for future games
        // Only log the flip if the pile actually has a new top card.
        const latestState = state.getLastGameState();
        if (latestState?.pile?.length) {
          logPlayToDraw();
        }
        return;
      }

      // Show the pile empty briefly before the deck flip animation.
      blankDrawPileFor(
        TAKE_PILE_BLANK_MS +
          DECK_TO_PILE_ANIMATION_MS +
          POST_FLIP_RENDER_BUFFER_MS
      );
      const blankState = state.getLastGameState();
      if (blankState) {
        renderGameState(blankState, state.myId);
      }

      // Animate card from deck to play pile after a short "blank" beat.
      setTimeout(() => {
        // Guard: when the "Play" pile (deck) is empty, some late-game flows can
        // still emit PILE_PICKED_UP. Only animate/log the flip if a new pile top
        // actually exists in the latest state.
        const latestState = state.getLastGameState();
        if (!latestState?.pile?.length) {
          finishPilePickupSequence();
          return;
        }

        animateDeckToPlayPile();
        logPlayToDraw();

        // Ensure the drawn card becomes visible right after the flip animation ends.
        if (pilePickupUnlockTimer) clearTimeout(pilePickupUnlockTimer);
        pilePickupUnlockTimer = setTimeout(() => {
          pilePickupUnlockTimer = null;
          const s = state.getLastGameState();
          if (s) renderGameState(s, state.myId);
          pendingStateUpdate = null;
          finishPilePickupSequence();
        }, DECK_TO_PILE_ANIMATION_MS + POST_FLIP_RENDER_BUFFER_MS);
      }, TAKE_PILE_BLANK_MS);
    }
  );

  state.socket.on(
    GAME_OVER,
    (data: { winnerId: string; winnerName: string }) => {
      console.log('Game Over! Winner:', data.winnerName, 'ID:', data.winnerId);
      logGameOver(data.winnerName);
      animateVictory(data.winnerId);
    }
  );

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
