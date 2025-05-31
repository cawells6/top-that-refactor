// icon-viewer.js - Handles showing full-size icons when clicked

/**
 * Show full-size version of an icon in a modal popup
 * @param {HTMLElement} iconElement - The icon element that was clicked
 */
window.showFullSizeIcon = function(iconElement) {
  const fullsizeSrc = iconElement.getAttribute('data-fullsize');
  if (!fullsizeSrc) return;
  
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'icon-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '1000';
  modal.style.cursor = 'pointer';
  
  // Create image element
  const img = document.createElement('img');
  img.src = fullsizeSrc;
  img.alt = iconElement.alt + ' (full size)';
  img.style.maxWidth = '90%';
  img.style.maxHeight = '90%';
  img.style.objectFit = 'contain';
  img.style.borderRadius = '8px';
  img.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
  
  // Close modal when clicked
  modal.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Add to DOM
  modal.appendChild(img);
  document.body.appendChild(modal);
};

// Add this to global scope for onclick handlers
if (typeof window !== 'undefined') {
  console.log('📷 Icon viewer loaded and ready');
}
