/**
 * style-enforcer.js - Ensures our CSS rules are prioritized
 * This script helps enforce our CSS overrides by adding !important to inline styles
 * and removing any hover effects from card elements.
 */

(function () {
  // Function to clean up styles on a single element
  function cleanupElementStyles(element) {
    if (!element) return;

    // Target only card-related elements
    if (
      element.classList.contains('rule-card-img') ||
      element.classList.contains('card-symbol') ||
      element.hasAttribute('data-fixed-loader')
    ) {
      // Remove hover-related inline styles
      element.style.transform = 'none !important';
      element.style.transition = 'none !important';

      // Ensure visibility
      element.style.display = 'inline-block !important';
      element.style.visibility = 'visible !important';
      element.style.opacity = '1 !important';

      // Mark as processed
      element.dataset.styleEnforced = 'true';
    }

    // Remove dotted borders from containers
    if (
      element.classList.contains('card-image-container') ||
      element.classList.contains('card-symbol')
    ) {
      element.style.border = 'none !important';
      element.style.outline = 'none !important';
      element.style.boxShadow = 'none !important';
    }
  }

  // Process all existing elements
  function cleanupAllElements() {
    // Process card images
    document
      .querySelectorAll('.rule-card-img, .card-symbol, [data-fixed-loader]')
      .forEach(cleanupElementStyles);

    // Process containers
    document
      .querySelectorAll('.card-image-container, .card-symbol')
      .forEach(cleanupElementStyles);
  }

  // Set up observer to catch new elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // For new nodes
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          // Only process Element nodes (type 1)
          if (node.nodeType === 1) {
            cleanupElementStyles(node);

            // Also process any matching children
            node
              .querySelectorAll(
                '.rule-card-img, .card-symbol, [data-fixed-loader], .card-image-container'
              )
              .forEach(cleanupElementStyles);
          }
        });
      }
    });
  });

  // Run initial cleanup
  document.addEventListener('DOMContentLoaded', cleanupAllElements);

  // Also clean on modal open
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'setup-rules-button') {
      setTimeout(cleanupAllElements, 500); // Give time for modal to open
    }
  });

  // Start observing the document after DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } else {
      console.warn(
        '[STYLE-ENFORCER] document.body not found, MutationObserver not started'
      );
    }
  });

  // Run cleanup periodically for added safety
  setInterval(cleanupAllElements, 2000);

  console.log('[STYLE-ENFORCER] 🎨 Style enforcer is active');
})();
