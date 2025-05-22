import { Card as CardType, GameStateData, ClientStatePlayer } from '../../src/shared/types.js'; // Corrected import path

// Convert {value:'A',suit:'hearts'} → "AH", 10→"0"
function code(card: CardType): string {
  if (
    card.value === null ||
    card.value === undefined ||
    card.suit === null ||
    card.suit === undefined
  ) {
    return 'ERR';
  }
  const v = String(card.value).toUpperCase() === '10' ? '0' : String(card.value).toUpperCase();
  const suitMap: { [key: string]: string } = {
    hearts: 'H',
    diamonds: 'D',
    clubs: 'C',
    spades: 'S',
  };
  const s = suitMap[card.suit.toLowerCase() as keyof typeof suitMap];
  if (!s) return 'ERR';
  return v + s;
}

// Produce one <div class="card-container"><img class="card-img" …></div>
export function cardImg(
  card: CardType,
  selectable?: boolean,
  onLoad?: (img: HTMLImageElement) => void
): HTMLDivElement {
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
  img.onerror = () => {
    img.style.visibility = 'visible';
    img.alt = `Error loading ${img.alt}`;
    container.style.border = '1px dashed red';
    container.textContent = img.alt;
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
 * Main render function to update the entire game view
 * @param {GameStateData} gameState - Full game state from server
 */
export function renderGameState(gameState: GameStateData, localPlayerId: string | null): void {
  // Corrected selectors to use IDs from index.html
  const slotTop = document.getElementById('opponent-area-top') as HTMLElement | null;
  const slotBottom = document.getElementById('player-area-bottom') as HTMLElement | null;
  const slotLeft = document.getElementById('opponent-area-left') as HTMLElement | null;
  const slotRight = document.getElementById('opponent-area-right') as HTMLElement | null;

  if (!gameState || !gameState.players) {
    console.warn('Render: No game state or players to render.');
    // Potentially hide or clear game board elements if state is invalid
    if (slotTop) slotTop.innerHTML = '';
    if (slotBottom) slotBottom.innerHTML = '';
    if (slotLeft) slotLeft.innerHTML = '';
    if (slotRight) slotRight.innerHTML = '';
    return;
  }

  // Clear player areas
  if (slotTop) slotTop.innerHTML = '';
  if (slotBottom) slotBottom.innerHTML = '';
  if (slotLeft) slotLeft.innerHTML = '';
  if (slotRight) slotRight.innerHTML = '';
  document.querySelectorAll('.player-area.active').forEach((el) => el.classList.remove('active'));

  const players = gameState.players;
  const meIdx = localPlayerId ? players.findIndex((p) => p.id === localPlayerId) : -1;

  // --- NEW: Rotate players array so local player is always index 0 ---
  let rotatedPlayers: ClientStatePlayer[] = [];
  if (meIdx >= 0) {
    rotatedPlayers = players.slice(meIdx).concat(players.slice(0, meIdx));
  } else {
    rotatedPlayers = players.slice();
  }

  // Assign seats in fixed order: bottom, left, top, right
  const seatOrder = ['bottom', 'left', 'top', 'right'];
  rotatedPlayers.forEach((p, idx) => {
    const seat = seatOrder[idx] || 'top';
    let panel = document.createElement('div');
    panel.className = 'player-area' + (p.isComputer ? ' computer-player' : '');
    panel.dataset.playerId = p.id;
    if (seat === 'bottom' && p.id === localPlayerId) panel.id = 'my-area';
    if (p.isComputer) panel.classList.add('computer-player');
    if (p.disconnected) panel.classList.add('disconnected');
    if (p.id === gameState.currentPlayerId) {
      panel.classList.add('active');
    }
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.alignItems = 'center';
    if (seat === 'left') panel.classList.add('rotate-right');
    if (seat === 'right') panel.classList.add('rotate-left');

    const nameHeader = document.createElement('div');
    nameHeader.className = 'player-name-header ' + (p.isComputer ? 'player-cpu' : 'player-human');
    nameHeader.innerHTML = `<span class="player-name-text">${p.name || p.id}${p.disconnected ? " <span class='player-role'>(Disconnected)</span>" : ''}</span>`;
    panel.appendChild(nameHeader);

    const handRow = document.createElement('div');
    if (p.id === localPlayerId) handRow.id = 'my-hand';
    handRow.className = p.id === localPlayerId ? 'hand' : 'opp-hand';

    const handCardsToRender = p.id === localPlayerId 
      ? p.hand 
      : Array(p.handCount || 0).fill({ back: true });

    if (handCardsToRender && handCardsToRender.length > 0) {
      for (let i = 0; i < handCardsToRender.length; i++) {
        const card = handCardsToRender[i];
        const canInteract = p.id === localPlayerId && gameState.currentPlayerId === localPlayerId;
        const cardElement = cardImg(card, canInteract && !card.back);
        if (p.id === localPlayerId && !card.back) {
          const imgEl = cardElement.querySelector('.card-img');
          if (imgEl && imgEl instanceof HTMLImageElement) imgEl.dataset.idx = String(i);
        }
        handRow.appendChild(cardElement);
      }
    }
    panel.appendChild(handRow);

    // Place panel in correct slot
    if (seat === 'bottom' && slotBottom) slotBottom.appendChild(panel);
    else if (seat === 'top' && slotTop) slotTop.appendChild(panel);
    else if (seat === 'left' && slotLeft) slotLeft.appendChild(panel);
    else if (seat === 'right' && slotRight) slotRight.appendChild(panel);
  });

  // --- Center area: Deck and Discard piles ---
  const centerArea = document.getElementById('center-area');
  if (centerArea) {
    centerArea.innerHTML = '';
    // Create deck and discard piles visually
    const wrapper = document.createElement('div');
    wrapper.className = 'center-piles-wrapper';

    // Deck
    const deckContainer = document.createElement('div');
    deckContainer.className = 'center-pile-container';
    deckContainer.innerHTML = `<div class="pile-label">Deck (${gameState.deckSize || 0})</div>`;
    const deckPile = document.createElement('div');
    deckPile.className = 'deck pile';
    if (gameState.deckSize && gameState.deckSize > 0) {
      deckPile.appendChild(cardImg({ value: '', suit: '', back: true } as CardType, false));
    } else {
      // Always show a placeholder for empty deck
      const placeholder = document.createElement('div');
      placeholder.className = 'deck-placeholder';
      placeholder.innerHTML = '<span style="color:#bbb;font-size:1.2em;">Empty</span>';
      deckPile.appendChild(placeholder);
    }
    deckContainer.appendChild(deckPile);

    // Discard
    const discardContainer = document.createElement('div');
    discardContainer.className = 'center-pile-container';
    const totalDiscardCount = (gameState.pile?.length || 0) + (gameState.discardCount || 0);
    discardContainer.innerHTML = `<div class="pile-label">Discard (${totalDiscardCount})</div>`;
    const discardPile = document.createElement('div');
    discardPile.className = 'discard pile';
    if (gameState.pile && gameState.pile.length > 0) {
      discardPile.appendChild(cardImg(gameState.pile[gameState.pile.length - 1], false));
    } else if (gameState.discardCount && gameState.discardCount > 0) {
      // Show a card back or discard icon as a placeholder for hidden discard stack
      discardPile.appendChild(cardImg({ value: '', suit: '', back: true } as CardType, false));
    } else {
      // Always show a placeholder for empty discard
      const placeholder = document.createElement('div');
      placeholder.className = 'discard-placeholder';
      placeholder.innerHTML = '<span style="color:#bbb;font-size:1.2em;">Empty</span>';
      discardPile.appendChild(placeholder);
    }
    discardContainer.appendChild(discardPile);

    wrapper.append(deckContainer, discardContainer);
    centerArea.appendChild(wrapper);
  }
}

/**
 * Overlay special card symbol on top of discard pile card
 */
export function showCardEvent(cardValue: number | string | null, type: string): void {
  // Query for the pile top card image directly, as it's now consistently used.
  let discardImg = document.getElementById('pile-top-card') as HTMLImageElement | null;

  // If pile-top-card is not visible (e.g. pile is empty), try to find a card in a .discard container if that structure still exists from old code.
  // This is a fallback, ideally the pile-top-card is the single source of truth for the top discard image.
  if (!discardImg || discardImg.style.display === 'none') {
    discardImg = document.querySelector('.discard .card-img') as HTMLImageElement | null;
  }

  let retries = 0;
  function tryRunEffect() {
    if (!discardImg || discardImg.style.display === 'none') {
      if (retries < 1) {
        discardImg = document.querySelector('.discard .card-img') as HTMLImageElement | null;
      }
      console.warn('showCardEvent: Could not find discard image to overlay effect.');
    }

    if (!discardImg && retries < 5) {
      retries++;
      setTimeout(tryRunEffect, 100);
      return;
    }
    if (!discardImg) {
      console.warn('showCardEvent: Could not find discard image to overlay effect.');
      return;
    }

    function runEffect() {
      const parentElement = discardImg!.parentElement; // pile-placeholder or .card-container
      if (!parentElement) return;

      const prev = parentElement.querySelector('.special-icon');
      if (prev) prev.remove();
      const icon = document.createElement('img');
      icon.className = 'special-icon';
      let src = '';
      if (type === 'two' || cardValue === 2) src = '/assets/effects/reset.png';
      else if (type === 'five' || cardValue === 5) src = '/assets/effects/copy.png';
      else if (type === 'ten' || cardValue === 10) src = '/assets/effects/burn.png';
      else if (type === 'four') src = '/assets/effects/4ofakind.png';
      else if (type === 'invalid') src = '/assets/effects/invalid.png';
      else if (type === 'take') src = '/assets/effects/take.png';
      else if (type === 'regular') return;
      icon.src = src;
      icon.onerror = () => {
        icon.style.background = 'rgba(255,255,255,0.7)';
        icon.style.borderRadius = '50%';
        icon.style.display = 'flex';
        icon.style.justifyContent = 'center';
        icon.style.alignItems = 'center';
        const fallbackText = document.createElement('div');
        fallbackText.textContent =
          type === 'take'
            ? 'TAKE'
            : type === 'two'
              ? 'RESET'
              : type === 'five'
                ? 'COPY'
                : type === 'ten'
                  ? 'BURN'
                  : type === 'four'
                    ? '4X'
                    : 'X';
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
      // Ensure parent has relative positioning if it doesn't already.
      if (getComputedStyle(parentElement).position === 'static') {
        parentElement.style.position = 'relative';
      }
      parentElement.appendChild(icon);
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
