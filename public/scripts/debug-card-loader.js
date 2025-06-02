// debug-card-loader.js - Version with enhanced debugging
console.log('🔍 Debug Card Loader Initializing');

// Create a visible debug panel in the corner of the screen
function createDebugPanel() {
  const panel = document.createElement('div');
  panel.id = 'card-debug-panel';
  panel.style.position = 'fixed';
  panel.style.bottom = '10px';
  panel.style.right = '10px';
  panel.style.width = '300px';
  panel.style.maxHeight = '200px';
  panel.style.overflow = 'auto';
  panel.style.backgroundColor = 'rgba(0,0,0,0.8)';
  panel.style.color = '#fff';
  panel.style.padding = '10px';
  panel.style.fontSize = '12px';
  panel.style.fontFamily = 'monospace';
  panel.style.zIndex = '10000';
  panel.style.borderRadius = '5px';
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'X';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '5px';
  closeBtn.style.right = '5px';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#fff';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => panel.style.display = 'none';
  
  panel.appendChild(closeBtn);
  
  // Add content area
  const content = document.createElement('div');
  content.id = 'card-debug-content';
  panel.appendChild(content);
  
  return panel;
}

// Log a message both to console and debug panel
function debugLog(message, type = 'info') {
  const colors = {
    info: '#8cf',
    success: '#8f8',
    error: '#f88',
    warning: '#fc8'
  };
  
  console.log(`${type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'} ${message}`);
  
  const panel = document.getElementById('card-debug-content');
  if (panel) {
    const entry = document.createElement('div');
    entry.style.borderBottom = '1px solid #444';
    entry.style.padding = '3px 0';
    entry.style.color = colors[type] || '#fff';
    entry.textContent = message;
    panel.appendChild(entry);
    panel.scrollTop = panel.scrollHeight;
  }
}

// Direct card loading function with extensive logging
async function loadCard(value, suit) {
  const suitMap = {
    'hearts': 'H', 
    'diamonds': 'D', 
    'clubs': 'C', 
    'spades': 'S'
  };
  
  const v = value === '10' ? '0' : String(value).toUpperCase();
  const s = suitMap[suit.toLowerCase()] || '';
  const cardCode = v + s;
  
  debugLog(`Attempting to load card: ${value} of ${suit} (${cardCode})`);
  
  // Try direct URL first
  const directURL = `https://deckofcardsapi.com/static/img/${cardCode}.png`;
  debugLog(`Trying direct URL: ${directURL}`, 'info');
  
  try {
    // Use fetch to explicitly show network status
    const response = await fetch(directURL, { method: 'HEAD' });
    
    if (response.ok) {
      debugLog(`Direct URL response OK: ${response.status}`, 'success');
      return directURL;
    } else {
      debugLog(`Direct URL failed: ${response.status} ${response.statusText}`, 'error');
    }
  } catch (error) {
    debugLog(`Error fetching direct URL: ${error.message}`, 'error');
  }
  
  // Try proxy URL next
  const proxyURL = `/cards-api/static/img/${cardCode}.png`;
  debugLog(`Trying proxy URL: ${proxyURL}`, 'info');
  
  try {
    const response = await fetch(proxyURL, { method: 'HEAD' });
    
    if (response.ok) {
      debugLog(`Proxy URL response OK: ${response.status}`, 'success');
      return proxyURL;
    } else {
      debugLog(`Proxy URL failed: ${response.status} ${response.statusText}`, 'error');
    }
  } catch (error) {
    debugLog(`Error fetching proxy URL: ${error.message}`, 'error');
  }
  
  // Create fallback card using canvas
  debugLog('All loading attempts failed, creating fallback card', 'warning');
  
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  
  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 80, 112);
  
  // Draw border
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 80, 112);
  
  // Set text color based on suit
  ctx.fillStyle = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
  
  // Draw value text
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(value, 40, 30);
  
  // Draw suit symbol
  const suitSymbols = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
  };
  
  ctx.font = '36px Arial';
  ctx.fillText(suitSymbols[suit.toLowerCase()] || '?', 40, 70);
  
  return canvas.toDataURL('image/png');
}

