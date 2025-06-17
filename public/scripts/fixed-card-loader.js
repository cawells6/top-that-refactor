// fixed-card-loader.js - Completely rewritten card image loader for maximum reliability

/**
 * Global cache for card images to speed up loading and reduce API calls
 */
const cardImageCache = {};

// Set up a flag to avoid processing cards more than once
const processedElements = new Set();

// Store original content of card symbols to re-use when needed
const originalCardContent = {
  '2': '2♣ 2♠ 2♥ 2♦',
  '5': '5♣ 5♠ 5♥ 5♦',
  '10': '10♣ 10♠ 10♥ 10♦',
  'A': 'A♣ A♠ A♥ A♦'
};

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
    spades: 'S',
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
  ctx.fillStyle = suit === 'hearts' || suit === 'diamonds' ? '#D40000' : '#000000';

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

  // Check cache first
  if (cardImageCache[cardCode]) {
    return cardImageCache[cardCode];
  }

  // Different sources to try in order
  const sources = [
    `https://deckofcardsapi.com/static/img/${cardCode}.png`, // Direct API URL
    `/cards-api/static/img/${cardCode}.png`, // Proxied URL
    `https://www.deckofcardsapi.com/static/img/${cardCode}.png`, // Alternative URL
  ];

  // Try each source with a delay between attempts
  let loadedImg = null;

  for (const source of sources) {
    try {
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
      // Ignore errors and try the next source
    }
  }

  // If all sources failed, create fallback
  if (!loadedImg) {
    loadedImg = createFallbackCard(value, suit);
  }

  // Cache the result for future use
  cardImageCache[cardCode] = loadedImg;
  return loadedImg;
}

/**
 * Helper function to create and add a single card image element to a parent container.
 * @param {string} value - The card value (e.g., 'A', 'K', '10').
 * @param {string} suit - The card suit (e.g., 'hearts', 'spades').
 * @param {HTMLElement} parentContainer - The container to append the card image to.
 */
async function createAndAddCardElement(value, suit, parentContainer) {
  try {
    const cardElement = document.createElement('img');
    cardElement.className = 'rule-card-img fixed-card-permanent';
    cardElement.alt = `${value} of ${suit}`;
    cardElement.style.height = '70px';
    cardElement.style.borderRadius = '4px';
    cardElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    cardElement.style.margin = '0 2px';
    cardElement.style.border = '1px solid #eee';
    cardElement.style.backgroundColor = '#f8f8f8'; // Loading placeholder
    cardElement.style.width = '50px'; // Placeholder width
    cardElement.dataset.fixedLoader = 'true'; // Mark as created by fixed-loader
    cardElement.dataset.cardValue = value; // Store card value for future reference
    cardElement.dataset.cardSuit = suit; // Store card suit for future reference
    cardElement.style.display = 'block !important'; // Force display
    cardElement.style.visibility = 'visible !important'; // Force visibility
    
    // Add to DOM
    parentContainer.appendChild(cardElement);
    
    // Load image
    const imgSrc = await loadCardImage(value, suit);
    cardElement.src = imgSrc;
    cardElement.style.width = 'auto'; // Reset width after load
    cardElement.style.backgroundColor = 'transparent';
    
    // Remove hover effects
    cardElement.style.transform = 'none !important';
    cardElement.style.transition = 'none !important';
    
    // Add stronger CSS protections after a short delay to ensure rendering
    setTimeout(() => {
      cardElement.style.cssText += 'display: block !important; visibility: visible !important; opacity: 1 !important; transform: none !important; transition: none !important;';
      
      // Add event listener to prevent hover effects
      cardElement.addEventListener('mouseenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        cardElement.style.transform = 'none !important';
        cardElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2) !important';
      }, true);
    }, 100);
  } catch (err) {
    console.error(`[FIXED-LOADER] Error creating card image for ${value} of ${suit}:`, err);
  }
}

/**
 * Updates rule cards with actual card images
 * @returns {Promise<boolean>} True if successful, false if no card symbols found
 */
