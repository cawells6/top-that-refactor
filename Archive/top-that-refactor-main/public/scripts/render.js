// public/scripts/render.js
import { stateHistory, stateIndex, pileTransition } from './state.js';
import { createCardElement } from './card.js';

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

/**
 * Renders the center piles (deck and discard)
 * @param {object} state - Current game state
 */
export function createCenterPiles(state) {
  const center = document.getElementById('center');
  center.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'center-piles-wrapper';

  // Create deck pile with label
  const deckContainer = createPileContainer('Deck', state.deckCount);
  const deckPile = createPile('deck');
  if (state.deckCount > 0) {
    deckPile.appendChild(createCardElement({ back: true }, false));
  }
  deckContainer.appendChild(deckPile);

  // Create discard pile with label
  const discardContainer = createPileContainer('Discard', state.discardCount);
  const discardPile = createPile('discard');
  if (state.pile && state.pile.length) {
    discardPile.appendChild(createCardElement(state.pile[state.pile.length - 1], false));
  }
  discardContainer.appendChild(discardPile);

  wrapper.append(deckContainer, discardContainer);
  center.appendChild(wrapper);
}

/**
 * Creates a container for a pile with label
 */
function createPileContainer(label, count) {
  const container = document.createElement('div');
  container.className = 'center-pile-container';
  container.innerHTML = `<div class="pile-label">${label} (${count})</div>`;
  return container;
}

/**
 * Creates an empty pile element
 */
function createPile(className) {
  const pile = document.createElement('div');
  pile.className = `${className} pile`;
  return pile;
}

/**
 * Main render function to update the entire game view
 * @param {object} state - Full game state
 */
export function renderGameState(state) {
  // Clear all player slots
  const slots = ['.table-slot-top', '.table-slot-left', '.table-slot-right', '.table-slot-bottom'];
  slots.forEach(selector => {
    const slot = document.querySelector(selector);
    if (slot) slot.innerHTML = '';
  });

  // Render players in their positions
  if (state.players && state.players.length) {
    renderPlayers(state.players, state.currentPlayer);
  }

  // Draw center piles
  createCenterPiles(state);
}

/**
 * Renders players in appropriate positions
 * @param {Array} players - Array of player objects
 * @param {string} currentPlayerId - ID of the current player
 */
function renderPlayers(players, currentPlayerId) {
  const positions = ['bottom', 'left', 'top', 'right'];
  const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);

  players.forEach((player, index) => {
    // Calculate position relative to current player
    const relativePos = (index - currentPlayerIndex + players.length) % players.length;
    const position = positions[relativePos];

    renderPlayerInSlot(player, position, player.id === currentPlayerId);
  });
}

/**
 * Renders a player in a specific table slot
 * @param {object} player - Player data
 * @param {string} position - Position ('bottom', 'left', 'top', 'right')
 * @param {boolean} isCurrentPlayer - Whether this is the current player
 */
function renderPlayerInSlot(player, position, isCurrentPlayer) {
  const slot = document.querySelector(`.table-slot-${position}`);
  if (!slot) return;

  const container = document.createElement('div');
  container.className = `player-area ${player.id === stateIndex ? 'active' : ''}`;

  // Add player info section
  const info = document.createElement('div');
  info.className = 'player-info';
  info.innerHTML = `<span class="player-name">${player.name || player.id}</span>`;
  container.appendChild(info);

  // Render either current player cards or opponent cards
  if (isCurrentPlayer) {
    renderPlayerCards(container, player);
  } else {
    renderOpponentCards(container, player);
  }

  slot.appendChild(container);
}

/**
 * Renders the cards for the current player
 * @param {HTMLElement} container - The container to render into
 * @param {object} player - The player data
 */
