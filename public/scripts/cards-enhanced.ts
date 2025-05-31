// cards-enhanced.ts - Helper module for improved card rendering

/**
 * Improves rendering reliability by adding additional features:
 * - Caches successfully loaded card images
 * - Provides multiple fallback sources for card images
 * - Creates visual fallbacks for failed card loads
 */

// Cache for loaded card images
const cardImageCache = new Map<string, HTMLImageElement>();

/**
 * Enhances an existing image element with fallback handling
 * @param img - The image element to enhance
 * @param cardCode - The card code (e.g. "AH", "2C", etc)
 * @param container - The container element for the card (for fallback display)
 * @param onLoad - Optional callback when card successfully loads
 */
export function enhanceCardImage(
  img: HTMLImageElement,
  cardCode: string,
  container: HTMLElement,
  card: { value: any; suit: any; back?: boolean },
  onLoad?: (img: HTMLImageElement) => void
): void {
  const originalSrc = img.src;
  console.log(`Enhancing card image loading for ${cardCode}`);
  
  // Check cache first
  if (cardImageCache.has(cardCode)) {
    console.log(`Using cached card image for ${cardCode}`);
    const cachedSrc = cardImageCache.get(cardCode)?.src;
    if (cachedSrc) {
      img.src = cachedSrc;
      return;
    }
  }
  
  // Override error handler with improved version
  img.onerror = () => {
    console.error(`Failed to load card image: ${img.src} (${cardCode})`);
    
    // Try different sources in sequence
    if (img.src === originalSrc) {
      // First fallback: Try our proxy
      const proxyUrl = `/cards-api/static/img/${cardCode}.png`;
      console.log(`Trying proxy URL: ${proxyUrl}`);
      img.src = proxyUrl;
      return;
    } else if (img.src.includes('/cards-api/')) {
      // Second fallback: Try GitHub hosted cards
      const githubUrl = `https://raw.githubusercontent.com/hayeah/playing-cards-assets/master/png/${cardCode}.png`;
      console.log(`Trying GitHub URL: ${githubUrl}`);
      img.src = githubUrl;
      return;
    }
    
    // All sources failed, create visual fallback
    console.warn(`All sources failed for ${cardCode}, creating visual fallback`);
    img.style.visibility = 'visible';
    
    // Show fallback in container
    container.innerHTML = '';
    container.style.border = '1px solid #ccc';
    container.style.borderRadius = '8px';
    container.style.backgroundColor = 'white';
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.flexDirection = 'column';
    container.style.padding = '5px';
    
    // Display value and suit as text if we have that information
    if (!card.back && card.value && card.suit) {
      const valueDisplay = document.createElement('div');
      valueDisplay.style.fontSize = '18px';
      valueDisplay.style.fontWeight = 'bold';
      valueDisplay.style.color = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
      valueDisplay.textContent = String(card.value);
      
      const suitDisplay = document.createElement('div');
      suitDisplay.style.fontSize = '24px';
      suitDisplay.style.color = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
      
      const suitSymbols: Record<string, string> = {
        'hearts': '♥',
        'diamonds': '♦',
        'clubs': '♣',
        'spades': '♠'
      };
      
      suitDisplay.textContent = suitSymbols[card.suit] || '';
      
      container.appendChild(valueDisplay);
      container.appendChild(suitDisplay);
    } else {
      // For card backs
      const backSymbol = document.createElement('div');
      backSymbol.textContent = '🂠';
      backSymbol.style.fontSize = '32px';
      backSymbol.style.color = '#444';
      container.appendChild(backSymbol);
    }
    
    if (onLoad) onLoad(img);
  };
  
  // Override onload to cache successful images
  const originalOnload = img.onload;
  img.onload = function() {
    // Cache the successful image
    cardImageCache.set(cardCode, img.cloneNode() as HTMLImageElement);
    
    console.log(`Successfully loaded card image for ${cardCode}`);
    
    // Call original onload if it exists
    if (originalOnload && typeof originalOnload === 'function') {
      originalOnload.call(img);
    }
    
    if (onLoad) onLoad(img);
  };
}

/**
 * Preloads common card images for faster gameplay
 */
export function preloadCommonCards(): void {
  console.log('Preloading common cards...');
  const suits = ['H', 'D', 'C', 'S'];
  const values = ['A', 'K', 'Q', 'J', '0', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  // Also preload card back
  const backImg = new Image();
  backImg.src = 'https://deckofcardsapi.com/static/img/back.png';
  
  // Preload high-priority cards first (2s, 5s, 10s, Aces)
  const priorityCards = ['2H', '2D', '2C', '2S', '5H', '5D', '5C', '5S', '0H', '0D', '0C', '0S', 'AH', 'AD', 'AC', 'AS'];
  
  priorityCards.forEach(cardCode => {
    const img = new Image();
    img.src = `https://deckofcardsapi.com/static/img/${cardCode}.png`;
    img.onload = () => {
      cardImageCache.set(cardCode, img);
      console.log(`Preloaded ${cardCode}`);
    };
  });
}

// Initialize preloading when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(preloadCommonCards, 2000); // Start preloading after initial page load
});
