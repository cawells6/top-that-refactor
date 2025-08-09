// force-card-update.js - Script to forcibly update all card images

console.log('[FORCE-UPDATE] Script loaded');

// Function to force update all card images
function forceCardUpdate() {
  console.log('[FORCE-UPDATE] Forcing card update...');

  // Use our improved diagnostics tool if available
  if (window.fixedCardLoaderDiagnostics) {
    if (typeof window.fixedCardLoaderDiagnostics.resetCards === 'function') {
      console.log('[FORCE-UPDATE] Using enhanced resetCards function');
      window.fixedCardLoaderDiagnostics.resetCards();
      return;
    } else if (
      typeof window.fixedCardLoaderDiagnostics.clearCache === 'function'
    ) {
      window.fixedCardLoaderDiagnostics.clearCache();
    }
  }

  // Find all card symbols
  const cardSymbols = document.querySelectorAll('.card-symbol');
  console.log(`[FORCE-UPDATE] Found ${cardSymbols.length} card symbols`);

  // Check data-card-value attributes
  let hasDataAttributes = false;
  cardSymbols.forEach((symbol) => {
    const value = symbol.getAttribute('data-card-value');
    if (value) {
      hasDataAttributes = true;
      console.log(`[FORCE-UPDATE] Symbol has data-card-value: ${value}`);
    }
  });

  if (!hasDataAttributes) {
    console.warn(
      '[FORCE-UPDATE] ⚠️ No data-card-value attributes found - cards might not render correctly'
    );
  }

  // Remove any existing card images
  const existingCards = document.querySelectorAll('.rule-card-img');
  console.log(
    `[FORCE-UPDATE] Removing ${existingCards.length} existing card images`
  );
  existingCards.forEach((card) => card.remove());

  // Call the card update function if available
  if (typeof window.updateRuleCardsWithImages === 'function') {
    console.log('[FORCE-UPDATE] Calling updateRuleCardsWithImages()');
    try {
      window
        .updateRuleCardsWithImages()
        .then((result) => {
          console.log(
            `[FORCE-UPDATE] Card update ${result ? 'succeeded' : 'failed'}`
          );

          // Check if the update succeeded but didn't produce any visible cards
          setTimeout(() => {
            const renderedCards = document.querySelectorAll(
              '.rule-card-img[data-fixed-loader="true"]'
            );
            if (renderedCards.length === 0) {
              console.warn(
                '[FORCE-UPDATE] ⚠️ No cards were rendered - trying again with delay'
              );
              setTimeout(() => window.updateRuleCardsWithImages(), 500);
            }
          }, 200);
        })
        .catch((err) => {
          console.error('[FORCE-UPDATE] Error during card update:', err);
        });
    } catch (err) {
      console.error(
        '[FORCE-UPDATE] Error calling updateRuleCardsWithImages:',
        err
      );
    }
  } else {
    console.error(
      '[FORCE-UPDATE] updateRuleCardsWithImages function not found'
    );
  }
}

// Create a button to force card updates
document.addEventListener('DOMContentLoaded', () => {
  console.log('[FORCE-UPDATE] DOM loaded, setting up force update button');

  // Create a button to force card updates
  const updateButton = document.createElement('button');
  updateButton.id = 'force-card-update-btn';
  updateButton.textContent = '🔄 Update Cards';
  updateButton.style.position = 'fixed';
  updateButton.style.bottom = '60px';
  updateButton.style.right = '10px';
  updateButton.style.zIndex = '9999';
  updateButton.style.padding = '8px 12px';
  updateButton.style.backgroundColor = '#5bc0de';
  updateButton.style.color = 'white';
  updateButton.style.border = 'none';
  updateButton.style.borderRadius = '4px';
  updateButton.style.cursor = 'pointer';
  updateButton.title = 'Force cards to update';

  // Add click event
  updateButton.addEventListener('click', forceCardUpdate);

  // Add to DOM
  document.body.appendChild(updateButton);

  // Also try to update cards when rules modal is shown
  const rulesModal = document.getElementById('rules-modal');
  if (rulesModal) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          const target = mutation.target;
          if (
            target instanceof HTMLElement &&
            !target.classList.contains('modal--hidden')
          ) {
            console.log(
              '[FORCE-UPDATE] Rules modal shown, forcing card update'
            );
            setTimeout(forceCardUpdate, 500);
          }
        }
      }
    });

    observer.observe(rulesModal, { attributes: true });
  }
});

// Expose function globally
window.forceCardUpdate = forceCardUpdate;
