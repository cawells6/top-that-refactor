/**
 * simple-layout-stabilizer.js
 * 
 * A simplified and more robust approach to prevent visual shifts during transitions
 * between the lobby view and game table view.
 */

(function() {
  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[SIMPLE-LAYOUT-STABILIZER] Initializing...');
    
    // Get critical elements
    const gameTable = document.getElementById('game-table');
    const lobbyContainer = document.getElementById('lobby-container');
    
    if (!gameTable || !lobbyContainer) {
      console.warn('[SIMPLE-LAYOUT-STABILIZER] Critical elements missing!');
      return;
    }
    
    // Add critical CSS styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      /* Force consistent sizing and positioning */
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
        overflow-y: scroll !important;
        width: 100% !important;
        height: 100% !important;
      }
      
      /* Game viewport container */
      .game-viewport {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden !important;
      }
      
      /* Main content container */
      .main-content {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: hidden !important;
      }
      
      /* Both view containers */
      #lobby-container, #game-table {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        transition: opacity 0.3s ease !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      /* View display control via body classes */
      body.showing-lobby #lobby-container {
        opacity: 1 !important;
        visibility: visible !important;
        z-index: 10 !important;
        pointer-events: auto !important;
      }
      
      body.showing-game #game-table {
        opacity: 1 !important;
        visibility: visible !important;
        z-index: 10 !important;
        pointer-events: auto !important;
      }
      
      /* Hidden elements */
      #lobby-container.hidden, #game-table.hidden {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(styleEl);
    
    // Keep track of transition state
    let isTransitioning = false;
    
    // Find all elements that trigger transitions
    const setupDealButton = document.getElementById('setup-deal-button');
    const backToLobbyButton = document.getElementById('back-to-lobby-button');
    
    // Handle transition to game table
    function showGameTable() {
      if (isTransitioning) return;
      isTransitioning = true;
      
      console.log('[SIMPLE-LAYOUT-STABILIZER] Transitioning to game table');
      
      // Make game table visible but transparent
      gameTable.classList.remove('hidden');
      
      // Force layout calculation
      gameTable.getBoundingClientRect();
      
      // Add showing-game class to trigger transition
      document.body.classList.add('showing-game');
      
      // After a small delay, remove showing-lobby
      setTimeout(() => {
        document.body.classList.remove('showing-lobby');
        
        // After transition completes, update final state
        setTimeout(() => {
          lobbyContainer.classList.add('hidden');
          isTransitioning = false;
        }, 300);
      }, 50);
    }
    
    // Handle transition to lobby
    function showLobby() {
      if (isTransitioning) return;
      isTransitioning = true;
      
      console.log('[SIMPLE-LAYOUT-STABILIZER] Transitioning to lobby');
      
      // Make lobby visible but transparent
      lobbyContainer.classList.remove('hidden');
      
      // Force layout calculation
      lobbyContainer.getBoundingClientRect();
      
      // Add showing-lobby class to trigger transition
      document.body.classList.add('showing-lobby');
      
      // After a small delay, remove showing-game
      setTimeout(() => {
        document.body.classList.remove('showing-game');
        
        // After transition completes, update final state
        setTimeout(() => {
          gameTable.classList.add('hidden');
          isTransitioning = false;
        }, 300);
      }, 50);
    }
    
    // Intercept button clicks
    if (setupDealButton) {
      const originalClick = setupDealButton.onclick;
      setupDealButton.onclick = function(e) {
        // Don't prevent the original click - let it handle game logic
        // But set up our transition before any other state changes
        showGameTable();
      };
    }
    
    if (backToLobbyButton) {
      const originalClick = backToLobbyButton.onclick;
      backToLobbyButton.onclick = function(e) {
        // Don't prevent the original click
        showLobby();
      };
    }
    
    // Handle programmatic view changes through body class mutation
    const bodyObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          const classList = document.body.classList;
          
          // Check what change was made
          if (classList.contains('showing-game') && !classList.contains('showing-lobby')) {
            // Game view was shown
            gameTable.classList.remove('hidden');
            setTimeout(() => {
              lobbyContainer.classList.add('hidden');
            }, 300);
          } 
          else if (classList.contains('showing-lobby') && !classList.contains('showing-game')) {
            // Lobby was shown
            lobbyContainer.classList.remove('hidden');
            setTimeout(() => {
              gameTable.classList.add('hidden');
            }, 300);
          }
        }
      });
    });
    
    // Start observing
    bodyObserver.observe(document.body, { attributes: true });
    
    // Set initial state
    if (document.body.classList.contains('showing-game')) {
      gameTable.classList.remove('hidden');
      lobbyContainer.classList.add('hidden');
    } else {
      // Default to lobby
      document.body.classList.add('showing-lobby');
      lobbyContainer.classList.remove('hidden');
      gameTable.classList.add('hidden');
    }
    
    console.log('[SIMPLE-LAYOUT-STABILIZER] Initialized successfully');
  });
})();
