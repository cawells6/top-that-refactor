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
  const deckElement = document.getElementById('deck') as HTMLImageElement;
  const pileTopCardElement = document.getElementById('pile-top-card') as HTMLImageElement;
  const deckCountLabel = document.getElementById('deck-count-label');
  const pileCountLabel = document.getElementById('pile-count-label');
  const pileOutlineVisual = document.getElementById('pile-outline-visual');

  if (!gameState || !gameState.players) {
    console.warn('Render: No game state or players to render.');
    // Potentially hide or clear game board elements if state is invalid
    if (slotTop) slotTop.innerHTML = '';
    if (slotBottom) slotBottom.innerHTML = '';
    if (slotLeft) slotLeft.innerHTML = '';
    if (slotRight) slotRight.innerHTML = '';
    if (deckElement) deckElement.style.display = 'none';
    if (pileTopCardElement) pileTopCardElement.style.display = 'none';
    if (pileOutlineVisual) pileOutlineVisual.style.display = 'flex';
    if (deckCountLabel) deckCountLabel.textContent = 'Deck (0)';
    if (pileCountLabel) pileCountLabel.textContent = 'Pile (0)';
    return;
  }

  // Clear player areas
  if (slotTop) slotTop.innerHTML = '';
  if (slotBottom) slotBottom.innerHTML = '';
  if (slotLeft) slotLeft.innerHTML = '';
  if (slotRight) slotRight.innerHTML = '';
  document.querySelectorAll('.player-area.active').forEach((el) => el.classList.remove('active'));

  const players = gameState.players;
  const playerCount = players.length;
  const meIdx = localPlayerId ? players.findIndex((p) => p.id === localPlayerId) : -1;

  function seatFor(idx: number): string {
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

  players.forEach((p: ClientStatePlayer, idx: number) => {
    const seat = seatFor(idx);
    let panel = document.createElement('div');
    panel.className = 'player-area' + (p.isComputer ? ' computer-player' : '');
    panel.dataset.playerId = p.id;
    if (seat === 'bottom' && p.id === localPlayerId) panel.id = 'my-area';
    if (p.isComputer) panel.classList.add('computer-player');
    if (p.disconnected) panel.classList.add('disconnected');
    if (p.id === gameState.currentPlayerId) panel.classList.add('active');
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.alignItems = 'center';

    // Player name banner (revert to simple span)
    const nameHeader = document.createElement('div');
    nameHeader.className = 'player-name-header ' + (p.isComputer ? 'player-cpu' : 'player-human');
    nameHeader.innerHTML = `<span class="player-name-text">${p.name || p.id}${p.disconnected ? " <span class='player-role'>(Disconnected)</span>" : ''}</span>`;
    panel.appendChild(nameHeader);

    // --- Hand row (always 3 cards, shingled) ---
    const handArea = document.createElement('div');
    handArea.className = 'hand-area' + (p.id === gameState.currentPlayerId ? ' active' : '');
    const handRow = document.createElement('div');
    handRow.className = p.id === localPlayerId ? 'hand player-hand' : 'hand opp-hand';
    handRow.id = p.id === localPlayerId ? 'my-hand' : '';
    let handCards: CardType[] = [];
    if (p.id === localPlayerId && p.hand) {
      handCards = p.hand;
    } else {
      handCards = Array(3).fill({ back: true } as CardType);
    }
    for (let i = 0; i < 3; i++) {
      const cardData = handCards[i] || { back: true };
      const canInteract =
        p.id === localPlayerId &&
        gameState.currentPlayerId === p.id &&
        !cardData.back &&
        (p.hand?.length || 0) > 0;
      const cardElement = cardImg(cardData, canInteract);
      if (p.id === localPlayerId && !cardData.back) {
        const imgEl = cardElement.querySelector('.card-img');
        if (imgEl && imgEl instanceof HTMLImageElement) imgEl.dataset.idx = String(i);
      }
      handRow.appendChild(cardElement);
    }
    if (p.id !== localPlayerId) {
      const handCountBadge = document.createElement('div');
      handCountBadge.className = 'hand-count-badge';
      handCountBadge.textContent = String(p.handCount ?? 0);
      handRow.appendChild(handCountBadge);
    }
    handArea.appendChild(handRow);
    panel.appendChild(handArea);

    // --- Up/Down stack row (always 3 columns) ---
    const stackArea = document.createElement('div');
    stackArea.className = 'stack-area' + (p.id === gameState.currentPlayerId ? ' active' : '');
    const stackRow = document.createElement('div');
    stackRow.className = 'stack-row';
    for (let i = 0; i < 3; i++) {
      const col = document.createElement('div');
      col.className = 'stack';
      const hasDown = p.downCardsHidden && i < p.downCardsHidden;
      const canPlayDown =
        p.id === localPlayerId &&
        gameState.currentPlayerId === p.id &&
        (p.hand?.length || 0) === 0 &&
        (p.upCards?.length || 0) === 0 &&
        !!hasDown &&
        i === 0;
      const downCardElement = cardImg({ value: '', suit: '', back: true } as CardType, canPlayDown);
      const downImg = downCardElement.querySelector('.card-img');
      if (downImg && downImg instanceof HTMLImageElement) {
        downImg.classList.add('down-card');
        if (p.id === localPlayerId) downImg.dataset.idx = String(i + 2000);
      }
      col.appendChild(downCardElement);
      const hasUp = p.upCards && i < p.upCards.length;
      if (hasUp && p.upCards) {
        const upCardData = p.upCards[i];
        const canPlayUp =
          p.id === localPlayerId &&
          gameState.currentPlayerId === p.id &&
          (p.hand?.length || 0) === 0 &&
          (p.upCards?.length || 0) > 0;
        const upCardElement = cardImg(upCardData, canPlayUp);
        const upImg = upCardElement.querySelector('.card-img');
        if (upImg && upImg instanceof HTMLImageElement) {
          upImg.classList.add('up-card');
          if (p.id === localPlayerId) upImg.dataset.idx = String(i + 1000);
        }
        col.appendChild(upCardElement);
        if (canPlayUp) col.classList.add('playable-stack');
      }
      stackRow.appendChild(col);
    }
    stackArea.appendChild(stackRow);
    panel.appendChild(stackArea);

    // Place panel in correct slot
    if (seat === 'bottom' && slotBottom) slotBottom.appendChild(panel);
    else if (seat === 'top' && slotTop) slotTop.appendChild(panel);
    else if (seat === 'left' && slotLeft) slotLeft.appendChild(panel);
    else if (seat === 'right' && slotRight) slotRight.appendChild(panel);
  });

  // --- Center area: Deck and Discard placeholders ---
  const centerArea = document.getElementById('center-area');
  if (centerArea) centerArea.innerHTML = '';
  const pilesWrapper = document.createElement('div');
  pilesWrapper.className = 'piles-wrapper';
  // Deck placeholder
  const deckContainer = document.createElement('div');
  deckContainer.className = 'deck-placeholder';
  deckContainer.id = 'deck-placeholder';
  if (gameState.deckSize > 0) {
    const deckImg = document.createElement('img');
    deckImg.src = 'https://deckofcardsapi.com/static/img/back.png';
    deckImg.alt = 'Deck';
    deckImg.className = 'deck-img';
    deckContainer.appendChild(deckImg);
  }
  const deckCount = document.createElement('div');
  deckCount.className = 'deck-count-label';
  deckCount.textContent = String(gameState.deckSize || 0);
  deckContainer.appendChild(deckCount);
  pilesWrapper.appendChild(deckContainer);
  // Discard placeholder
  const discardContainer = document.createElement('div');
  discardContainer.className = 'discard-placeholder';
  discardContainer.id = 'discard-placeholder';
  if (gameState.pile && gameState.pile.length > 0) {
    const topCard = gameState.pile[gameState.pile.length - 1];
    const discardImg = document.createElement('img');
    discardImg.src = `https://deckofcardsapi.com/static/img/${code(topCard)}.png`;
    discardImg.alt = `${topCard.value} of ${topCard.suit}`;
    discardImg.className = 'discard-img';
    discardContainer.appendChild(discardImg);
  }
  const pileCount = document.createElement('div');
  pileCount.className = 'pile-count-label';
  pileCount.textContent = String(gameState.pile ? gameState.pile.length : 0);
  discardContainer.appendChild(pileCount);
  pilesWrapper.appendChild(discardContainer);
  centerArea?.appendChild(pilesWrapper);
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
