// card-debug.js - Helper module for debugging card image loading issues

// Function to patch the rules-cards.js file at runtime
export function patchCardImageLoading() {
  console.log("📊 Applying card image loading patches for debugging");
  
  // Wait for DOMContentLoaded to ensure the rules-cards module has been loaded
  document.addEventListener('DOMContentLoaded', () => {
    try {
      // Import the modules we need to patch
      import('./rules-cards.js').then(rulesCardsModule => {
        const originalCreateRuleCardImage = rulesCardsModule.createRuleCardImage;
        
        // Override createRuleCardImage with our instrumented version
        rulesCardsModule.createRuleCardImage = function(value, suit, options = {}) {
          console.log(`🃏 Creating rule card image: ${value} of ${suit}`);
          
          // Call the original function to create the image element
          const img = originalCreateRuleCardImage(value, suit, options);
          
          // Add error handling and direct URL fallback
          img.onerror = function() {
            console.error(`❌ Failed to load card image via proxy: ${img.src}`);
            
            // Try with direct URL as fallback
            const cardCode = (value === '10' ? '0' : String(value).toUpperCase()) + 
                            (suit === 'hearts' ? 'H' : 
                             suit === 'diamonds' ? 'D' : 
                             suit === 'clubs' ? 'C' : 'S');
                             
            const directUrl = `https://deckofcardsapi.com/static/img/${cardCode}.png`;
            console.log(`⚡ Trying direct URL: ${directUrl}`);
            img.src = directUrl;
          };
          
          img.onload = function() {
            console.log(`✅ Successfully loaded card image: ${img.src}`);
          };
          
          return img;
        };
        
        console.log("✅ Successfully patched rules-cards.js module");
        
        // Force an update if the rules are already visible
        setTimeout(() => {
          const event = new CustomEvent('update-rule-cards');
          document.dispatchEvent(event);
        }, 500);
      }).catch(err => {
        console.error("❌ Failed to import rules-cards.js module:", err);
      });
      
      // Also patch render.ts module's cardImg function
      import('./render.js').then(renderModule => {
        const originalCardImg = renderModule.cardImg;
        
        renderModule.cardImg = function(card, selectable, onLoad) {
          console.log(`🃏 Creating card image via render.ts: ${card.back ? 'back' : `${card.value} of ${card.suit}`}`);
          
          // Call original function
          const container = originalCardImg(card, selectable, onLoad);
          
          // Find the img element
          const img = container.querySelector('img');
          if (img) {
            // Add a fallback for direct URL
            const origOnError = img.onerror;
            img.onerror = function() {
              console.error(`❌ Failed to load card image via proxy: ${img.src}`);
              
              // Try with direct URL as fallback
              let cardCode = 'back';
              if (!card.back) {
                const v = String(card.value).toUpperCase() === '10' ? '0' : String(card.value).toUpperCase();
                const suitMap = {
                  hearts: 'H',
                  diamonds: 'D',
                  clubs: 'C',
                  spades: 'S',
                };
                const s = suitMap[card.suit.toLowerCase()];
                cardCode = v + s;
              }
              
              const directUrl = `https://deckofcardsapi.com/static/img/${cardCode}.png`;
              console.log(`⚡ Trying direct URL: ${directUrl}`);
              img.src = directUrl;
              
              // And if that also fails, call the original handler
              img.onerror = origOnError;
            };
          }
          
          return container;
        };
        
        console.log("✅ Successfully patched render.ts module");
      }).catch(err => {
        console.error("❌ Failed to import render.js module:", err);
      });
      
    } catch (error) {
      console.error("❌ Error in card-debug.js patch:", error);
    }
  });
}

// Auto-execute the patch
patchCardImageLoading();

console.log("📊 Card debugging module loaded and patching scheduled");
