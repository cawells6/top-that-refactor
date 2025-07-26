// rules-cards.ts - Handles rendering card images in the rules section
import { code } from './render.js'; // Import the code function from render.js
import { Card } from '../../src/shared/types.js';

interface CardImageOptions {
  height?: string;
}

/**
 * Creates a card image element for display in the rules
 * @param {string} value - The card value (e.g., 'A', 'K', 'Q', 'J', '10', etc.)
 * @param {string} suit - The card suit ('spades', 'hearts', 'diamonds', 'clubs')
 * @param {CardImageOptions} options - Optional settings like size
 * @returns {HTMLImageElement} The created card image element
 */
export function createRuleCardImage(
  value: string | number,
  suit: string,
  options: CardImageOptions = {}
): HTMLImageElement {
  const img = document.createElement('img');
  img.className = 'rule-card-img';

  // Convert value and suit to the format expected by the API
  const card: Card = { value, suit };
  const cardCode = code(card);

  console.log(`Creating card image for ${value} of ${suit}, code=${cardCode}`);

  // Use direct URL to the Deck of Cards API instead of proxy
  const imgSrc = `https://deckofcardsapi.com/static/img/${cardCode}.png`;
  console.log(`Card image src: ${imgSrc}`);
  img.src = imgSrc;
  img.alt = `${value} of ${suit}`;

  // Add error and load handlers for debugging
  img.onerror = () => {
    console.error(`Failed to load card image: ${img.src}`);
    img.style.border = '1px dashed red';
    img.style.width = '40px';
    img.style.height = '60px';
    img.style.display = 'flex';
    img.style.justifyContent = 'center';
    img.style.alignItems = 'center';

    // Add fallback text
    const fallback = document.createElement('span');
    fallback.textContent = `${value}${suit === 'hearts' || suit === 'diamonds' ? '♥' : '♠'}`;
    fallback.style.color =
      suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
    img.appendChild(fallback);
  };

  img.onload = () => {
    console.log(`Successfully loaded card image: ${img.src}`);
  };

  // Apply styling
  img.style.height = options.height || '60px';
  img.style.borderRadius = '3px';
  img.style.margin = '0 2px';

  return img;
}

/**
 * Updates the rule modal to show card images for each rule.
 * - Shows four cards for "Four of a Kind" only.
 * - Shows one card for all other rules.
 */
function updateRuleCardsWithImages() {
  // Query all .card-symbol elements in the rules modal
  const cardSymbols = document.querySelectorAll('.card-symbol');

  cardSymbols.forEach((symbolEl) => {
    // Clear any existing card images
    symbolEl.innerHTML = '';

    // Determine if this is the "Four of a Kind" rule
    // Use a class or data attribute to identify it
    const isFourOfAKind = symbolEl.classList.contains('four-of-a-kind');

    // Decide how many cards to show
    const cardCount = isFourOfAKind ? 4 : 1;

    // Example: Use createRuleCardImage for real card images
    for (let i = 0; i < cardCount; i++) {
      // For demo, use four different values for Four of a Kind, or one for others
      const value = isFourOfAKind ? ['A', 'A', 'A', 'A'][i] : 'A';
      const suit = isFourOfAKind
        ? ['spades', 'hearts', 'diamonds', 'clubs'][i]
        : 'spades';
      const cardImg = createRuleCardImage(value, suit, { height: '60px' });
      cardImg.style.border = 'none'; // Remove border if any
      symbolEl.appendChild(cardImg);
    }
  });
}

// Expose for manual triggering if needed (e.g., after modal is shown)
// Use a type assertion to extend the window object safely
(window as any).forceRuleCardUpdate = updateRuleCardsWithImages;

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🃏 Rules Cards module loaded - setting up event listeners');

  // Listen for custom event from events.ts
  document.addEventListener('update-rule-cards', () => {
    console.log('🃏 Received update-rule-cards event, updating card images');
    updateRuleCardsWithImages();
  });

  const rulesModal = document.getElementById('rules-modal');

  // Only initialize if the rules modal exists
  if (rulesModal) {
    // Update the cards when the rules modal is shown
    const rulesElements = document.querySelectorAll('.rules-summary');
    rulesElements.forEach((element) => {
      element.addEventListener('click', () => {
        // Wait for the details to expand before updating cards
        setTimeout(updateRuleCardsWithImages, 100);
      });
    });

    // Also update when the "Expand All" button is clicked
    const expandBtn = document.getElementById('expand-collapse-all-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        setTimeout(updateRuleCardsWithImages, 100);
      });
    }

    // Initial call to update cards if any details are already open
    setTimeout(updateRuleCardsWithImages, 300);
  }
});
