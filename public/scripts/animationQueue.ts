import {
  animateCardFromPlayer,
  renderGameState,
  renderPlayedCards,
  waitForFlyingCard,
  animateDeckToPlayPile,
} from './render.js';
import * as state from './state.js';
import { debugLog } from './debugLog.js';
import { isSpecialCard } from '../../utils/cardUtils.js';
import {
  BOT_THINKING_TIME,
  ANIMATION_DELAY_MS,
  BURN_TURN_HOLD_MS,
  DECK_TO_PILE_ANIMATION_MS,
  POST_FLIP_RENDER_BUFFER_MS,
  TAKE_PILE_BLANK_MS,
  SAFETY_UNLOCK_MS,
  JITTER_BATCH_THRESHOLD,
} from '../../src/shared/constants.js';

interface QueuedPlay {
  cards: any[];
  playerId?: string;
}

const playQueue: QueuedPlay[] = [];
let isProcessingQueue = false;
let isAnimatingSpecialEffect = false;
let isAnimatingPilePickup = false;
let lockedSpecialEffectState: any | null = null;
let pendingStateUpdate: any | null = null;
let cardsBeingAnimatedPlayerId: string | null = null;

let safetyUnlockTimer: ReturnType<typeof setTimeout> | null = null;
let burnHoldTimer: ReturnType<typeof setTimeout> | null = null;
let pilePickupUnlockTimer: ReturnType<typeof setTimeout> | null = null;

function debugSnapshot(tag: string, extra?: Record<string, unknown>) {
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

export function isBusy(): boolean {
  return (
    isAnimatingSpecialEffect || isAnimatingPilePickup || isProcessingQueue || playQueue.length > 0
  );
}

export function isAnimatingSpecialEffectActive(): boolean {
  return isAnimatingSpecialEffect;
}

export function getLockedSpecialEffectState() {
  return lockedSpecialEffectState;
}

export function getPendingStateUpdate() {
  return pendingStateUpdate;
}

export function getCardsBeingAnimatedPlayerId() {
  return cardsBeingAnimatedPlayerId;
}

export function bufferState(s: any): void {
  if (isAnimatingSpecialEffect && !lockedSpecialEffectState) {
    lockedSpecialEffectState = s;
  }
  pendingStateUpdate = s;
}

export function enqueuePlay(play: QueuedPlay) {
  playQueue.push(play);
  processPlayQueue();
}

async function processPlayQueue() {
  if (isProcessingQueue || isAnimatingSpecialEffect || isAnimatingPilePickup) return;
  isProcessingQueue = true;

  console.log('[AnimationQueue] processPlayQueue starting', {
    queueLength: playQueue.length,
    firstCardInQueue: playQueue[0] ? {
      cardCount: playQueue[0].cards.length,
      topCard: playQueue[0].cards[playQueue[0].cards.length - 1]?.value,
      playerId: playQueue[0].playerId
    } : null
  });

  while (playQueue.length > 0) {
    const play = playQueue[0];

    const thinkMs = playQueue.length >= (JITTER_BATCH_THRESHOLD ?? 3)
      ? Math.max(50, Math.floor(BOT_THINKING_TIME / 2))
      : BOT_THINKING_TIME;

    if (play.playerId && play.playerId !== state.myId) {
      await new Promise((resolve) => setTimeout(resolve, thinkMs));
      await animateCardFromPlayer(play.playerId, play.cards);
    } else {
      await waitForFlyingCard();
    }

    renderPlayedCards(play.cards);
    cardsBeingAnimatedPlayerId = play.playerId ?? state.myId ?? null;

    const topCard = play.cards[play.cards.length - 1];
    if (isSpecialCard(topCard.value)) {
      isAnimatingSpecialEffect = true;
      lockedSpecialEffectState = null;
      playQueue.shift();
      isProcessingQueue = false;

      if (safetyUnlockTimer) clearTimeout(safetyUnlockTimer);
      safetyUnlockTimer = setTimeout(() => {
        forceUnlock();
      }, SAFETY_UNLOCK_MS);

      return;
    }

    playQueue.shift();
  }

  isProcessingQueue = false;

  if (pendingStateUpdate && !isAnimatingSpecialEffect) {
    renderGameState(pendingStateUpdate, state.myId);
    pendingStateUpdate = null;
  }
}

export function finishAnimationSequence() {
  cardsBeingAnimatedPlayerId = null;
  isAnimatingSpecialEffect = false;
  lockedSpecialEffectState = null;
  
  console.log('[AnimationQueue] finishAnimationSequence called', {
    queueLength: playQueue.length,
    hasSafetyTimer: Boolean(safetyUnlockTimer),
    hasBurnTimer: Boolean(burnHoldTimer),
    pendingState: Boolean(pendingStateUpdate)
  });
  
  debugLog('finishAnimationSequence', debugSnapshot('finishAnimationSequence'));

  if (safetyUnlockTimer) {
    clearTimeout(safetyUnlockTimer);
    safetyUnlockTimer = null;
  }
  if (burnHoldTimer) {
    clearTimeout(burnHoldTimer);
    burnHoldTimer = null;
  }

  processPlayQueue();
}

export function finishPilePickupSequence(): void {
  isAnimatingPilePickup = false;
  cardsBeingAnimatedPlayerId = null;

  if (pilePickupUnlockTimer) {
    clearTimeout(pilePickupUnlockTimer);
    pilePickupUnlockTimer = null;
  }

  if (pendingStateUpdate && !isAnimatingSpecialEffect && !isProcessingQueue) {
    renderGameState(pendingStateUpdate, state.myId);
    pendingStateUpdate = null;
  }

  debugLog('finishPilePickupSequence', debugSnapshot('finishPilePickupSequence'));
  processPlayQueue();
}

export function forceUnlock() {
  console.warn('[AnimationQueue] Force unlocking state.');
  finishAnimationSequence();
  const lastS = state.getLastGameState();
  if (lastS) renderGameState(lastS, state.myId);
}

export function scheduleBurnHold(callback: () => Promise<void> | void) {
  if (burnHoldTimer) clearTimeout(burnHoldTimer);
  burnHoldTimer = setTimeout(async () => {
    burnHoldTimer = null;
    await callback();
  }, BURN_TURN_HOLD_MS);
}

export function setAnimatingPilePickup(val: boolean) {
  isAnimatingPilePickup = val;
}

export function clearAll() {
  playQueue.length = 0;
  if (safetyUnlockTimer) {
    clearTimeout(safetyUnlockTimer);
    safetyUnlockTimer = null;
  }
  if (burnHoldTimer) {
    clearTimeout(burnHoldTimer);
    burnHoldTimer = null;
  }
  if (pilePickupUnlockTimer) {
    clearTimeout(pilePickupUnlockTimer);
    pilePickupUnlockTimer = null;
  }
  isProcessingQueue = false;
  isAnimatingSpecialEffect = false;
  isAnimatingPilePickup = false;
  lockedSpecialEffectState = null;
  pendingStateUpdate = null;
  cardsBeingAnimatedPlayerId = null;

  const lastS = state.getLastGameState();
  if (lastS) renderGameState(lastS, state.myId);
}

export { debugSnapshot };
