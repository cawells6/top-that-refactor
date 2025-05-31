// card-loader.js - Enhanced card image loading with caching and fallbacks
const cardImageCache = new Map();

/**
 * Converts a card value and suit to the standard code format used by the API
 * @param {string|number} value - Card value (A, K, Q, J, 10, etc.)
 * @param {string} suit - Card suit (hearts, diamonds, clubs, spades)
 * @returns {string} Card code (e.g. "AH", "10S", "KD")
 */
export function cardToCode(value, suit) {
  const v = String(value).toUpperCase() === '10' ? '0' : String(value).toUpperCase();
  const suitMap = {
    hearts: 'H',
    diamonds: 'D',
    clubs: 'C',
    spades: 'S',
  };
  const s = suitMap[suit.toLowerCase()];
  if (!s) return 'ERR';
  return v + s;
}

/**
 * Loads a card image with retry logic, fallbacks, and caching
 * @param {string|number} value - Card value (A, K, Q, J, 10, etc.)
 * @param {string} suit - Card suit (hearts, diamonds, clubs, spades)
 * @param {Object} options - Options for image creation
 * @returns {Promise<HTMLImageElement>} Promise resolving to the loaded image
 */
export async function loadCardImage(value, suit, options = {}) {
  const cardCode = cardToCode(value, suit);
  const cacheKey = `card-${cardCode}`;
  
  // Check if image is already in cache
  if (cardImageCache.has(cacheKey)) {
    console.log(`🔄 Using cached image for ${value} of ${suit} (${cardCode})`);
    return cardImageCache.get(cacheKey).cloneNode(true);
  }
  
  const img = document.createElement('img');
  img.className = 'rule-card-img';
  img.alt = `${value} of ${suit}`;
  
  // Apply styling
  img.style.height = options.height || '60px';
  img.style.borderRadius = '3px';
  img.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
  img.style.margin = '0 2px';
  
  // Try loading from different sources
  const sources = [
    // First try the VITE proxy
    `/cards-api/static/img/${cardCode}.png`,
    // Then try direct URL
    `https://deckofcardsapi.com/static/img/${cardCode}.png`,
    // Fallback to a common CDN serving card images
    `https://raw.githubusercontent.com/hayeah/playing-cards-assets/master/png/${cardCode}.png`
  ];
  
  // Create a fallback element for text representation
  const createFallbackDisplay = () => {
    console.warn(`⚠️ Using text fallback for ${value} of ${suit}`);
    img.style.border = '1px solid #ccc';
    img.style.width = '40px';
    img.style.height = '60px';
    img.style.background = 'white';
    img.style.display = 'flex';
    img.style.justifyContent = 'center';
    img.style.alignItems = 'center';
    
    // Create a canvas for the fallback card
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    
    // Draw card background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 40, 60);
    
    // Draw border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 40, 60);
    
    // Draw value and suit
    ctx.fillStyle = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    
    // Draw value at top
    ctx.fillText(String(value), 20, 15);
    
    // Draw suit symbol in middle
    const suitSymbol = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    }[suit] || '?';
    
    ctx.font = '24px Arial';
    ctx.fillText(suitSymbol, 20, 40);
    
    // Use the canvas as image source
    img.src = canvas.toDataURL('image/png');
    return img;
  };
  
  // Function to attempt loading from a source
  const trySource = (src) => {
    return new Promise((resolve, reject) => {
      console.log(`🔍 Trying to load ${value} of ${suit} from ${src}`);
      
      const tempImg = new Image();
      tempImg.crossOrigin = 'anonymous'; // Enable CORS for the image
      
      const timeoutId = setTimeout(() => {
        console.warn(`⏱️ Timeout loading ${src}`);
        reject(new Error('Timeout'));
      }, 3000);
      
      tempImg.onload = () => {
        clearTimeout(timeoutId);
        console.log(`✅ Successfully loaded ${value} of ${suit} from ${src}`);
        
        // Store in cache
        cardImageCache.set(cacheKey, tempImg);
        
        // Update the original image
        img.src = tempImg.src;
        resolve(img);
      };
      
      tempImg.onerror = () => {
        clearTimeout(timeoutId);
        console.warn(`❌ Failed to load from ${src}`);
        reject(new Error(`Failed to load ${src}`));
      };
      
      tempImg.src = src;
    });
  };
  
  // Try each source in sequence
  for (const src of sources) {
    try {
      await trySource(src);
      return img; // Return on the first successful load
    } catch (error) {
      // Continue to next source
      console.warn(`Retrying with alternate source for ${value} of ${suit}`);
    }
  }
  
  // If all sources fail, use the fallback
  return createFallbackDisplay();
}

