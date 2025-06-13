/**
 * initial-layout-stabilizer.js
 * 
 * This script focuses on preventing the initial layout shift during page load,
 * before any interactions or transitions occur.
 */

(function() {
  console.log('[INITIAL-STABILIZER] Starting up...');
  
  // Apply immediate-effect styles to prevent FOUC (Flash of Unstyled Content)
  function injectInitialStyles() {
    const styleEl = document.createElement('style');
    styleEl.id = 'initial-stabilizer-styles';
    styleEl.textContent = `
      /* Critical: Hide entire content until fully loaded */
      /* This prevents any content from showing until we're ready */
      html.loading::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--bg, #137a4b);
        z-index: 9999;
        opacity: 1;
        transition: opacity 0.3s ease;
      }
      
      html:not(.loading)::before {
        opacity: 0;
        pointer-events: none;
      }
      
      /* Force consistent dimensions from the start */
      html, body {
        height: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
        overflow-y: scroll !important;
      }
      
      body {
        background: var(--bg, #137a4b) !important;
        display: flex !important;
        flex-direction: column !important;
      }
      
      /* Keep everything centered and full-size from the start */
      #main-content {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        height: 100vh !important;
        width: 100vw !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      /* Both views - absolute position from the start */
      #lobby-container, #game-table {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 0 !important;
        transition: none !important;
      }
      
      /* Pre-configure the table for proper layout */
      .table {
        margin: 0 auto !important;
      }
      
      /* Hidden elements */
      .hidden {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
    `;
    
    // Add to document head as early as possible
    document.head.insertBefore(styleEl, document.head.firstChild);
    
    // Mark document as loading
    document.documentElement.classList.add('loading');
    console.log('[INITIAL-STABILIZER] Critical styles applied');
  }
  
  // Apply styles immediately, even before DOMContentLoaded
  injectInitialStyles();
  
  // Complete initialization after DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[INITIAL-STABILIZER] DOM loaded, completing initialization');
    
    // Enforce the correct view
    const gameTable = document.getElementById('game-table');
    const lobbyContainer = document.getElementById('lobby-container');
    
    // Ensure both views exist and have proper initial state
    if (lobbyContainer) {
      lobbyContainer.classList.add('hidden');
      lobbyContainer.style.opacity = '0';
      lobbyContainer.style.visibility = 'hidden';
    }
    
    if (gameTable) {
      gameTable.classList.add('hidden');
      gameTable.style.opacity = '0';
      gameTable.style.visibility = 'hidden';
    }
    
    // Wait for all critical resources to load
    window.addEventListener('load', function() {
      console.log('[INITIAL-STABILIZER] Window loaded, revealing content');
      
      // Remove the loading state only when everything is ready
      setTimeout(() => {
        document.documentElement.classList.remove('loading');
        
        // After layout is stable, enable transitions
        setTimeout(() => {
          // Add transitions back for smooth view changes
          const transitionStyle = document.createElement('style');
          transitionStyle.textContent = `
            #lobby-container, #game-table {
              transition: opacity 0.3s ease, visibility 0.3s ease !important;
            }
            
            body.showing-lobby #lobby-container {
              opacity: 1 !important;
              visibility: visible !important;
              pointer-events: auto !important;
            }
            
            body.showing-game #game-table {
              opacity: 1 !important;
              visibility: visible !important;
              pointer-events: auto !important;
            }
          `;
          document.head.appendChild(transitionStyle);
          
          console.log('[INITIAL-STABILIZER] Transitions enabled');
        }, 100);
      }, 50);
    });
  });
})();
