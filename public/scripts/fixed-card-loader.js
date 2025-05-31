// fixed-card-loader.js - Completely rewritten card image loader for maximum reliability

/**
 * Global cache for card images to speed up loading and reduce API calls
 */
const cardImageCache = {};

/**
 * Converts a card value and suit to the standard code format used by the Deck of Cards API
 */
function cardToCode(value, suit) {
  // Convert 10 to 0 as per API requirements
  const v = String(value).toUpperCase() === '10' ? '0' : String(value).toUpperCase();
  
  // Map suit names to single characters
  const suitMap = {
    hearts: 'H', 
    diamonds: 'D', 
    clubs: 'C', 
    spades: 'S'
  };
  
  const s = suitMap[suit.toLowerCase()];
  if (!s) return 'ERR';
  
  return v + s;
}

/**
 * Creates a text-based fallback card when image loading fails
 */
function createFallbackCard(value, suit) {
  // Create canvas for drawing text-based card
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 112; // Standard playing card ratio
  
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 80, 112);
  
  // Border
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 80, 112);
  
  // Text color (red for hearts/diamonds)
  ctx.fillStyle = (suit === 'hearts' || suit === 'diamonds') ? '#D40000' : '#000000';
  
  // Card value at top left
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(value.toString(), 6, 20);
  
  // Card value at bottom right (inverted)
  ctx.save();
  ctx.translate(74, 92);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(value.toString(), 0, 0);
  ctx.restore();
  
  // Suit in center
  ctx.font = '32px Arial';
  ctx.textAlign = 'center';
  
  // Determine suit symbol
  let suitChar = '?';
  if (suit === 'hearts') suitChar = '♥';
  else if (suit === 'diamonds') suitChar = '♦';
  else if (suit === 'clubs') suitChar = '♣';
  else if (suit === 'spades') suitChar = '♠';
  
  ctx.fillText(suitChar, 40, 65);
  
  return canvas.toDataURL('image/png');
}

/**
 * Enhanced card loading function
 */