async function updateRuleCardsWithImages() {
  const cardSymbols = document.querySelectorAll('.card-symbol');
  
  if (cardSymbols.length === 0) {
    return false;
  }
  
  // Reset processed elements if we haven't processed any yet
  if (processedElements.size === 0) {
  }
  
  // Log visibility of the rules modal
  const rulesModal = document.getElementById('rules-modal');
  if (rulesModal) {
    const isVisible = !rulesModal.classList.contains('modal--hidden');
  }
  
  // Clean up any existing cards first to prevent duplicates
  try {
    const existingCards = document.querySelectorAll('.rule-card-img[data-fixed-loader="true"]');
    existingCards.forEach(card => card.remove());
  } catch (err) {
    console.error('[FIXED-LOADER] Error during cleanup:', err);
  }
  
  for (const symbol of cardSymbols) {
    // Generate a unique ID for this element to track processing
    const uniqueId = symbol.id || 
                     symbol.getAttribute('data-id') || 
                     `card-symbol-${Math.random().toString(36).substring(2, 10)}`;
                     
    if (!symbol.id && !symbol.getAttribute('data-id')) {
      symbol.setAttribute('data-id', uniqueId);
    }
    
    // Skip if we've already processed this element
    if (processedElements.has(uniqueId)) {
      continue;
    }
    
    // Add to processed set
    processedElements.add(uniqueId);
    
    // Get card value from data attribute
    const dataCardValue = symbol.getAttribute('data-card-value');
    // Try to get text content, or use our stored original content if empty
    let text = symbol.textContent || '';
    if (!text.trim() && dataCardValue) {
      text = originalCardContent[dataCardValue] || '';
    }
    
    // Create a new container for images
    const imageContainer = document.createElement('div');
    imageContainer.className = 'card-image-container fixed-card-container-permanent';
    imageContainer.style.border = 'none !important';
    imageContainer.style.boxShadow = 'none !important';
    imageContainer.style.padding = '0 !important';
    imageContainer.style.display = 'flex';
    imageContainer.style.flexWrap = 'wrap';
    imageContainer.style.justifyContent = 'center';
    imageContainer.style.alignItems = 'center';
    imageContainer.style.gap = '5px';
    imageContainer.dataset.fixedLoaderContainer = 'true'; // Mark as our container

    // Determine the card value and suits based on data-card-value or text patterns
    let firstCardValue = dataCardValue || '';
    let suitMap = { '♣': 'clubs', '♠': 'spades', '♥': 'hearts', '♦': 'diamonds' };
    let matches = [];
    
    if (text) {
      // Parse card patterns from text
      const cardPattern = /(\d+|[AKQJ])([♣♠♥♦])/g;
      matches = Array.from(text.matchAll(cardPattern));
    }
    
    // Special case for data attribute but no text matches
    if (matches.length === 0 && dataCardValue) {
      
      // Handle based on data-card-value
      if (dataCardValue === '2' || dataCardValue === '5' || dataCardValue === '10') {
        await createAndAddCardElement(dataCardValue, 'clubs', imageContainer); // Default to clubs
        
        // Add the images container to the symbol
        while (symbol.firstChild) symbol.removeChild(symbol.firstChild);
        symbol.appendChild(imageContainer);
        continue; // Skip to next symbol
      }
      
      if (dataCardValue === 'A') {
        // Show all four suits for the Ace
        const suits = ['clubs', 'spades', 'hearts', 'diamonds'];
        for (const suit of suits) {
          await createAndAddCardElement('A', suit, imageContainer);
        }
        
        // Add "Four of a Kind" text indicator
        const indicator = document.createElement('div');
        indicator.className = 'four-kind-indicator';
        indicator.textContent = 'Four of a Kind';
        indicator.style.marginTop = '8px';
        indicator.style.fontSize = '12px';
        indicator.style.fontWeight = 'bold';
        indicator.style.textAlign = 'center';
        indicator.style.width = '100%';
        
        // Add the container and indicator to the symbol
        while (symbol.firstChild) symbol.removeChild(symbol.firstChild);
        symbol.appendChild(imageContainer);
        symbol.appendChild(indicator);
        continue; // Skip to next symbol
      }
      
      // Default: just show one card if we have a data-card-value
      await createAndAddCardElement(dataCardValue, 'clubs', imageContainer); // Default to clubs
      while (symbol.firstChild) symbol.removeChild(symbol.firstChild);
      symbol.appendChild(imageContainer);
      continue; // Skip to next symbol
    }
    
    if (matches.length > 0) {
      // Get first card details
      const firstCardValue = matches[0][1];
      const firstCardSuitSymbol = matches[0][2];
      const firstCardSuit = suitMap[firstCardSuitSymbol];
      
      // Special case: For rules starting with '2', '5', or '10', show just one card
      if (firstCardValue === '2' || firstCardValue === '5' || firstCardValue === '10') {
        if (firstCardSuit) {
          await createAndAddCardElement(firstCardValue, firstCardSuit, imageContainer);
        }
        // Add the images container to the symbol
        while (symbol.firstChild) symbol.removeChild(symbol.firstChild);
        symbol.appendChild(imageContainer);
        continue; // Skip rest of processing
      }
      
      // Check for Four of a Kind (when all 4 cards have the same value)
      let isActualFourOfAKind = false;
      if (matches.length === 4) {
        isActualFourOfAKind = matches.every(match => match[1] === firstCardValue);
      }
      
      if (isActualFourOfAKind) {
        // Display all four matched cards for Four of a Kind
        for (const match of matches) {
          const value = match[1];
          const suit = suitMap[match[2]];
          if (suit) {
            await createAndAddCardElement(value, suit, imageContainer);
          }
        }
        
        // Add "Four of a Kind" text indicator
        const indicator = document.createElement('div');
        indicator.className = 'four-kind-indicator';
        indicator.textContent = 'Four of a Kind';
        indicator.style.marginTop = '8px';
        indicator.style.fontSize = '12px';
        indicator.style.fontWeight = 'bold';
        indicator.style.textAlign = 'center';
        indicator.style.width = '100%';
        
        // Add the container and indicator to the symbol
        while (symbol.firstChild) symbol.removeChild(symbol.firstChild);
        symbol.appendChild(imageContainer);
        symbol.appendChild(indicator);
        continue; // Skip rest of processing
      }
      
      // Default case: just show the first card
      if (firstCardSuit) {
        await createAndAddCardElement(firstCardValue, firstCardSuit, imageContainer);
      }
      
      // Add the container to the symbol
      while (symbol.firstChild) symbol.removeChild(symbol.firstChild);
      symbol.appendChild(imageContainer);
    }
  }
  return true;
}

