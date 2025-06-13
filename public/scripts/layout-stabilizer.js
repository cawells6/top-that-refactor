/**
 * layout-stabilizer.js
 * 
 * This script helps prevent visual shifts during transitions between
 * the lobby view and game table view by forcing layout consistency.
 * Completely rebuilt for much more aggressive transition handling.
 */

(function() {
  // Enhanced stabilization approach
  
  // Track the dimensions of our container elements to force consistency
  let cachedDimensions = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  
  // State control to avoid overlapping transitions
  let isTransitioning = false;
  let currentView = null;
  
  // Store original transition methods (if they exist in the global scope)
  const originalShowGameTable = typeof window.showGameTable === 'function' ? window.showGameTable : null;
  const originalShowLobbyForm = typeof window.showLobbyForm === 'function' ? window.showLobbyForm : null;
  
  // Replace the showGameTable and showLobbyForm functions with our intercepted versions
  function monitorViewportSize() {
    // Update cached dimensions
    cachedDimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    console.log('[LAYOUT-STABILIZER] Viewport dimensions cached', cachedDimensions);
  }
  
  // Create style element for critical CSS rules
  function injectCriticalStyles() {
    const styleElement = document.createElement('style');
    styleElement.id = 'layout-stabilizer-styles';
    styleElement.textContent = `
      /* Critical layout rules with !important to override others */
      html, body {
        overflow-x: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        overflow-y: scroll !important; /* Always show vertical scrollbar */
        scrollbar-width: thin !important;
        scrollbar-gutter: stable !important;
      }
      
      /* Game viewport container - fully fixed size */
      .game-viewport {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden !important;
        transform-style: preserve-3d !important; 
        will-change: contents !important;
        backface-visibility: hidden !important;
      }
      
      /* Main content - container for both views */
      .main-content {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transform: translateZ(0) !important; /* Force GPU */
      }
      
      /* Radical approach - absolute position both views and use opacity only */
      #lobby-container, #game-table {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        transition: opacity 0.4s ease !important;
        will-change: opacity !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transform: translateZ(0) !important; /* Force GPU */
        backface-visibility: hidden !important;
      }
      
      /* Hide using opacity only, keep in DOM */
      #lobby-container.hidden, #game-table.hidden {
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }
      
      /* Showing active views */
      body.showing-lobby #lobby-container {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        z-index: 10 !important;
      }
      
      body.showing-game #game-table {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        z-index: 10 !important;
      }
    `;
    document.head.appendChild(styleElement);
    console.log('[LAYOUT-STABILIZER] Critical styles injected');
  }
  
  // Override view switching functions - use DOM based approach instead
  function overrideViewSwitchers() {
    // Instead of trying to override functions, we'll use mutation observers
    // to detect when classes are being changed on key elements
    
    // Monitor changes to body classes
    const bodyObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const body = document.body;
          // Check if showing-game was added
          if (body.classList.contains('showing-game') && currentView !== 'game') {
            console.log('[LAYOUT-STABILIZER] Detected game table view change');
            stabilizeGameTableTransition();
          }
          // Check if showing-lobby was added
          else if (body.classList.contains('showing-lobby') && currentView !== 'lobby') {
            console.log('[LAYOUT-STABILIZER] Detected lobby view change');
            stabilizeLobbyTransition();
          }
        }
      });
    });
    
    // Start observing body element
    bodyObserver.observe(document.body, { attributes: true });
    
    console.log('[LAYOUT-STABILIZER] Using mutation observer to track view changes');
  }
  
  // Stabilize the transition to game table view
  function stabilizeGameTableTransition() {
    if (isTransitioning) {
      console.log('[LAYOUT-STABILIZER] Transition already in progress, ignoring request');
      return;
    }
    
    isTransitioning = true;
    currentView = 'game';
    
    // Get critical elements
    const gameTable = document.getElementById('game-table');
    const lobbyContainer = document.getElementById('lobby-container');
    
    if (!gameTable || !lobbyContainer) {
      console.warn('[LAYOUT-STABILIZER] Critical elements missing');
      isTransitioning = false;
      return;
    }
    
    // Force both views to be ready
    gameTable.classList.remove('hidden');
    
    // Force layout calculation
    document.body.getBoundingClientRect();
    
    // Control the transition
    setTimeout(() => {
      document.body.classList.remove('showing-lobby');
      setTimeout(() => {
        lobbyContainer.classList.add('hidden');
        isTransitioning = false;
        console.log('[LAYOUT-STABILIZER] Game table transition complete');
      }, 400); // Match transition time
    }, 50);
    
    console.log('[LAYOUT-STABILIZER] Stabilizing game table transition');
  }
  
  // Stabilize the transition to lobby view
  function stabilizeLobbyTransition() {
    if (isTransitioning) {
      console.log('[LAYOUT-STABILIZER] Transition already in progress, ignoring request');
      return;
    }
    
    isTransitioning = true;
    currentView = 'lobby';
    
    // Get critical elements
    const gameTable = document.getElementById('game-table');
    const lobbyContainer = document.getElementById('lobby-container');
    
    if (!gameTable || !lobbyContainer) {
      console.warn('[LAYOUT-STABILIZER] Critical elements missing');
      isTransitioning = false;
      return;
    }
    
    // Force both views to be ready
    lobbyContainer.classList.remove('hidden');
    
    // Force layout calculation
    document.body.getBoundingClientRect();
    
    // Control the transition
    setTimeout(() => {
      document.body.classList.remove('showing-game');
      setTimeout(() => {
        gameTable.classList.add('hidden');
        isTransitioning = false;
        console.log('[LAYOUT-STABILIZER] Lobby transition complete');
      }, 400); // Match transition time
    }, 50);
    
    console.log('[LAYOUT-STABILIZER] Stabilizing lobby transition');
  }
  
  // Add direct event listeners to buttons that might trigger view changes
  function addDirectEventListeners() {
    // Listen for setup-deal-button which triggers game table view
    const dealButton = document.getElementById('setup-deal-button');
    if (dealButton) {
      dealButton.addEventListener('click', () => {
        console.log('[LAYOUT-STABILIZER] Deal button clicked, preparing transition');
        // This won't directly trigger the transition, just prepare the UI
        document.body.classList.add('showing-game');
      });
    }
    
    // Listen for back-to-lobby-button which triggers lobby view
    const backToLobbyButton = document.getElementById('back-to-lobby-button');
    if (backToLobbyButton) {
      backToLobbyButton.addEventListener('click', () => {
        console.log('[LAYOUT-STABILIZER] Back to lobby button clicked, preparing transition');
        // This won't directly trigger the transition, just prepare the UI
        document.body.classList.add('showing-lobby');
      });
    }
  }
  
  // Initialize the layout stabilizer
  function init() {
    monitorViewportSize();
    injectCriticalStyles();
    overrideViewSwitchers();
    
    // Add direct event listeners after a slight delay to ensure DOM is fully loaded
    setTimeout(addDirectEventListeners, 500);
    
    // Add resize listener to maintain consistent dimensions
    window.addEventListener('resize', () => {
      if (!isTransitioning) {
        monitorViewportSize();
      }
    });
    
    // Set initial view based on body classes
    if (document.body.classList.contains('showing-game')) {
      currentView = 'game';
    } else {
      currentView = 'lobby';
      document.body.classList.add('showing-lobby');
    }
    
    console.log('[LAYOUT-STABILIZER] Activated with aggressive layout control');
  }
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
