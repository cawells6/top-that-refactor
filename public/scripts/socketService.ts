import { performOpeningDeal } from './dealing-animation.js';
import { waitForTestContinue } from './manualMode.js';
import { OpeningDealCoordinator } from './coordinators/OpeningDealCoordinator.js';
import { timing } from './diagnostics.js';
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
import {
  enqueuePlay,
  bufferState,
  clearAll as clearAnimationQueue,
  debugSnapshot as aqDebugSnapshot,
  finishAnimationSequence as aqFinishAnimationSequence,
  finishPilePickupSequence as aqFinishPilePickupSequence,
  forceUnlock as aqForceUnlock,
  scheduleBurnHold as aqScheduleBurnHold,
  setAnimatingPilePickup as aqSetAnimatingPilePickup,
  isBusy as aqIsBusy,
  isAnimatingSpecialEffectActive as aqIsAnimatingSpecialEffectActive,
} from './animationQueue.js';
import {
  TAKE_PILE_BLANK_MS,
  DECK_TO_PILE_ANIMATION_MS,
  POST_FLIP_RENDER_BUFFER_MS,
  ANIMATION_DELAY_MS,
  BURN_TURN_HOLD_MS,
} from '../../src/shared/constants.js';

// --- VISUAL & QUEUE STATE ---
let isAnimatingSpecialEffect = false;
let isAnimatingPilePickup = false;
let lockedSpecialEffectState: GameStateData | null = null;
let pendingStateUpdate: GameStateData | null = null;
let cardsBeingAnimatedPlayerId: string | null = null;

// Coordinator for opening deal sequence (extracted to reduce god file complexity)
const openingDealCoordinator = new OpeningDealCoordinator();

interface QueuedPlay {
  cards: Card[];
  playerId?: string;
}

