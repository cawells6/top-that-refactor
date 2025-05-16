// public/scripts/render.js
import { stateHistory, stateIndex, pileTransition } from './state.js';
import { createCardElement } from './card.js';

// Convert {value:'A',suit:'hearts'} → "AH", 10→"0"
function code(card) {
  // This function is only called by cardImg when card.back is false.
  // So, we expect card.value and card.suit to be present.
  const v = String(card.value).toUpperCase() === '10' ? '0'
          : String(card.value).toUpperCase();
  const s = { hearts:'H', diamonds:'D', clubs:'C', spades:'S' }[card.suit.toLowerCase()]; // Ensure consistent casing for lookup
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
  console.log('cardImg input:', card, 'Output src:', img.src); // Added for debugging
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
    deckPile.appendChild(cardImg({ back: true }, false));
  }
  deckContainer.appendChild(deckPile);

  // Create discard pile with label
  const discardContainer = createPileContainer('Discard', state.discardCount);
  const discardPile = createPile('discard');
  if (state.pile && state.pile.length) {
    discardPile.appendChild(cardImg(state.pile[state.pile.length - 1], false));
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
  console.log('Rendering game state:', state); // Added for debugging
  // Clear all player slots
  const slotTop = document.querySelector('.table-slot-top');
  const slotBottom = document.querySelector('.table-slot-bottom');
  const slotLeft = document.querySelector('.table-slot-left');
  const slotRight = document.querySelector('.table-slot-right');
  if (slotTop) slotTop.innerHTML = '';
  if (slotBottom) slotBottom.innerHTML = '';
  if (slotLeft) slotLeft.innerHTML = '';
  if (slotRight) slotRight.innerHTML = '';

  // Remove any previous active highlights
  document.querySelectorAll('.player-area.active').forEach(el => el.classList.remove('active'));

  // --- Robust seat assignment for 2-4 players ---
  const myId = window.sessionStorage.getItem('myId');
  const players = state.players;
  const playerCount = players.length;
  const meIdx = players.findIndex(p => p.id === myId);
  function seatFor(idx) {
    if (playerCount === 2) return idx === meIdx ? 'bottom' : 'top';
    if (playerCount === 3) {
      if (idx === meIdx) return 'bottom';
      if ((idx - meIdx + playerCount) % playerCount === 1) return 'left';
      return 'right';
    }
    if (playerCount === 4) {
      if (idx === meIdx) return 'bottom';
      if ((idx - meIdx + playerCount) % playerCount === 1) return 'left';
      if ((idx - meIdx + playerCount) % playerCount === 2) return 'top';
      return 'right';
    }
    return 'bottom';
  }

  // --- Render all players in correct slots ---
  players.forEach((p, idx) => {
    const seat = seatFor(idx);
    let panel = document.createElement('div');
    panel.className = 'player-area' + (p.isComputer ? ' computer-player' : '');
    panel.dataset.playerId = p.id;
    if (seat === 'bottom' && p.id === myId) panel.id = 'my-area';
    if (p.isComputer) panel.classList.add('computer-player');
    if (p.disconnected) panel.classList.add('disconnected');
    if (p.id === state.currentPlayer) panel.classList.add('active');
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.alignItems = 'center';
    if (seat === 'left') panel.classList.add('rotate-right');
    if (seat === 'right') panel.classList.add('rotate-left');

    // Name header (banner)
    const nameHeader = document.createElement('div');
    nameHeader.className = 'player-name-header ' + (p.isComputer ? 'player-cpu' : 'player-human');
    nameHeader.innerHTML = `<span class="player-name-text">${p.name || p.id}${p.disconnected ? " <span class='player-role'>(Disconnected)</span>" : ''}</span>`;
    panel.appendChild(nameHeader);

    // Hand row
    const handRow = document.createElement('div');
    if (p.id === myId) handRow.id = 'my-hand';
    handRow.className = p.id === myId ? 'hand' : 'opp-hand';
    if (p.hand && p.hand.length > 0) {
      // Render hand cards for self
      for (let i = 0; i < p.hand.length; i++) {
        const card = p.hand[i];
        const canInteract = state.currentPlayer === myId;
        const container = cardImg(card, canInteract);
        const imgEl = container.querySelector('.card-img');
        if (imgEl && imgEl instanceof HTMLImageElement) imgEl.dataset.idx = String(i);
        handRow.appendChild(container);
      }
    } else if (p.handCount > 0) {
      // Show placeholder backs for opponents
      const displayCount = Math.min(p.handCount, 3);
      for (let i = 0; i < displayCount; i++) {
        const el = document.createElement('div');
        el.className = 'card-placeholder';
        const cardEl = cardImg({ back: true }, false);
        el.appendChild(cardEl);
        handRow.appendChild(el);
      }
    }
    // Show the actual card count in the section label for opponents
    const handLabel = document.createElement('div');
    handLabel.className = 'row-label';
    handLabel.textContent = `Hand${p.id === myId ? '' : ' (' + (p.handCount || 0) + ')'}`;
    panel.appendChild(handLabel);
    panel.appendChild(handRow);

    // Up/Down stacks
    const stackRow = document.createElement('div');
    stackRow.className = 'stack-row';
    if (p.upCards && p.upCards.length > 0) {
      p.upCards.forEach((c, i) => {
        const col = document.createElement('div');
        col.className = 'stack';
        const downCard = cardImg({ back: true }, false);
        const downCardImg = downCard.querySelector('.card-img');
        if (downCardImg && downCardImg instanceof HTMLImageElement) {
          downCardImg.classList.add('down-card');
          if (p.id === myId) downCardImg.dataset.idx = String(i + 2000);
        }
        const upCard = cardImg(c, p.id === myId && state.currentPlayer === myId && p.hand.length === 0);
        const upCardImg = upCard.querySelector('.card-img');
        if (upCardImg && upCardImg instanceof HTMLImageElement) {
          upCardImg.classList.add('up-card');
          if (p.id === myId) upCardImg.dataset.idx = String(i + 1000);
        }
        col.append(downCard, upCard);
        if (p.id === myId && state.currentPlayer === myId && p.hand.length === 0) {
          col.classList.add('playable-stack');
        }
        stackRow.appendChild(col);
      });
    } else if (p.downCount && p.downCount > 0) {
      for (let i = 0; i < p.downCount; i++) {
        const col = document.createElement('div');
        col.className = 'stack';
        const downCard = cardImg({ back: true }, p.id === myId && state.currentPlayer === myId && (!p.upCards || p.upCards.length === 0) && i === 0);
        const downCardImg = downCard.querySelector('.card-img');
        if (downCardImg && downCardImg instanceof HTMLImageElement) {
          downCardImg.classList.add('down-card');
          if (p.id === myId) downCardImg.dataset.idx = String(i + 2000);
        }
        col.appendChild(downCard);
        if (p.id === myId && state.currentPlayer === myId && (!p.upCards || p.upCards.length === 0) && i === 0) {
          col.classList.add('playable-stack');
        }
        stackRow.appendChild(col);
      }
    }
    // Up/Down label
    const stackLabel = document.createElement('div');
    stackLabel.className = 'row-label';
    stackLabel.textContent = 'Up / Down';
    panel.appendChild(stackLabel);
    panel.appendChild(stackRow);

    // Place panel in correct slot
    if (seat === 'bottom' && slotBottom) slotBottom.appendChild(panel);
    else if (seat === 'top' && slotTop) slotTop.appendChild(panel);
    else if (seat === 'left' && slotLeft) slotLeft.appendChild(panel);
    else if (seat === 'right' && slotRight) slotRight.appendChild(panel);
  });

  // Draw center piles
  createCenterPiles(state);
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