/**
 * Creates a rules section card image with all the optimizations
 * @param {string|number} value - Card value (A, K, Q, J, 10, etc.)
 * @param {string} suit - Card suit (hearts, diamonds, clubs, spades)
 * @param {Object} options - Options for image creation
 * @returns {HTMLImageElement} The created card image element
 */
export function createEnhancedCardImage(value, suit, options = {}) {
  console.log(`🃏 Creating enhanced card image for ${value} of ${suit}`);
  
  // Create placeholder while the image loads
  const img = document.createElement('img');
  img.className = 'rule-card-img';
  img.alt = `${value} of ${suit}`;
  img.style.height = options.height || '60px';
  img.style.width = '40px'; // Initial width for placeholder
  img.style.borderRadius = '3px';
  img.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
  img.style.margin = '0 2px';
  img.style.background = '#f0f0f0';
  
  // Show loading indication
  img.style.border = '1px dashed #ccc';
  
  // Start loading the actual image
  loadCardImage(value, suit, options)
    .then(loadedImg => {
      // Replace properties from the loaded image
      img.src = loadedImg.src;
      img.style.border = '';
      img.style.width = ''; // Let it size naturally
      img.style.background = '';
    })
    .catch(err => {
      console.error(`Failed to load card image for ${value} of ${suit}:`, err);
      // The fallback is already applied by loadCardImage
    });
  
  return img;
}

/**
 * Updates all card symbols in the rules section with actual card images
 */
export function enhanceRulesCards() {
  console.log('🎲 Enhancing rules cards with improved loader');
  
  // Select all card-symbol elements in the rules
  const cardSymbols = document.querySelectorAll('.card-symbol');
  
  cardSymbols.forEach((symbolElement) => {
    // Get the original text representation
    const originalText = symbolElement.textContent || '';
    
    // Skip if already processed
    if (symbolElement.dataset.enhanced === 'true') return;
    
    // Clear the container
    symbolElement.innerHTML = '';
    
    // Create a flex container for better layout
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-image-container';
    cardContainer.style.display = 'flex';
    cardContainer.style.flexWrap = 'wrap';
    cardContainer.style.justifyContent = 'center';
    cardContainer.style.gap = '5px';
    
    // Parse the original text to identify the cards
    // Format is typically like "2♣ 2♠ 2♥ 2♦" or "10♣ 10♠ 10♥ 10♦"
    const cardPattern = /(\d+|[AKQJ])([♣♠♥♦])/g;
    const matches = Array.from(originalText.matchAll(cardPattern));
    
    // Map symbols to suit names
    const suitMap = {
      '♣': 'clubs',
      '♠': 'spades',
      '♥': 'hearts',
      '♦': 'diamonds',
    };
    
    // Process each card match and create image elements
    matches.forEach((match) => {
      const value = match[1]; // Card value
      const suitSymbol = match[2]; // Suit symbol
      const suit = suitMap[suitSymbol];
      
      if (suit) {
        // Create and add the enhanced card image
        const cardImg = createEnhancedCardImage(value, suit);
        cardContainer.appendChild(cardImg);
      }
    });
    
    // Add the container to the symbol element
    symbolElement.appendChild(cardContainer);
    
    // Mark as enhanced
    symbolElement.dataset.enhanced = 'true';
    
    // Add a visual indicator for "Four of a Kind" special case
    if (originalText.includes('A♣ A♠') && originalText.includes('A♥ A♦')) {
      const fourKindIndicator = document.createElement('div');
      fourKindIndicator.className = 'four-kind-indicator';
      fourKindIndicator.textContent = '4 of a Kind';
      fourKindIndicator.style.marginTop = '8px';
      fourKindIndicator.style.fontSize = '12px';
      fourKindIndicator.style.fontWeight = 'bold';
      fourKindIndicator.style.textAlign = 'center';
      symbolElement.appendChild(fourKindIndicator);
    }
  });
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🃏 Enhanced Card Loader module loaded');
  
  // Listen for custom event from events.ts
  document.addEventListener('update-rule-cards', () => {
    console.log('🃏 Received update-rule-cards event, enhancing card images');
    enhanceRulesCards();
  });
  
  // Run once on load with a slight delay to ensure DOM is ready
  setTimeout(enhanceRulesCards, 300);
  
  // Attach to rules modal events
  const rulesModal = document.getElementById('rules-modal');
  if (rulesModal) {
    // Update when rules details are expanded
    const rulesElements = document.querySelectorAll('.rules-summary');
    rulesElements.forEach((element) => {
      element.addEventListener('click', () => {
        setTimeout(enhanceRulesCards, 100);
      });
    });
    
    // Update when expand/collapse button is clicked
    const expandBtn = document.getElementById('expand-collapse-all-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        setTimeout(enhanceRulesCards, 100);
      });
    }
  }
});
