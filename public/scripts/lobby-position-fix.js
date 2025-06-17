/**
 * lobby-position-fix.js
 * 
 * This script fixes the initial positioning of the lobby modal
 * to ensure it's centered from the very first render with NO SHIFTING.
 */

(function() {
  console.log('[LOBBY-POSITION-FIX] Starting up with enhanced positioning...');
  
  // Inject critical CSS to fix initial position - more aggressive version
  const style = document.createElement('style');
  style.id = 'lobby-position-fix';
  style.textContent = `
    /* Critical lobby container positioning */
    .lobby-modal-container {
      width: 100% !important;
      max-width: 640px !important;
      margin: 0 auto !important;
      position: relative !important;
      left: 0 !important;
      top: 0 !important;
      right: 0 !important;
      transform: none !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      box-sizing: border-box !important;
      transition: none !important;
    }
    
    /* Make sure the container is properly centered on first render */
    #lobby-container {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100vw !important;
      height: 100vh !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    
    /* Apply to lobby inner elements too */
    #lobby-inner-content {
      width: 100% !important;
      position: relative !important;
      margin: 0 auto !important;
    }
    
    /* Ensure proper centering from first render */
    .game-viewport, #main-content {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
    }
  `;
  
  // Add to document head immediately as the first child
  document.head.insertBefore(style, document.head.firstChild);
  
  // Apply styles directly to elements as soon as possible
  function applyDirectStyles() {
    const lobbyContainer = document.getElementById('lobby-container');
    const modalContainer = document.getElementById('lobby-outer-card');
    const innerContent = document.getElementById('lobby-inner-content');
    const mainContent = document.getElementById('main-content');
    const gameViewport = document.querySelector('.game-viewport');
    
    if (lobbyContainer) {
      console.log('[LOBBY-POSITION-FIX] Applying position fix to lobby container');
      Object.assign(lobbyContainer.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        padding: '0',
        margin: '0'
      });
    }
    
    if (modalContainer) {
      console.log('[LOBBY-POSITION-FIX] Applying position fix to modal container');
      Object.assign(modalContainer.style, {
        width: '100%',
        maxWidth: '800px', // Increased from 640px for more space
        margin: '0 auto',
        position: 'relative',
        left: '0',
        top: '0',
        transform: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      });
    }
    
    if (innerContent) {
      Object.assign(innerContent.style, {
        width: '100%',
        maxWidth: '760px', // Allow inner content to expand more
        position: 'relative',
        margin: '0 auto',
        boxSizing: 'border-box',
      });
    }
    
    if (mainContent) {
      Object.assign(mainContent.style, {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      });
    }
    
    if (gameViewport) {
      Object.assign(gameViewport.style, {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      });
    }
  }
  
  // Try to apply styles immediately
  if (document.readyState === 'loading') {
    // If still loading, set up event listeners
    document.addEventListener('DOMContentLoaded', applyDirectStyles);
    
    // Also try periodically until elements are found
    let attempts = 0;
    const checkAndApply = setInterval(function() {
      if (document.getElementById('lobby-container') || attempts > 20) {
        clearInterval(checkAndApply);
        applyDirectStyles();
      }
      attempts++;
    }, 10);
  } else {
    // DOM already loaded, apply right away
    applyDirectStyles();
  }
  
  console.log('[LOBBY-POSITION-FIX] Enhanced initialization complete');
})();
