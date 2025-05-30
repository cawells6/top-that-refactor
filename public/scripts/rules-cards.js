// rules-cards.js - Handles rendering card images in the rules section
import { code } from './render.js'; // Import the code function from render.js

/**
 * Creates a card image element for display in the rules
 * @param {string} value - The card value (e.g., 'A', 'K', 'Q', 'J', '10', etc.)
 * @param {string} suit - The card suit ('spades', 'hearts', 'diamonds', 'clubs')
 * @param {object} options - Optional settings like size
 * @returns {HTMLImageElement} The created card image element
 */
export function createRuleCardImage(value, suit, options = {}) {
  const img = document.createElement('img');
  img.className = 'rule-card-img';
  
  // Convert value and suit to the format expected by the API
  const card = { value, suit };
  const cardCode = code(card);
  
  // Use the Deck of Cards API via our proxy
  img.src = `/cards-api/images/cards/${cardCode}.png`;
  img.alt = `${value} of ${suit}`;
  
  // Apply styling
  img.style.height = options.height || '60px';
  img.style.borderRadius = '3px';
  img.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
  img.style.margin = '0 2px';
  
  return img;
}

/**
 * Replaces text card representations with actual card images in the rules
 */
export function updateRuleCardsWithImages() {
  // Select all card-symbol elements in the rules
  const cardSymbols = document.querySelectorAll('.card-symbol');
  
  cardSymbols.forEach(symbolElement => {
    // Get the original text representation
    const originalText = symbolElement.innerText;
    // Clear the container
    symbolElement.innerHTML = '';
    
    // Parse the original text to identify the cards
    // Format is typically like "2♣ 2♠ 2♥ 2♦" or "10♣ 10♠ 10♥ 10♦"
    const cardPattern = /(\d+|[AKQJ])([♣♠♥♦])/g;
    const matches = originalText.matchAll(cardPattern);
    
    // Map symbols to suit names
    const suitMap = {
      '♣': 'clubs',
      '♠': 'spades',
      '♥': 'hearts',
      '♦': 'diamonds'
    };
    
    // Flag to track if we need to add a line break (for better layout)
    let cardCount = 0;
    
    // Process each card match and create image elements
    for (const match of matches) {
      const value = match[1]; // Card value
      const suitSymbol = match[2]; // Suit symbol
      const suit = suitMap[suitSymbol];
      
      // Create and add the card image
      const cardImg = createRuleCardImage(value, suit);
      symbolElement.appendChild(cardImg);
      
      // Add line break after two cards for better layout
      cardCount++;
      if (cardCount === 2) {
        symbolElement.appendChild(document.createElement('br'));
      }
    }
    
    // Add a visual indicator for "Four of a Kind" special case
    if (originalText.includes("A♣ A♠") && originalText.includes("A♥ A♦")) {
      const fourKindIndicator = document.createElement('div');
      fourKindIndicator.className = 'four-kind-indicator';
      fourKindIndicator.textContent = '4 of a Kind';
      fourKindIndicator.style.marginTop = '5px';
      fourKindIndicator.style.fontSize = '12px';
      fourKindIndicator.style.fontWeight = 'bold';
      symbolElement.appendChild(fourKindIndicator);
    }
  });
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const rulesModal = document.getElementById('rules-modal');
  
  // Only initialize if the rules modal exists
  if (rulesModal) {
    // Update the cards when the rules modal is shown
    rulesModal.addEventListener('click', event => {
      if (event.target.classList.contains('rules-summary')) {
        // Wait for the details to expand before updating cards
        setTimeout(updateRuleCardsWithImages, 100);
      }
    });
    
    // Also update when the "Expand All" button is clicked
    const expandBtn = document.getElementById('expand-collapse-all-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        setTimeout(updateRuleCardsWithImages, 100);
      });
    }
  }
});
