import { PLAY_CARD, PICK_UP_PILE } from '@shared/events.ts';

import { animatePlayerPlay, isValidPlay } from './render.js';
import * as state from './state.js';
import { showToast } from './uiHelpers.js';
import type { Card, ClientStatePlayer } from '../../src/types.js';

let initialized = false;

type SelectableCardElement = HTMLElement;

function isMyTurn(): boolean {
  const lastGameState = state.lastGameState;
  const myId = state.myId;

  if (lastGameState && myId) {
    if (lastGameState.isStarting) return false;
    return lastGameState.currentPlayerId === myId;
  }
  const selectableCard = document.querySelector('.card-img.selectable');
  if (selectableCard) {
    return true;
  }
  const myArea = document.getElementById('my-area');
  return Boolean(myArea && myArea.classList.contains('active'));
}

function ensureSocketReady(): boolean {
  if (!state.socket || state.socket.connected === false) {
    showToast('Not connected to server.', 'error');
    return false;
  }
  return true;
}

function deselectCard(card: SelectableCardElement): void {
  card.classList.remove('selected');
  const container = card.closest('.card-container');
  if (container) {
    container.classList.remove('selected-container');
    container.classList.remove('selected');
  }
}

function forceSelectCard(card: SelectableCardElement): void {
  card.classList.add('selected');
  const container = card.closest('.card-container');
  if (container) {
    container.classList.add('selected-container');
    container.classList.add('selected');
  }
}

function clearSelectedCards(): void {
  const selectedCards = Array.from(
    document.querySelectorAll('.card-img.selected')
  ) as SelectableCardElement[];
  selectedCards.forEach(deselectCard);
}

function enforceSelectionRules(clickedCard: SelectableCardElement): void {
  if (!clickedCard.classList.contains('selected')) {
    return;
  }

  const zone = clickedCard.dataset.zone;
  if (!zone) {
    return;
  }

  const selectedCards = Array.from(
    document.querySelectorAll('.card-img.selected')
  ) as SelectableCardElement[];

  selectedCards.forEach((card) => {
    if (card === clickedCard) {
      return;
    }

    if (card.dataset.zone !== zone) {
      deselectCard(card);
      return;
    }

    if (zone === 'upCards' || zone === 'downCards') {
      deselectCard(card);
      return;
    }

    if (zone === 'hand') {
      const value = clickedCard.dataset.value;
      if (value && card.dataset.value && card.dataset.value !== value) {
        deselectCard(card);
      }
    }
  });
}

type SelectionZone = 'hand' | 'upCards' | 'downCards';

interface SelectionResult {
  cardIndices: number[];
  zone: SelectionZone;
}

function collectSelection(): SelectionResult | null {
  const selectedCards = Array.from(
    document.querySelectorAll('#my-area .card-img.selected')
  ) as SelectableCardElement[];

  if (selectedCards.length === 0) {
    showToast('Select a card to play.', 'info');
    return null;
  }

  const zone = selectedCards[0].dataset.zone as SelectionZone | undefined;
  if (!zone) {
    showToast('Selected cards are missing zone data.', 'error');
    return null;
  }

  if (selectedCards.some((card) => card.dataset.zone !== zone)) {
    showToast('Select cards from one area only.', 'info');
    return null;
  }

  const indices = selectedCards
    .map((card) => Number.parseInt(card.dataset.idx || '', 10))
    .filter((index) => !Number.isNaN(index));

  if (indices.length !== selectedCards.length) {
    showToast('Selection is invalid.', 'error');
    return null;
  }

  if (zone !== 'hand' && indices.length > 1) {
    showToast('Only one card can be played from this stack.', 'info');
    return null;
  }

  indices.sort((a, b) => a - b);
  return { cardIndices: indices, zone };
}

function resolveSelectedCards(
  selection: SelectionResult,
  player: ClientStatePlayer | undefined
): Card[] | null {
  if (!player) {
    return null;
  }

  if (selection.zone === 'hand') {
    const hand = player.hand ?? [];
    return selection.cardIndices
      .map((index) => hand[index])
      .filter((card): card is Card => Boolean(card));
  }

  if (selection.zone === 'upCards') {
    const upCards = player.upCards ?? [];
    return selection.cardIndices
      .map((index) => upCards[index])
      .filter((card): card is Card => card != null);
  }

  // Down cards are blind plays; skip validation
  return null;
}