function debugSnapshot(tag: string, extra?: Record<string, unknown>): Record<string, unknown> {
  return aqDebugSnapshot(tag, extra);
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
// Animation queue and timers are handled in `public/scripts/animationQueue.ts`.
// This file delegates play buffering and state buffering to that module.

export async function initializeSocketHandlers(): Promise<void> {
  await state.socketReady;

  state.socket.on('connect', () => {
    const myId = state.myId;
    const currentRoom = state.currentRoom;
    if (currentRoom && myId) {
      state.socket.emit(REJOIN, {
        playerId: myId,
        roomId: currentRoom,
      });
    } else {
      showLobbyForm();
    }
  });

  // Reset animation flag when disconnecting (for dev restart)
  state.socket.on('disconnect', () => {
    openingDealCoordinator.reset();
    // Ensure any pending animations are cleared on disconnect to avoid stuck UI.
    try {
      clearAnimationQueue();
    } catch (e) {
      /* ignore */
    }
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

        // Delegate to animation queue which serializes and buffers plays.
        enqueuePlay(data);
      }
    }
  );

  state.socket.on(STATE_UPDATE, async (s: GameStateData) => {
    state.setLastGameState(s);
    debugLog(
      'STATE_UPDATE',
      debugSnapshot('STATE_UPDATE', {
        pileLen: s?.pile?.count ?? null,
        currentPlayerId: (s as any)?.currentPlayerId ?? null,
      })
    );
    if (s.started === true) {
      showGameTable();
    }

    // Delegate opening deal detection and animation to coordinator
    const openingDealTriggered = await openingDealCoordinator.handleStateUpdate(
      s,
      state.myId
    );
    if (openingDealTriggered) {
      return; // Coordinator already rendered the state
    }

    // Buffer the update if the animation subsystem reports it's busy.
    if (aqIsBusy()) {
      console.log('[BUFFERED] STATE_UPDATE deferred due to animation.');
      debugLog(
        'STATE_UPDATE:BUFFERED',
        debugSnapshot('STATE_UPDATE:BUFFERED', {
          pileLen: s?.pile?.count ?? null,
          currentPlayerId: (s as any)?.currentPlayerId ?? null,
        })
      );
      bufferState(s);
    } else {
      debugLog(
        'STATE_UPDATE:RENDER',
        debugSnapshot('STATE_UPDATE:RENDER', {
          pileLen: s?.pile?.count ?? null,
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
      timing.log('SPECIAL_CARD_EFFECT received', { type: payload?.type, value: payload?.value });
      
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

      // The server can emit SPECIAL_CARD_EFFECT slightly before the corresponding CARD_PLAYED
      // has been processed by the animation queue. If we "finish" the sequence before the queue
      // enters special-effect mode, the queue can later arm its 10s safety timer with nobody
      // left to call finishAnimationSequence(), causing a visible stall.
      const specialEffectStartDeadlineMs = Date.now() + 1000;
      while (!aqIsAnimatingSpecialEffectActive() && Date.now() < specialEffectStartDeadlineMs) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      // Note: We don't wait for aqIsBusy() here because the animation queue
      // is already handling this special card (it set isAnimatingSpecialEffect=true).
      // Waiting would cause an 11-second timeout since the queue is busy BY DESIGN
      // until this handler calls finishAnimationSequence().

      let effectType = payload?.type ?? 'regular';

      if (effectType === 'five') {
        const lastState = state.getLastGameState();
        if (!lastState || !lastState.pile || lastState.pile.count === 0) {
          effectType = 'regular';
        }
      }

      isAnimatingSpecialEffect = true;

      // Log the special effect with enriched player/burn details
      logSpecialEffect(effectType, payload?.value, {
        playerName: payload?.playerName,
        burnedCount: payload?.burnedCount,
      });

      timing.log('Showing card event icon', { effectType });
      setTimeout(() => {
        showCardEvent(payload?.value ?? null, effectType);
      }, 50);

      // Render the post-effect state (e.g., 5 + copied card) during the effect window,
      // but DO NOT jump ahead to later states that include subsequent plays.
      if (effectType === 'five') {
        (async () => {
          const deadline = Date.now() + 500;
          while (!aqDebugSnapshot && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          const locked = (await import('./animationQueue.js')).getLockedSpecialEffectState();
          if (locked) {
            renderGameState(locked, state.myId);
          }
        })();
      }

      setTimeout(async () => {
        timing.log('ANIMATION_DELAY_MS expired', { effectType, delay: ANIMATION_DELAY_MS });
        console.log('[ANIMATION END] Releasing buffers.');
        debugLog(
          'SPECIAL_CARD_EFFECT:END',
          debugSnapshot('SPECIAL_CARD_EFFECT:END', {
            type: effectType,
          })
        );

        if (effectType === 'ten' || effectType === 'four-of-a-kind') {
          const latestState = (await import('./animationQueue.js')).getPendingStateUpdate() ?? state.getLastGameState();
          const holdPlayerId = (await import('./animationQueue.js')).getCardsBeingAnimatedPlayerId();

          if (
            latestState &&
            holdPlayerId &&
            (latestState.pile?.count ?? 0) === 0
          ) {
            // Show the burned pile (empty) immediately, but hold the turn highlight briefly
            // so the burn state reads clearly before the next player is highlighted.
            renderGameState(
              { ...latestState, currentPlayerId: holdPlayerId },
              state.myId
            );

            // Schedule the burn hold via animationQueue helper so timers are centralized.
            timing.log('Scheduling burn hold', { delay: BURN_TURN_HOLD_MS });
            aqScheduleBurnHold(async () => {
              timing.log('BURN_TURN_HOLD_MS expired, finishing sequence');
              aqFinishAnimationSequence();
              await waitForTestContinue();
            });

            return;
          }
        }

        timing.log('Finishing animation sequence (non-burn)');
        aqFinishAnimationSequence();
        await waitForTestContinue();
      }, ANIMATION_DELAY_MS);
    }
  );

  state.socket.on(
    PILE_PICKED_UP,
    (data: PilePickedUpPayload) => {
      timing.log('PILE_PICKED_UP received', { playerId: data.playerId, pileSize: data.pileSize });
      
      debugLog(
        'PILE_PICKED_UP',
        debugSnapshot('PILE_PICKED_UP', {
          playerId: data.playerId ?? null,
          pileSize: (data as any)?.pileSize ?? null,
        })
      );
      console.log('Pile picked up by:', data.playerId);

      aqSetAnimatingPilePickup(true);
      // cardsBeingAnimatedPlayerId will be tracked by animationQueue; mirror for local visibility
      cardsBeingAnimatedPlayerId = data.playerId ?? null;

      // Log the pile pickup
      const currentState = state.getLastGameState();
      if (currentState) {
        logPileTaken(data.playerId, data.pileSize, currentState.players, {
          reason: data.reason,
          invalidCard: data.invalidCard,
        });
      }

      if (data.playerId === state.myId) {
        resetHandTracking();
      }

      showCardEvent(null, 'take', data.playerId);

      // Skip the deck-to-play animation if we just finished the opening deal
      // (the opening deal already includes this animation in Phase D)
      if (openingDealCoordinator.shouldSkipDeckAnimation()) {
        timing.log('Skipping deck animation (post-opening-deal)');
        // Only log the flip if the pile actually has a new top card.
        const latestState = state.getLastGameState();
        if (latestState?.pile?.count) {
          logPlayToDraw();
        }
        // CRITICAL: Must finish pile pickup sequence before returning
        // or animation queue stays stuck
        timing.log('Finishing pile pickup (skipped deck animation)');
        aqFinishPilePickupSequence();
        return;
      }

      // Show the pile empty briefly before the deck flip animation.
      timing.log('Starting blank pile animation', { duration: TAKE_PILE_BLANK_MS });
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
        timing.log('Blank animation complete, checking for deck flip');
        // Guard: when the "Play" pile (deck) is empty, some late-game flows can
        // still emit PILE_PICKED_UP. Only animate/log the flip if a new pile top
        // actually exists in the latest state.
        const latestState = state.getLastGameState();
        if (!latestState?.pile?.count) {
          timing.log('No pile to flip to, finishing pile pickup');
          aqFinishPilePickupSequence();
          return;
        }

        timing.log('Animating deck to play pile');
        animateDeckToPlayPile();
        logPlayToDraw();

        setTimeout(() => {
          timing.log('Deck flip animation complete');
          const s = state.getLastGameState();
          if (s) renderGameState(s, state.myId);
          // Let animationQueue know pickup finished
          timing.log('Finishing pile pickup sequence (normal path)');
          aqFinishPilePickupSequence();
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
    // Cancel all animations to recover from potential stuck UI
    try {
      clearAnimationQueue();
    } catch (e) {
      /* ignore */
    }
  });

  state.socket.on(SESSION_ERROR, (msg: string) => {
    showLobbyForm();
    showToast(msg, 'error');
    state.setCurrentRoom(null);
    state.setMyId(null);
    state.saveSession();
    // Clear animation queue on session error
    try {
      clearAnimationQueue();
    } catch (e) {
      /* ignore */
    }
  });
}
