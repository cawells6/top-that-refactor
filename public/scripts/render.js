// public/scripts/render.js
import { stateHistory, stateIndex, pileTransition } from './state.js';

// Convert {value:'A',suit:'hearts'} → "AH", 10→"0"
function code(card) {
  if (card.back) return '';
  const v = String(card.value).toUpperCase() === '10' ? '0'
          : String(card.value).toUpperCase();
  const s = { hearts:'H', diamonds:'D', clubs:'C', spades:'S' }[card.suit];
  return v + s;
}

// Produce one <div class="card-container"><img class="card-img" …></div>
export function cardImg(card, selectable, onLoad) {
  const container = document.createElement('div');
  container.className = 'card-container';

  const img = new Image();
  img.className = 'card-img';
  img.style.visibility = 'hidden';
  img.src = card.back
    ? 'https://deckofcardsapi.com/static/img/back.png'
    : `https://deckofcardsapi.com/static/img/${code(card)}.png`;
  img.alt = card.back ? 'Card back' : `${card.value} of ${card.suit}`;
  img.onload = () => {
    img.style.visibility = 'visible';
    if (onLoad) onLoad(img);
  };

  if (selectable) {
    img.classList.add('selectable');
    img.style.touchAction = 'manipulation';
    container.addEventListener('click', () => {
      img.classList.toggle('selected');
      container.classList.toggle('selected-container', img.classList.contains('selected'));
    });
  }

  container.appendChild(img);
  return container;
}

// Draw the deck + discard piles in the center
export function createCenterPiles(state) {
  const center = document.getElementById('center');
  center.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'center-piles-wrapper';

  // Deck
  const deckC = document.createElement('div');
  deckC.className = 'center-pile-container';
  deckC.innerHTML = `<div class="pile-label">Deck (${state.deckCount})</div>`;
  const deckP = document.createElement('div');
  deckP.className = 'deck pile';
  if (state.deckCount > 0) deckP.appendChild(cardImg({ back:true }, false));
  deckC.appendChild(deckP);

  // Discard
  const discC = document.createElement('div');
  discC.className = 'center-pile-container';
  discC.innerHTML = `<div class="pile-label">Discard (${state.discardCount})</div>`;
  const discP = document.createElement('div');
  discP.className = 'discard pile';
  if (state.playPile.length)
    discP.appendChild(cardImg(state.playPile[state.playPile.length-1], false));
  discC.appendChild(discP);

  wrapper.append(deckC, discC);
  center.appendChild(wrapper);
}

// Main render entry: clear everything, seat players, then center piles.
export function renderGameState(s) {
  // 1) clear all four slots
  ['.table-slot-top','.table-slot-left','.table-slot-right','.table-slot-bottom']
    .forEach(sel => {
      const slot = document.querySelector(sel);
      if (slot) slot.innerHTML = '';
    });

  // 2) seat assignment, create each player panel, render hand/up/down, buttons
  //    … you can copy your existing code exactly here …

  // 3) finally draw center piles
  createCenterPiles(s);
}
