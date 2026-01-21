// card.ts - Handles card rendering logic
import { Card } from '../../src/types.js';
import logoUrl from '../src/shared/logov2.svg';
// Import card assets directory base so Vite emits hashed assets

/**
 * Creates a card element with appropriate styling and behavior
 * @param {Card} card - Card data (value, suit, or {back: true})
 * @param {boolean} selectable - Whether the card can be selected
 * @param {(card: Card, selected: boolean) => void | null} onSelect - Optional callback when card is selected
 * @returns {HTMLDivElement} The card container element
 */
export function createCardElement(
  card: Card,
  selectable = false,
  onSelect: ((card: Card, selected: boolean) => void) | null = null
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'card-container';

  const img = document.createElement('img');
  img.className = 'card-img';

  // Handle back of card vs face
  if (card.back) {
    // Create custom card back element
    const cardBack = document.createElement('div');
    cardBack.className = 'card-img card-back-custom';

    // Add inner structure and logo
    const inner = document.createElement('div');
    inner.className = 'card-back-inner';
    const logo = document.createElement('img');
    logo.className = 'card-back-logo';
    logo.src = logoUrl;
    logo.alt = 'Top That';
    inner.appendChild(logo);
    cardBack.appendChild(inner);

    container.appendChild(cardBack);
  } else {
    // Format card values for image src
    const value = formatCardValue(card.value);
    const suit = card.suit.toLowerCase();
    img.src = `/assets/cards/${value}_of_${suit}.png`;
    img.alt = `${value} of ${suit}`;

    // Handle copied cards (e.g., 5s effect)
    if (card.copied) {
      img.classList.add('copied-card');
    }

    container.appendChild(img);
  }

  // Make card selectable if needed
  if (selectable) {
    const selectableElement = container.querySelector(
      '.card-img, .card-back-custom'
    );
    if (selectableElement) {
      selectableElement.classList.add('selectable');
      (selectableElement as HTMLElement).style.touchAction = 'manipulation';
    }

    container.addEventListener('click', () => {
      const selectableEl = container.querySelector(
        '.card-img, .card-back-custom'
      );
      if (selectableEl) {
        selectableEl.classList.toggle('selected');
        const isSelected = selectableEl.classList.contains('selected');
        container.classList.toggle('selected-container', isSelected);
        container.classList.toggle('selected', isSelected);

        if (onSelect) onSelect(card, isSelected);
      }
    });
  }

  return container;
}

/**
 * Formats card value for file naming
 * @param {string | number} value - Card value (e.g., 2, 10, J, Q, K, A)
 * @returns {string} Formatted card value
 */
export function formatCardValue(value: string | number): string {
  const v = String(value).toLowerCase();
  if (v === 'j' || v === 'jack') return 'jack';
  if (v === 'q' || v === 'queen') return 'queen';
  if (v === 'k' || v === 'king') return 'king';
  if (v === 'a' || v === 'ace') return 'ace';
  return v;
}
