// card.ts - Handles card rendering logic
import { Card } from '@srcTypes/types.js'; // Use path alias

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
    img.src = '/assets/cards/back.png';
    img.alt = 'Card Back';
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
  }

  // Make card selectable if needed
  if (selectable) {
    img.classList.add('selectable');
    img.style.touchAction = 'manipulation';

    container.addEventListener('click', () => {
      img.classList.toggle('selected');
      container.classList.toggle('selected-container', img.classList.contains('selected'));

      if (onSelect) onSelect(card, img.classList.contains('selected'));
    });
  }

  container.appendChild(img);
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
