// init-card-loader.js - Script that initializes enhanced card loading functionality

// This script runs after the DOM is loaded to apply our enhanced card loading functionality
document.addEventListener('DOMContentLoaded', () => {
  console.log('🃏 Initializing enhanced card loader');
  
  // Function to preload common card images for better performance
  function preloadCommonCards() {
    console.log('Preloading common card images...');
    
    // Most important cards in the game: 2, 5, 10, A of all suits
    const priorityCards = [
      {value: '2', suit: 'hearts'}, 
      {value: '2', suit: 'diamonds'}, 
      {value: '2', suit: 'clubs'}, 
      {value: '2', suit: 'spades'},
      {value: '5', suit: 'hearts'}, 
      {value: '5', suit: 'diamonds'}, 
      {value: '5', suit: 'clubs'}, 
      {value: '5', suit: 'spades'},
      {value: '10', suit: 'hearts'}, 
      {value: '10', suit: 'diamonds'}, 
      {value: '10', suit: 'clubs'}, 
      {value: '10', suit: 'spades'},
      {value: 'A', suit: 'hearts'}, 
      {value: 'A', suit: 'diamonds'}, 
      {value: 'A', suit: 'clubs'}, 
      {value: 'A', suit: 'spades'},
    ];
    
    // Convert card value+suit to API code format
    function cardToCode(value, suit) {
      const v = String(value).toUpperCase() === '10' ? '0' : String(value).toUpperCase();
      const suitMap = {
        hearts: 'H',
        diamonds: 'D',
        clubs: 'C',
        spades: 'S',
      };
      const s = suitMap[suit.toLowerCase()];
      return v + s;
    }
    
    // Preload card images
    priorityCards.forEach(card => {
      const cardCode = cardToCode(card.value, card.suit);
      const img = new Image();
      
      // Try both direct URL and proxy
      img.src = `https://deckofcardsapi.com/static/img/${cardCode}.png`;
      console.log(`Preloading ${card.value} of ${card.suit} (${cardCode})`);
      
      // Also preload proxy version
      setTimeout(() => {
        const proxyImg = new Image();
        proxyImg.src = `/cards-api/static/img/${cardCode}.png`;
      }, 200);
    });
    
    // Also preload card back
    const backImg = new Image();
    backImg.src = 'https://deckofcardsapi.com/static/img/back.png';
  }
  
  // Function to enhance the rules section
  function enhanceRulesCards() {
    const cardSymbols = document.querySelectorAll('.card-symbol');
    if (cardSymbols.length === 0) return;
    
    console.log(`Found ${cardSymbols.length} card symbols to enhance`);
    
    // Add a style for improved card grid layout
    const style = document.createElement('style');
    style.textContent = `
      .card-image-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 5px;
        margin: 0 auto;
      }
      
      .rule-card-img {
        height: 70px;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s ease;
      }
      
      .rule-card-img:hover {
        transform: translateY(-5px);
        z-index: 10;
      }
      
      .card-symbol {
        border-radius: 6px;
        padding: 10px;
        background-color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(style);
  }
  
  // Run our initialization
  setTimeout(preloadCommonCards, 1000); // Delay to avoid blocking initial page load
  setTimeout(enhanceRulesCards, 500);
  
  // Set up event listeners to enhance rules cards when shown
  document.addEventListener('update-rule-cards', enhanceRulesCards);
  
  const rulesModal = document.getElementById('rules-modal');
  if (rulesModal) {
    // Update when rules details are expanded
    const rulesElements = document.querySelectorAll('.rules-summary');
    rulesElements.forEach((element) => {
      element.addEventListener('click', () => {
        setTimeout(enhanceRulesCards, 100);
      });
    });
  }
  
  console.log('🃏 Enhanced card loader initialized');
});
