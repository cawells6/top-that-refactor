import { PLAY_CARD, PICK_UP_PILE } from '@shared/events.ts';

import * as state from './state.js';
import { showToast } from './uiHelpers.js';

let initialized = false;

function isMyTurn(): boolean {
  if (state.lastGameState && state.myId) {
    return state.lastGameState.currentPlayerId === state.myId;
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

function deselectCard(card: HTMLImageElement): void {
  card.classList.remove('selected');
  const container = card.closest('.card-container');
  if (container) {
    container.classList.remove('selected-container');
  }
}

function forceSelectCard(card: HTMLImageElement): void {
  card.classList.add('selected');
  const container = card.closest('.card-container');
  if (container) {
    container.classList.add('selected-container');
  }
}

function clearSelectedCards(): void {
  const selectedCards = Array.from(
    document.querySelectorAll('.card-img.selected')
  ) as HTMLImageElement[];
  selectedCards.forEach(deselectCard);
}

function enforceSelectionRules(clickedCard: HTMLImageElement): void {
  if (!clickedCard.classList.contains('selected')) {
    return;
  }

  const zone = clickedCard.dataset.zone;
  if (!zone) {
    return;
  }

  const selectedCards = Array.from(
    document.querySelectorAll('.card-img.selected')
  ) as HTMLImageElement[];

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

function collectSelection():
  | { cardIndices: number[]; zone: 'hand' | 'upCards' | 'downCards' }
  | null {
  const selectedCards = Array.from(
    document.querySelectorAll('#my-area .card-img.selected')
  ) as HTMLImageElement[];

  if (selectedCards.length === 0) {
    showToast('Select a card to play.', 'info');
    return null;
  }

  const zone = selectedCards[0].dataset.zone as
    | 'hand'
    | 'upCards'
    | 'downCards'
    | undefined;
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

function handlePlayClick(): void {
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

  state.socket.emit(PLAY_CARD, selection);
  clearSelectedCards();
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
}

function getSelectableCard(target: HTMLElement): HTMLImageElement | null {
  if (target.classList.contains('card-img')) {
    const img = target as HTMLImageElement;
    return img.classList.contains('selectable') ? img : null;
  }

  const container = target.closest('.card-container');
  if (!container) {
    return null;
  }
  const img = container.querySelector('.card-img') as HTMLImageElement | null;
  if (!img || !img.classList.contains('selectable')) {
    return null;
  }
  return img;
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
    if (target.id === 'take-button' || target.closest('#take-button')) {
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
    forceSelectCard(selectableCard);
    enforceSelectionRules(selectableCard);
    handlePlayClick();
  });
}