// Event listeners for updating cards
console.log('[FIXED-LOADER] Script loaded and running - Initial check');

// Function to check if card symbols exist and count them
function checkCardSymbols() {
  const cardSymbols = document.querySelectorAll('.card-symbol');
  
  // Log details about each symbol
  if (cardSymbols.length > 0) {
    cardSymbols.forEach((symbol, index) => {
      const dataCardValue = symbol.getAttribute('data-card-value');
    });
  }
  return cardSymbols.length;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('[FIXED-LOADER] DOM content loaded, setting up event listeners');
  
  // Check if card symbols exist initially
  const initialSymbolsCount = checkCardSymbols();
  
  // Clear any persistent data
  processedElements.clear();
  console.log('[FIXED-LOADER] Cleared processed elements cache');
  
  // Try once immediately in case elements are already available
  updateRuleCardsWithImages().catch(err => {
    console.error('[FIXED-LOADER] Initial card update failed:', err);
  });
  
  // Process cards with a delay as backup
  setTimeout(() => {
    try {
      console.log('[FIXED-LOADER] Running delayed update after 1000ms');
      checkCardSymbols(); // Check again before update
      updateRuleCardsWithImages();
    } catch (err) {
      console.error('[FIXED-LOADER] Delayed card update failed:', err);
    }
  }, 1000);
  
  // Listen for card update events
  document.addEventListener('update-rule-cards', () => {
    console.log('[FIXED-LOADER] Received update-rule-cards event');
    updateRuleCardsWithImages();
  });
  
  // Update cards when rules modal is opened
  const rulesBtn = document.getElementById('setup-rules-button');
  if (rulesBtn) {
    console.log('[FIXED-LOADER] Found rules button, adding click listener');
    rulesBtn.addEventListener('click', () => {
      console.log('[FIXED-LOADER] Rules button clicked, scheduling card update');
      setTimeout(() => {
        checkCardSymbols();
        updateRuleCardsWithImages();
      }, 300);
    });
  } else {
    console.warn('[FIXED-LOADER] Rules button not found');
  }
  
  // Update cards when rule sections are expanded
  const ruleSections = document.querySelectorAll('.rules-summary');
  console.log(`[FIXED-LOADER] Found ${ruleSections.length} rule sections, adding listeners`);
  
  ruleSections.forEach(section => {
    section.addEventListener('click', () => {
      console.log('[FIXED-LOADER] Rules section clicked, updating cards');
      setTimeout(() => {
        checkCardSymbols();
        updateRuleCardsWithImages();
      }, 100);
    });
  });
  
  // Update cards when "Expand All" button is clicked
  const expandBtn = document.getElementById('expand-collapse-all-btn');
  if (expandBtn) {
    console.log('[FIXED-LOADER] Found expand button, adding listener');
    expandBtn.addEventListener('click', () => {
      console.log('[FIXED-LOADER] Expand All button clicked, updating cards');
      setTimeout(() => {
        checkCardSymbols();
        updateRuleCardsWithImages();
      }, 200);
    });
  } else {
    console.warn('[FIXED-LOADER] Expand button not found');
  }
  
  // Add mutation observer to detect when rules modal becomes visible
  const modalObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const modal = mutation.target;
        if (modal instanceof HTMLElement && !modal.classList.contains('modal--hidden')) {
          console.log('[FIXED-LOADER] Rules modal became visible, updating cards');
          setTimeout(() => {
            // Check if any symbols are empty
            const emptySymbols = document.querySelectorAll('.card-symbol:empty');
            if (emptySymbols.length > 0) {
              console.log(`[FIXED-LOADER] Found ${emptySymbols.length} empty card symbols, doing full reset`);
              processedElements.clear(); // Force reprocessing everything
            }
            
            checkCardSymbols();
            updateRuleCardsWithImages();
          }, 300);
        }
      }
    });
  });
  
  const rulesModal = document.getElementById('rules-modal');
  if (rulesModal) {
    console.log('[FIXED-LOADER] Found rules modal, adding observer');
    modalObserver.observe(rulesModal, { attributes: true });
    
    // Also listen for clicks on "Got it!" button which will close the modal
    const gotItBtn = document.getElementById('rules-gotit-btn');
    if (gotItBtn) {
      gotItBtn.addEventListener('click', () => {
        console.log('[FIXED-LOADER] Rules closed, preparing for next open');
        processedElements.clear(); // Reset processed elements when closing rules
      });
    }
  } else {
    console.warn('[FIXED-LOADER] Rules modal not found');
  }
});

