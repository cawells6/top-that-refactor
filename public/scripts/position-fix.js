/**
 * position-fix.js
 * This script immediately fixes the positioning of the lobby modal
 * to prevent it from appearing in the corner before moving to the center.
 */

(function() {
  // Create and apply inline styles immediately
  const styleEl = document.createElement('style');
  styleEl.id = 'position-fix-styles';
  styleEl.innerHTML = `
    /* Hide everything initially */
    html.preload .lobby {
      visibility: hidden !important;
    }
    
    /* Force proper centering from the start */
    #lobby-container {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      width: 100% !important;
      height: 100% !important;
    }
    
    /* Ensure lobby modal is centered in its container */
    .lobby-modal-container {
      margin: auto !important;
      position: relative !important;
      top: auto !important;
      left: auto !important;
      transform: none !important;
    }
  `;
  
  // Insert at the very beginning of the head
  if (document.head) {
    document.head.insertBefore(styleEl, document.head.firstChild);
  }
  
  // When DOM is ready, apply position directly to elements
  document.addEventListener('DOMContentLoaded', function() {
    const lobbyContainer = document.getElementById('lobby-container');
    const lobbyOuterCard = document.getElementById('lobby-outer-card');
    
    if (lobbyContainer) {
      Object.assign(lobbyContainer.style, {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'none',
        padding: '0',
        margin: '0',
        zIndex: 1000
      });
    }

    if (lobbyOuterCard) {
      Object.assign(lobbyOuterCard.style, {
        position: 'relative',
        margin: 'auto',
        top: '0',
        left: '0',
        right: '0',
        transform: 'none',
        maxWidth: '800px',
        width: '100%',
        boxSizing: 'border-box'
      });
    }
    
    console.log('[POSITION-FIX] Applied direct element positioning');
  });
})();