// Function to replace specific card symbols in the rules section
async function replaceCardSymbols() {
  debugLog('Starting card symbol replacement');
  
  const cardSymbols = document.querySelectorAll('.card-symbol');
  debugLog(`Found ${cardSymbols.length} card symbol elements`);
  
  for (const symbol of cardSymbols) {
    // Skip if already processed
    if (symbol.getAttribute('data-processed') === 'true') {
      debugLog('Skipping already processed symbol', 'info');
      continue;
    }
    
    // Save original text content
    const originalText = symbol.textContent || '';
    debugLog(`Processing symbol with text: ${originalText}`);
    
    // Clear the element
    while (symbol.firstChild) {
      symbol.removeChild(symbol.firstChild);
    }
    
    // Create container for card images
    const container = document.createElement('div');
    container.className = 'card-image-container';
    container.style.display = 'flex';
    container.style.flexWrap = 'wrap';
    container.style.justifyContent = 'center';
    container.style.gap = '8px';
    
    // Extract card values and suits using regex
    const cardPattern = /(\d+|[AKQJ])([♣♠♥♦])/g;
    let match;
    
    const suitMap = {
      '♣': 'clubs',
      '♠': 'spades',
      '♥': 'hearts',
      '♦': 'diamonds'
    };
    
    // Flag to track if we processed any cards
    let cardsProcessed = 0;
    
    // Process all matches
    while ((match = cardPattern.exec(originalText)) !== null) {
      const value = match[1];
      const suitSymbol = match[2];
      const suit = suitMap[suitSymbol] || '';
      
      if (suit) {
        cardsProcessed++;
        debugLog(`Creating card: ${value} of ${suit}`);
        
        // Create the image element
        const imgElement = document.createElement('img');
        imgElement.className = 'rule-card-img';
        imgElement.alt = `${value} of ${suit}`;
        imgElement.style.height = '70px';
        imgElement.style.border = '1px solid #ddd';
        imgElement.style.borderRadius = '4px';
        imgElement.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        
        // Add a loading indicator
        imgElement.style.backgroundColor = '#f8f8f8';
        imgElement.style.minWidth = '50px';
        
        // Placeholder text while loading
        const placeholder = document.createElement('div');
        placeholder.textContent = `${value}${suitSymbol}`;
        placeholder.style.position = 'absolute';
        placeholder.style.top = '50%';
        placeholder.style.left = '50%';
        placeholder.style.transform = 'translate(-50%, -50%)';
        placeholder.style.fontSize = '16px';
        placeholder.style.color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
        
        // Create a wrapper to hold both
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.appendChild(imgElement);
        wrapper.appendChild(placeholder);
        
        // Add to container
        container.appendChild(wrapper);
        
        // Load the actual card image
        try {
          const imgSrc = await loadCard(value, suit);
          debugLog(`Retrieved card source: ${imgSrc.substring(0, 50)}...`, 'success');
          
          // Remove placeholder when image loads
          imgElement.onload = () => {
            placeholder.remove();
            imgElement.style.backgroundColor = 'transparent';
            imgElement.style.minWidth = 'auto';
            debugLog(`Card image loaded successfully: ${value} of ${suit}`, 'success');
          };
          
          imgElement.onerror = () => {
            debugLog(`Failed to display card image: ${value} of ${suit}`, 'error');
            imgElement.style.display = 'none';
          };
          
          imgElement.src = imgSrc;
        } catch (err) {
          debugLog(`Error loading card ${value} of ${suit}: ${err.message}`, 'error');
        }
      }
    }
    
    debugLog(`Processed ${cardsProcessed} cards for this symbol`);
    
    // Add the container to the symbol
    symbol.appendChild(container);
    
    // Mark as processed
    symbol.setAttribute('data-processed', 'true');
  }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  debugLog('DOM content loaded, initializing debug card loader');
  
  // Add debug panel to DOM
  document.body.appendChild(createDebugPanel());
  
  // Run initial replacement
  setTimeout(() => {
    replaceCardSymbols();
  }, 500);
  
  // Listen for update events
  document.addEventListener('update-rule-cards', () => {
    debugLog('Received update-rule-cards event');
    replaceCardSymbols();
  });
  
  // Run when rule sections are toggled
  const ruleSections = document.querySelectorAll('.rules-summary');
  ruleSections.forEach(section => {
    section.addEventListener('click', () => {
      debugLog('Rule section clicked');
      setTimeout(() => replaceCardSymbols(), 100);
    });
  });
});

// Dispatch an update event when this script loads
setTimeout(() => {
  debugLog('Dispatching update-rule-cards event');
  document.dispatchEvent(new CustomEvent('update-rule-cards'));
}, 1000);