// Export the update function for direct use
window.updateRuleCardsWithImages = updateRuleCardsWithImages;

// Add diagnostic functions to help troubleshoot
window.fixedCardLoaderDiagnostics = {
  version: '1.2.0',
  checkCardSymbols: () => {
    const cardSymbols = document.querySelectorAll('.card-symbol');
    console.table(Array.from(cardSymbols).map((symbol, i) => ({
      index: i,
      text: symbol.textContent.trim().substring(0, 30) + '...',
      dataCardValue: symbol.getAttribute('data-card-value') || 'none',
      visible: symbol.offsetParent !== null,
      hasImages: symbol.querySelector('.rule-card-img') !== null,
      parent: symbol.parentElement?.tagName || 'none',
      processed: processedElements.has(symbol.id || symbol.getAttribute('data-id') || '')
    })));
    return cardSymbols.length;
  },
  forceUpdate: () => {
    processedElements.clear();
    console.log('[FIXED-LOADER] Forced update: Cleared processed elements');
    return updateRuleCardsWithImages();
  },
  showStats: () => {
    console.log(`[FIXED-LOADER] Stats:
    - Processed elements: ${processedElements.size}
    - Cached card images: ${Object.keys(cardImageCache).length}
    - Card symbols in DOM: ${document.querySelectorAll('.card-symbol').length}
    - Card images rendered: ${document.querySelectorAll('.rule-card-img[data-fixed-loader="true"]').length}
    - Rules modal visible: ${!document.getElementById('rules-modal')?.classList.contains('modal--hidden')}
    `);
  },
  clearCache: () => {
    Object.keys(cardImageCache).forEach(key => delete cardImageCache[key]);
    processedElements.clear();
    console.log('[FIXED-LOADER] All caches cleared');
  },
  resetCards: () => {
    // Remove all card images first
    const existingCards = document.querySelectorAll('.rule-card-img[data-fixed-loader="true"]');
    existingCards.forEach(card => card.remove());
    
    // Reset the data structures
    processedElements.clear();
    Object.keys(cardImageCache).forEach(key => delete cardImageCache[key]);
    
    // Force the rules to be visible
    const rulesModal = document.getElementById('rules-modal');
    if (rulesModal && rulesModal.classList.contains('modal--hidden')) {
      console.log('[FIXED-LOADER] Opening rules modal');
      rulesModal.classList.remove('modal--hidden');
      const modalOverlay = document.getElementById('modal-overlay');
      if (modalOverlay) modalOverlay.classList.remove('modal__overlay--hidden');
    }
    
    console.log('[FIXED-LOADER] Reset complete, forcing card update');
    setTimeout(() => updateRuleCardsWithImages(), 300);
    return true;
  },
  
  // Clean up all card styles
  cleanupStyles: () => {
    cleanupCardStyles();
    return "Card styles cleaned up successfully";
  }
};

// Run diagnostics after a delay to help with debugging
setTimeout(() => {
  console.log('[FIXED-LOADER] Running startup diagnostics...');
  if (window.fixedCardLoaderDiagnostics) {
    window.fixedCardLoaderDiagnostics.showStats();
  }
}, 2000);

