// card-loader-diagnostic.js - A standalone diagnostic tool for card loading issues
// Add this script to index.html for troubleshooting, then remove when fixed

(function() {
  console.log('[DIAGNOSTIC] Card loader diagnostic script started');

  // Track all script loads
  const loadedScripts = {};
  document.querySelectorAll('script').forEach(script => {
    loadedScripts[script.src || 'inline-script'] = { 
      type: script.type, 
      loaded: script.src ? false : true
    };
    
    if (script.src) {
      script.addEventListener('load', () => {
        loadedScripts[script.src].loaded = true;
        console.log(`[DIAGNOSTIC] Script loaded: ${script.src}`);
      });
      
      script.addEventListener('error', () => {
        console.error(`[DIAGNOSTIC] Script failed to load: ${script.src}`);
      });
    }
  });

  // Inspect the DOM for card-related elements
  function inspectDOM() {
    const results = {
      'card-symbol elements': document.querySelectorAll('.card-symbol').length,
      'rule-card-img elements': document.querySelectorAll('.rule-card-img').length,
      'fixed-loader card images': document.querySelectorAll('[data-fixed-loader="true"]').length,
      'rules modal': document.getElementById('rules-modal') ? 'found' : 'missing',
      'rules modal visible': document.getElementById('rules-modal') && 
                             !document.getElementById('rules-modal').classList.contains('modal--hidden')
    };
    
    console.table(results);
    
    // Check for hidden/collapsed card symbols
    const cardSymbols = document.querySelectorAll('.card-symbol');
    if (cardSymbols.length > 0) {
      console.log(`[DIAGNOSTIC] Found ${cardSymbols.length} card symbols:`);
      cardSymbols.forEach((symbol, i) => {
        const rect = symbol.getBoundingClientRect();
        console.log(`Symbol #${i}:`, {
          text: symbol.textContent.trim().substring(0, 20),
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && rect.height > 0,
          inViewport: rect.top >= 0 && rect.left >= 0 && 
                      rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
          style: window.getComputedStyle(symbol).display
        });
      });
    }
  }
  
  // Check for window.updateRuleCardsWithImages function
  function checkCardLoaderFunction() {
    if (typeof window.updateRuleCardsWithImages === 'function') {
      console.log('[DIAGNOSTIC] ✅ updateRuleCardsWithImages function found');
      
      // Try to trigger the function directly
      try {
        window.updateRuleCardsWithImages()
          .then(result => {
            console.log(`[DIAGNOSTIC] Manual card update result: ${result}`);
          })
          .catch(err => {
            console.error('[DIAGNOSTIC] Error in manual card update:', err);
          });
      } catch (err) {
        console.error('[DIAGNOSTIC] Failed to call updateRuleCardsWithImages:', err);
      }
    } else {
      console.error('[DIAGNOSTIC] ❌ updateRuleCardsWithImages function not found');
    }
  }
  
  // Check CSS rules that might be affecting card display
  function checkCSSRules() {
    const relevantSelectors = ['.card-symbol', '.rule-card-img', '.card-image-container'];
    const cssRules = [];
    
    // Collect all CSS rules across all stylesheets
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules || []) {
          if (rule.selectorText && 
              relevantSelectors.some(selector => rule.selectorText.includes(selector))) {
            cssRules.push({
              selector: rule.selectorText,
              styles: rule.style.cssText,
              source: sheet.href || 'inline'
            });
          }
        }
      } catch (e) {
        // CORS error when accessing cross-origin stylesheets
        console.log(`[DIAGNOSTIC] Cannot access rules in stylesheet: ${sheet.href}`);
      }
    }
    
    if (cssRules.length > 0) {
      console.log('[DIAGNOSTIC] Found CSS rules that might affect cards:');
      console.table(cssRules);
    }
  }
  
  // Run diagnostics after everything has loaded
  window.addEventListener('load', () => {
    console.log('[DIAGNOSTIC] Window loaded, running diagnostics...');
    
    // Wait a bit to ensure all resources and scripts are fully loaded
    setTimeout(() => {
      console.table(loadedScripts);
      inspectDOM();
      checkCardLoaderFunction();
      checkCSSRules();
      
      // Add a button to run manual diagnostics
      const diagButton = document.createElement('button');
      diagButton.innerText = '🔍 Run Card Diagnostics';
      diagButton.style.position = 'fixed';
      diagButton.style.bottom = '10px';
      diagButton.style.right = '10px';
      diagButton.style.zIndex = '9999';
      diagButton.style.padding = '8px 12px';
      diagButton.style.backgroundColor = '#f0ad4e';
      diagButton.style.border = 'none';
      diagButton.style.borderRadius = '4px';
      diagButton.style.cursor = 'pointer';
      
      diagButton.addEventListener('click', () => {
        console.clear();
        console.log('[DIAGNOSTIC] Running manual diagnostics...');
        inspectDOM();
        checkCardLoaderFunction();
        
        // Special action: force re-render without cache
        if (window.fixedCardLoaderDiagnostics) {
          console.log('[DIAGNOSTIC] Running fixed-card-loader diagnostics...');
          window.fixedCardLoaderDiagnostics.clearCache();
          window.fixedCardLoaderDiagnostics.forceUpdate();
          window.fixedCardLoaderDiagnostics.showStats();
        }
      });
      
      document.body.appendChild(diagButton);
      
      // Monitor and trigger when rules modal opens
      const rulesModal = document.getElementById('rules-modal');
      if (rulesModal) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.attributeName === 'class' && 
                !rulesModal.classList.contains('modal--hidden')) {
              console.log('[DIAGNOSTIC] Rules modal opened, rechecking...');
              setTimeout(inspectDOM, 300);
            }
          });
        });
        
        observer.observe(rulesModal, { attributes: true });
      }
      
    }, 2000);
  });
})();
