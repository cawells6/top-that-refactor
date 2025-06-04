// dom-inspector.js - Utility to inspect card image elements in the DOM

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔍 DOM Inspector loaded');

  // Create inspector button
  const inspectButton = document.createElement('button');
  inspectButton.textContent = '🔍 Inspect Card Elements';
  inspectButton.style.position = 'fixed';
  inspectButton.style.top = '10px';
  inspectButton.style.right = '10px';
  inspectButton.style.zIndex = '9999';
  inspectButton.style.padding = '5px 10px';
  inspectButton.style.backgroundColor = '#333';
  inspectButton.style.color = 'white';
  inspectButton.style.border = 'none';
  inspectButton.style.borderRadius = '5px';
  inspectButton.style.cursor = 'pointer';

  // Create results modal
  const resultsModal = document.createElement('div');
  resultsModal.style.display = 'none';
  resultsModal.style.position = 'fixed';
  resultsModal.style.top = '50%';
  resultsModal.style.left = '50%';
  resultsModal.style.transform = 'translate(-50%, -50%)';
  resultsModal.style.width = '80%';
  resultsModal.style.maxWidth = '800px';
  resultsModal.style.maxHeight = '80%';
  resultsModal.style.overflow = 'auto';
  resultsModal.style.backgroundColor = 'white';
  resultsModal.style.padding = '20px';
  resultsModal.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
  resultsModal.style.zIndex = '10000';
  resultsModal.style.borderRadius = '5px';

  // Close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.marginTop = '20px';
  closeButton.style.padding = '5px 15px';
  closeButton.addEventListener('click', () => {
    resultsModal.style.display = 'none';
  });

  // Results container
  const resultsContainer = document.createElement('div');
  resultsContainer.id = 'inspector-results';

  resultsModal.appendChild(resultsContainer);
  resultsModal.appendChild(closeButton);

  // Add elements to DOM
  document.body.appendChild(inspectButton);
  document.body.appendChild(resultsModal);

  // Run inspection when button is clicked
  inspectButton.addEventListener('click', () => {
    inspectCardElements();
    resultsModal.style.display = 'block';
  });

  // Function to inspect card elements
  function inspectCardElements() {
    const results = document.getElementById('inspector-results');
    results.innerHTML = '<h2>Card Element Inspection</h2>';

    // Find all card symbols
    const cardSymbols = document.querySelectorAll('.card-symbol');
    results.innerHTML += `<p>Found ${cardSymbols.length} card symbol elements</p>`;

    // Inspect each card symbol
    cardSymbols.forEach((symbol, index) => {
      const section = document.createElement('div');
      section.style.marginBottom = '20px';
      section.style.borderBottom = '1px solid #ccc';
      section.style.paddingBottom = '10px';

      section.innerHTML += `<h3>Card Symbol ${index + 1}</h3>`;
      section.innerHTML += `<p>Dimensions: ${symbol.offsetWidth}x${symbol.offsetHeight}px</p>`;
      section.innerHTML += `<p>CSS Classes: ${symbol.className}</p>`;
      section.innerHTML += `<p>Data attributes: ${
        Array.from(symbol.attributes)
          .filter((attr) => attr.name.startsWith('data-'))
          .map((attr) => `${attr.name}="${attr.value}"`)
          .join(', ') || 'none'
      }</p>`;

      // Check for visibility issues
      const style = window.getComputedStyle(symbol);
      section.innerHTML += `<p>Computed style:</p>
        <ul>
          <li>Display: ${style.display}</li>
          <li>Visibility: ${style.visibility}</li>
          <li>Opacity: ${style.opacity}</li>
          <li>Position: ${style.position}</li>
          <li>Z-index: ${style.zIndex}</li>
          <li>Overflow: ${style.overflow}</li>
        </ul>`;

      // Check card images within this symbol
      const cardImages = symbol.querySelectorAll('img');
      section.innerHTML += `<p>Contains ${cardImages.length} card images:</p>`;

      if (cardImages.length) {
        const imageList = document.createElement('ul');

        cardImages.forEach((img, imgIndex) => {
          const imgItem = document.createElement('li');

          imgItem.innerHTML = `
            <p>Image ${imgIndex + 1}:</p>
            <ul>
              <li>Src: ${img.src}</li>
              <li>Alt: ${img.alt}</li>
              <li>Dimensions: ${img.width}x${img.height}px</li>
              <li>Complete: ${img.complete}</li>
              <li>naturalWidth: ${img.naturalWidth}</li>
              <li>CSS Classes: ${img.className}</li>
              <li>Style.visibility: ${img.style.visibility}</li>
              <li>Style.display: ${window.getComputedStyle(img).display}</li>
            </ul>
          `;

          imageList.appendChild(imgItem);
        });

        section.appendChild(imageList);
      }

      results.appendChild(section);
    });

    // Add helpful information
    results.innerHTML += `
      <div style="margin-top: 20px; padding: 10px; background-color: #f8f8f8; border-left: 4px solid #2196F3;">
        <h3>Troubleshooting Tips:</h3>
        <ul>
          <li>If card images have naturalWidth=0, they failed to load</li>
          <li>Check for visibility:hidden or display:none styles</li>
          <li>Verify that the image src URLs are correct</li>
          <li>Look for overflow:hidden that might be hiding content</li>
          <li>Ensure z-index isn't causing elements to be hidden</li>
        </ul>
      </div>
    `;
  }
});
