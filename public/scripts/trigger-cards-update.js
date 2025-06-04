// trigger-cards-update.js - Simple script to trigger a card update
document.addEventListener('DOMContentLoaded', function () {
  // Wait for page to load
  setTimeout(function () {
    console.log('��� Triggering manual card update...');
    document.dispatchEvent(new CustomEvent('update-rule-cards'));

    // Also manually add any debug functions to window
    if (typeof window.inspectCardElements !== 'function') {
      window.inspectCardElements = function () {
        console.log('Card inspection triggered manually');

        // Find all card images
        const cardImages = document.querySelectorAll('.rule-card-img');
        console.log(`Found ${cardImages.length} card images`);

        // Check visibility
        cardImages.forEach((img, i) => {
          const style = window.getComputedStyle(img);
          console.log(`Card #${i + 1}:`, {
            src: img.src,
            alt: img.alt,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            width: img.offsetWidth + 'px',
            height: img.offsetHeight + 'px',
          });
        });
      };
    }

    // Add a test button
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Cards';
    testButton.style.position = 'fixed';
    testButton.style.bottom = '10px';
    testButton.style.right = '10px';
    testButton.style.zIndex = '9999';
    testButton.style.padding = '8px 12px';
    testButton.onclick = function () {
      console.log('Testing cards...');
      document.dispatchEvent(new CustomEvent('update-rule-cards'));
      if (typeof window.inspectCardElements === 'function') {
        window.inspectCardElements();
      }
    };
    document.body.appendChild(testButton);
  }, 2000);
});

// Diagnostic: Log all rule-card-img srcs and load status
window.logCardImageStatus = function () {
  const imgs = document.querySelectorAll('.rule-card-img');
  console.log(`Found ${imgs.length} .rule-card-img elements`);
  imgs.forEach((img, i) => {
    const isDataUrl = img.src.startsWith('data:image');
    console.log(
      `Card #${i + 1}: src=`,
      img.src,
      '\n  complete:',
      img.complete,
      '\n  naturalWidth:',
      img.naturalWidth,
      '\n  naturalHeight:',
      img.naturalHeight,
      '\n  width:',
      img.width,
      '\n  height:',
      img.height,
      '\n  isDataUrl:',
      isDataUrl,
      '\n  alt:',
      img.alt
    );
  });
};

// Automatically log card image status after DOM is ready
window.addEventListener('load', () => {
  setTimeout(() => {
    if (window.logCardImageStatus) window.logCardImageStatus();
  }, 2000);
});