// Add a mutation observer to prevent removal of our card images
const cardProtectionObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
      let needsUpdate = false;
      
      // Check if any of our card images were removed
      for (const node of mutation.removedNodes) {
        if (node instanceof HTMLElement) {
          if (node.classList?.contains('rule-card-img') && node.dataset?.fixedLoader === 'true') {
            needsUpdate = true;
            break;
          }
          
          if (node.classList?.contains('card-image-container') && node.dataset?.fixedLoaderContainer === 'true') {
            needsUpdate = true;
            break;
          }
          
          // Also check if the removed node contains any of our elements
          if (node.querySelector?.('.rule-card-img[data-fixed-loader="true"], .card-image-container[data-fixed-loader-container="true"]')) {
            needsUpdate = true;
            break;
          }
        }
      }
      
      if (needsUpdate) {
        // Give a short delay to let any competing scripts finish
        setTimeout(() => {
          console.log('[FIXED-LOADER] Restoring cards after detected removal...');
          processedElements.clear();
          updateRuleCardsWithImages();
        }, 50);
      }
    }
  }
});

// Start observing the entire document body for changes
setTimeout(() => {
  cardProtectionObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  console.log('[FIXED-LOADER] Card protection observer started');
}, 1000);

// Persistently monitor for and restore missing card images
setInterval(() => {
  // Only run when modal is visible
  const rulesModal = document.getElementById('rules-modal');
  if (!rulesModal || rulesModal.classList.contains('modal--hidden')) {
    return;
  }
  
  // Check for card symbols that should have images
  const symbols = document.querySelectorAll('.card-symbol');
  const symbolsWithoutImages = Array.from(symbols).filter(symbol => 
    !symbol.querySelector('.rule-card-img[data-fixed-loader="true"]') &&
    symbol.getAttribute('data-card-value')
  );
  
  if (symbolsWithoutImages.length > 0) {
    processedElements.clear();
    updateRuleCardsWithImages();
  } else {
    // Check for invisible cards that need to be made visible
    const allCards = document.querySelectorAll('.rule-card-img[data-fixed-loader="true"]');
    Array.from(allCards).forEach(card => {
      if (card instanceof HTMLElement) {
        // Get computed style to check if card is hidden
        const style = window.getComputedStyle(card);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          card.style.cssText += 'display: block !important; visibility: visible !important; opacity: 1 !important;';
        }
      }
    });
  }
}, 1000); // Check every second

/**
 * Apply style cleanup to all card-related elements
 */
function cleanupCardStyles() {
  console.log('[FIXED-LOADER] 🧹 Cleaning up card styles');
  
  // Clean all card images
  document.querySelectorAll('.rule-card-img').forEach(img => {
    if (img.style) {
      img.style.transform = 'none !important';
      img.style.transition = 'none !important';
      img.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2) !important';
      img.style.border = '1px solid #eee !important';
      
      // Remove hover listener and add our own
      img.onmouseenter = null;
      img.onmouseover = null;
      img.addEventListener('mouseenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        img.style.transform = 'none !important';
      }, true);
    }
  });
  
  // Clean all card symbols
  document.querySelectorAll('.card-symbol').forEach(symbol => {
    if (symbol.style) {
      symbol.style.border = 'none !important';
      symbol.style.boxShadow = 'none !important';
      symbol.style.backgroundColor = 'transparent !important';
      symbol.style.padding = '5px 0 !important';
    }
  });
  
  // Clean all card containers
  document.querySelectorAll('.card-image-container').forEach(container => {
    if (container.style) {
      container.style.border = 'none !important';
      container.style.boxShadow = 'none !important';
      container.style.backgroundColor = 'transparent !important';
      container.style.padding = '0 !important';
    }
  });
  
  // Clean list items
  document.querySelectorAll('.card-list-item').forEach(item => {
    if (item.style) {
      item.style.transform = 'none !important';
      item.style.boxShadow = 'none !important';
      item.style.borderLeft = 'none !important';
      item.style.borderRight = 'none !important';
      item.style.borderTop = 'none !important';
      item.style.padding = '10px 5px !important';
      item.style.backgroundColor = 'transparent !important';
    }
  });
}

// Run cleanup when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cleanupCardStyles);
} else {
  cleanupCardStyles();
}

// Re-run cleanup when rules modal opens
document.addEventListener('click', event => {
  if (event.target && event.target.id === 'setup-rules-button') {
    // Give the modal time to open
    setTimeout(cleanupCardStyles, 500);
    // Run again to catch any late elements
    setTimeout(cleanupCardStyles, 1500);
  }
});