function renderPlayerCards(container, player) {
  const handSection = document.createElement('div');
  handSection.className = 'player-section';

  const handLabel = document.createElement('div');
  handLabel.className = 'row-label';
  handLabel.textContent = 'Hand';

  const handContainer = document.createElement('div');
  handContainer.className = 'hand';

  player.hand.forEach(card => {
    const cardElement = createCardElement(card, true);
    handContainer.appendChild(cardElement);
  });

  handSection.appendChild(handLabel);
  handSection.appendChild(handContainer);
  container.appendChild(handSection);
}

/**
 * Renders the cards for an opponent
 * @param {HTMLElement} container - The container to render into
 * @param {object} player - The player data
 */
function renderOpponentCards(container, player) {
  const handSection = document.createElement('div');
  handSection.className = 'player-section';

  const handLabel = document.createElement('div');
  handLabel.className = 'row-label';
  handLabel.textContent = 'Hand';

  const handContainer = document.createElement('div');
  handContainer.className = 'opp-hand';

  for (let i = 0; i < player.handCount; i++) {
    handContainer.appendChild(createCardElement({ back: true }, false));
  }

  handSection.appendChild(handLabel);
  handSection.appendChild(handContainer);
  container.appendChild(handSection);
}

/**
 * Overlay special card symbol on top of discard pile card
 */
export function showCardEvent(cardValue, type) {
  let discardImg = document.querySelector('.discard .card-img');
  let retries = 0;
  function tryRunEffect() {
    discardImg = document.querySelector('.discard .card-img');
    if (!discardImg && retries < 5) {
      retries++;
      setTimeout(tryRunEffect, 100);
      return;
    }
    if (!discardImg) return;
    function runEffect() {
      // Remove any existing icon
      const prev = discardImg.parentElement.querySelector('.special-icon');
      if (prev) prev.remove();
      // Create an image for the special effect
      const icon = document.createElement('img');
      icon.className = 'special-icon';
      // Use updated PNGs for each effect
      let src = '';
      if (type === 'two' || cardValue == 2) src = '/src/shared/Reset-icon.png';
      else if (type === 'five' || cardValue == 5) src = '/src/shared/Copy-icon.png';
      else if (type === 'ten' || cardValue == 10) src = '/src/shared/Burn-icon.png';
      else if (type === 'four') src = '/src/shared/4ofakind-icon.png';
      else if (type === 'invalid') src = '/src/shared/invalid play-icon.png';
      else if (type === 'take') src = '/src/shared/take pile-icon.png';
      else if (type === 'regular') return;
      icon.src = src;
      icon.onerror = () => {
        icon.style.background = 'rgba(255,255,255,0.7)';
        icon.style.borderRadius = '50%';
        icon.style.display = 'flex';
        icon.style.justifyContent = 'center';
        icon.style.alignItems = 'center';
        const fallbackText = document.createElement('div');
        fallbackText.textContent = type === 'take' ? 'TAKE' : 
                                  type === 'two' ? 'RESET' :
                                  type === 'five' ? 'COPY' :
                                  type === 'ten' ? 'BURN' :
                                  type === 'four' ? '4X' : 'X';
        fallbackText.style.color = '#000';
        fallbackText.style.fontWeight = 'bold';
        icon.appendChild(fallbackText);
      };
      icon.style.position = 'absolute';
      icon.style.top = '50%';
      icon.style.left = '50%';
      icon.style.transform = 'translate(-50%, -50%)';
      icon.style.width = '90px';
      icon.style.height = '90px';
      icon.style.zIndex = '100';
      icon.style.background = 'none';
      icon.style.backgroundColor = 'transparent';
      icon.style.pointerEvents = 'none';
      icon.style.filter = 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.9))';
      icon.style.animation = 'iconPulse 1.5s ease-in-out';
      discardImg.parentElement.style.position = 'relative';
      discardImg.parentElement.appendChild(icon);
      setTimeout(() => {
        icon.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        icon.style.opacity = '0';
        icon.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => icon.remove(), 500);
      }, 1800);
    }
    if (discardImg instanceof HTMLImageElement && !discardImg.complete) {
      discardImg.addEventListener('load', runEffect, { once: true });
    } else {
      runEffect();
    }
  }
  tryRunEffect();
}