async function loadCardImage(value, suit) {
  // Generate card code (e.g., "AH" for Ace of Hearts)
  const cardCode = cardToCode(value, suit);
  console.log(`🃏 Loading card: ${value} of ${suit} (${cardCode})`);
  
  // Check cache first
  if (cardImageCache[cardCode]) {
    console.log(`✅ Using cached image for ${cardCode}`);
    return cardImageCache[cardCode];
  }
  
  // Different sources to try in order
  const sources = [
    `https://deckofcardsapi.com/static/img/${cardCode}.png`,   // Direct API URL
    `/cards-api/static/img/${cardCode}.png`,                   // Proxied URL
    `https://www.deckofcardsapi.com/static/img/${cardCode}.png` // Alternative URL
  ];
  
  // Try each source with a delay between attempts
  let loadedImg = null;
  
  for (const source of sources) {
    try {
      console.log(`🔄 Trying to load ${cardCode} from ${source}`);
      
      // Create promise to load image
      loadedImg = await new Promise((resolve, reject) => {
        const img = new Image();
        
        // Set timeout to avoid hanging indefinitely
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout loading ${source}`));
        }, 3000);
        
        // Setup success handler
        img.onload = () => {
          clearTimeout(timeout);
          console.log(`✅ Successfully loaded ${cardCode} from ${source}`);
          resolve(img.src);
        };
        
        // Setup error handler
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error(`Failed to load ${source}`));
        };
        
        // Start loading
        img.src = source;
      });
      
      // If we got here, the image loaded successfully
      break;
    } catch (err) {
      console.warn(`⚠️ Failed to load from ${sources.indexOf(source) + 1}/${sources.length}: ${err.message}`);
    }
  }
  
  // If all sources failed, create fallback
  if (!loadedImg) {
    console.warn(`❌ All sources failed for ${cardCode}, creating fallback`);
    loadedImg = createFallbackCard(value, suit);
  }
  
  // Cache the result for future use
  cardImageCache[cardCode] = loadedImg;
  return loadedImg;
}

/**
 * Updates rule cards with actual card images
 */
async function updateRuleCardsWithImages() {
  console.log('🎴 Updating rule cards with images');
  
  // Find all card symbols in the document
  const cardSymbols = document.querySelectorAll('.card-symbol');
  console.log(`Found ${cardSymbols.length} card symbols to update`);
  
  // Process each card symbol
  for (const symbol of cardSymbols) {
    // Skip if already processed
    if (symbol.getAttribute('data-processed') === 'true') continue;
    
    // Get the text content (e.g., "2♣ 2♠ 2♥ 2♦")
    const text = symbol.textContent || '';
    
    // Clear the container
    symbol.innerHTML = '';
    
    // Create a flex container for cards
    const container = document.createElement('div');
    container.className = 'card-image-container';
    container.style.display = 'flex';
    container.style.flexWrap = 'wrap';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.gap = '5px';
    
    // Parse card patterns from text
    const cardPattern = /(\d+|[AKQJ])([♣♠♥♦])/g;
    const matches = Array.from(text.matchAll(cardPattern));
    
    // Map symbols to suit names
    const suitMap = {
      '♣': 'clubs',
      '♠': 'spades',
      '♥': 'hearts',
      '♦': 'diamonds'
    };
    
    // Load and create images for each card
    for (const match of matches) {
      const value = match[1]; // Card value
      const suitSymbol = match[2]; // Symbol (♣, ♠, etc.)
      const suit = suitMap[suitSymbol];
      
      if (suit) {
        try {
          // Create card element
          const cardElement = document.createElement('img');
          cardElement.className = 'rule-card-img';
          cardElement.alt = `${value} of ${suit}`;
          
          // Add styles
          cardElement.style.height = '70px';
          cardElement.style.borderRadius = '4px';
          cardElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
          cardElement.style.margin = '0 2px';
          cardElement.style.border = '1px solid #eee';
          
          // Show loading indicator
          cardElement.style.backgroundColor = '#f8f8f8';
          cardElement.style.width = '50px';
          
          // Add to container
          container.appendChild(cardElement);
          
          // Load card image (async)
          const imgSrc = await loadCardImage(value, suit);
          cardElement.src = imgSrc;
          cardElement.style.width = 'auto';
          cardElement.style.backgroundColor = 'transparent';
        } catch (err) {
          console.error(`Error creating card ${value} of ${suit}:`, err);
        }
      }
    }
    
    // Add container to the symbol element
    symbol.appendChild(container);
    
    // Add 'Four of a Kind' indicator if applicable
    if (text.includes('A♣ A♠') && text.includes('A♥ A♦')) {
      const indicator = document.createElement('div');
      indicator.className = 'four-kind-indicator';
      indicator.textContent = 'Four of a Kind';
      indicator.style.marginTop = '8px';
      indicator.style.fontSize = '12px';
      indicator.style.fontWeight = 'bold';
      indicator.style.textAlign = 'center';
      symbol.appendChild(indicator);
    }
    
    // Mark as processed to avoid re-processing
    symbol.setAttribute('data-processed', 'true');
  }
  
  console.log('✅ Rule cards update completed');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🃏 Fixed Card Loader initialized');
  
  // Update cards when requested
  document.addEventListener('update-rule-cards', () => {
    console.log('Received update-rule-cards event');
    updateRuleCardsWithImages();
  });
  
  // Auto-update on load with slight delay to ensure DOM is ready
  setTimeout(() => {
    updateRuleCardsWithImages();
  }, 500);
  
  // Update when elements in the rules modal are clicked
  const rulesModal = document.getElementById('rules-modal');
  if (rulesModal) {
    const details = rulesModal.querySelectorAll('details');
    details.forEach(detail => {
      detail.addEventListener('toggle', () => {
        if (detail.open) {
          setTimeout(updateRuleCardsWithImages, 100);
        }
      });
    });
  }
});

// Preload common cards
setTimeout(() => {
  console.log('🔄 Preloading common cards');
  const commonValues = ['2', '5', '10', 'A'];
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  
  commonValues.forEach(value => {
    suits.forEach(suit => {
      loadCardImage(value, suit);
    });
  });
}, 2000);