function handlePlayClick(): void {
  if (state.getLastGameState()?.isStarting) {
    showToast('Game is starting, please wait.', 'info');
    return;
  }
  if (!isMyTurn()) {
    showToast('Not your turn.', 'error');
    return;
  }
  if (!ensureSocketReady()) {
    return;
  }

  const selection = collectSelection();
  if (!selection) {
    return;
  }

  // Client-Side Validation
  // Get current game state to check rules
  const gameState = state.getLastGameState();
  if (gameState) {
    const myPlayer = gameState.players.find((p) => p.id === state.myId);
    const pileSummary = gameState.pile || { topCard: null, belowTopCard: null, count: 0 };
    // Build minimal array for isValidPlay (only needs top card + length)
    const pileForValidation: import('../../src/shared/types.js').Card[] =
      pileSummary.topCard ? [pileSummary.topCard] : [];
    const resolvedCards = resolveSelectedCards(selection, myPlayer);

    // Only validate if we actually resolved cards (and it's not a blind down-card play)
    if (resolvedCards && resolvedCards.length > 0) {
      // ONLY block invalid plays if they are from the HAND.
      // If Up/Down, we let the server decide (because it might be a valid "pickup" move).
      console.log(
        'Client-side validation:',
        JSON.stringify({ resolvedCards, pile: pileSummary }, null, 2)
      );
      if (selection.zone === 'hand' && !isValidPlay(resolvedCards, pileForValidation)) {
        showToast('Invalid Play!', 'error');
        // ABORT: Do not animate, do not hide, do not emit.
        // The cards stay visible in hand.
        clearSelectedCards();
        return;
      }

      // For Up/Down cards, we skip the local 'isValidPlay' check here
      // to allow the "play to pickup" mechanic.
    }
  }

  // Animation & Instant Hide (Optimistic UI)
  // 1. Find the selected card DOM elements
  const selectedElements = document.querySelectorAll(
    '#my-area .card-img.selected'
  );

  selectedElements.forEach((imgEl) => {
    if (imgEl instanceof HTMLElement) {
      // Get the container (the actual card box)
      const container = imgEl.closest('.card-container') as HTMLElement;

      // Trigger the "Ghost" animation from the current position
      if (container) animatePlayerPlay(container);

      // 2. Optimistic Update: Hide the original immediately.
      // It will be removed "for real" when the server sends the new state.
      if (container) {
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
      }
    }
  });

  state.socket.emit(PLAY_CARD, selection);
  clearSelectedCards();
  suspendHandHover(450);
}

function handleTakeClick(): void {
  if (!isMyTurn()) {
    showToast('Not your turn.', 'error');
    return;
  }
  if (!ensureSocketReady()) {
    return;
  }
  state.socket.emit(PICK_UP_PILE);
  clearSelectedCards();
  suspendHandHover(450);
}

function getSelectableCard(target: HTMLElement): SelectableCardElement | null {
  if (target.classList.contains('card-img')) {
    return target.classList.contains('selectable') ? target : null;
  }

  const container = target.closest('.card-container');
  if (!container) {
    return null;
  }
  const cardFace = container.querySelector('.card-img') as HTMLElement | null;
  if (!cardFace || !cardFace.classList.contains('selectable')) {
    return null;
  }
  return cardFace;
}

export function initializeGameControls(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    if (target.closest('#play-button')) {
      handlePlayClick();
      return;
    }

    // Check take button with direct ID first to avoid timing issues
    // FEATURE: Also allow clicking the pile to take it.
    if (
      target.id === 'take-button' ||
      target.closest('#take-button') ||
      target.closest('#discard-pile')
    ) {
      handleTakeClick();
      return;
    }

    const selectableCard = getSelectableCard(target);
    if (selectableCard) {
      const wasSelected = selectableCard.classList.contains('selected');
      if (wasSelected) {
        deselectCard(selectableCard);
      } else {
        forceSelectCard(selectableCard);
        enforceSelectionRules(selectableCard);
      }
    }
  });

  document.addEventListener('dblclick', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const selectableCard = getSelectableCard(target);
    if (!selectableCard) {
      return;
    }

    event.preventDefault();
    // FEATURE: Ensure the card being double-clicked is selected,
    // then play the entire current selection.
    forceSelectCard(selectableCard);
    handlePlayClick();
  });
}

function suspendHandHover(_durationMs: number): void {
  const root = document.documentElement;
  root.classList.add('hand-hover-suspended');

  let cleared = false;
  const clearHover = () => {
    if (cleared) return;
    cleared = true;
    root.classList.remove('hand-hover-suspended');
    window.removeEventListener('pointermove', clearHover);
    handArea?.removeEventListener('pointerleave', clearHover);
  };

  const handArea = document.getElementById('my-area');
  window.addEventListener('pointermove', clearHover, { once: true });
  handArea?.addEventListener('pointerleave', clearHover, { once: true });
}
