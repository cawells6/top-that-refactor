// card.js - Handles card rendering logic

/**
 * Creates a card element with appropriate styling and behavior
 * @param {object} card - Card data (value, suit, or {back: true})
 * @param {boolean} selectable - Whether the card can be selected
 * @param {Function} onSelect - Optional callback when card is selected
 * @returns {HTMLElement} The card container element
 */
export function createCardElement(card, selectable = false, onSelect = null) {
  const container = document.createElement('div');
  container.className = 'card-container';

  const img = document.createElement('img');
  img.className = 'card-img';

  // Handle back of card vs face
  if (card.back) {
    img.src = 'https://deckofcardsapi.com/static/img/back.png';
    img.alt = 'Card Back';
  } else {
    // Use deckofcardsapi.com image codes ({value}{suitLetter})
    const val = String(card.value).toUpperCase() === '10' ? '0' : String(card.value).toUpperCase();
    const suitLetter = { hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S' }[card.suit];
    const code = `${val}${suitLetter}`;
    img.src = `https://deckofcardsapi.com/static/img/${code}.png`;
    img.alt = `${card.value} of ${card.suit}`;

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
 * @param {string|number} value - Card value (e.g., 2, 10, J, Q, K, A)
 * @returns {string} Formatted card value
 */
function formatCardValue(value) {
  const v = String(value).toLowerCase();
  if (v === 'j' || v === 'jack') return 'jack';
  if (v === 'q' || v === 'queen') return 'queen';
  if (v === 'k' || v === 'king') return 'king';
  if (v === 'a' || v === 'ace') return 'ace';
  return v;
}
