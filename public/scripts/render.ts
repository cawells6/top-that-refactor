// public/scripts/render.ts
import { Card as CardType } from '@srcTypes/types'; // No .js extension for path alias

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
 * Renders the center piles (deck and discard)
 * @param {any} gameState - Current game state
 */
export function createCenterPiles(gameState: any): void {
  const center = document.getElementById('center');
  if (!center) return;
  center.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'center-piles-wrapper';

  const deckContainer = createPileContainer('Deck', gameState.deckCount || 0);
  const deckPile = createPile('deck');
  if (gameState.deckCount && gameState.deckCount > 0) {
    deckPile.appendChild(cardImg({ value: '', suit: '', back: true } as CardType, false));
  }
  deckContainer.appendChild(deckPile);

  const discardContainer = createPileContainer('Pile', gameState.pile?.length || 0);
  const discardPile = createPile('discard');
  if (gameState.pile && gameState.pile.length > 0) {
    discardPile.appendChild(cardImg(gameState.pile[gameState.pile.length - 1], false));
  }
  discardContainer.appendChild(discardPile);

  wrapper.append(deckContainer, discardContainer);
  center.appendChild(wrapper);
}

/**
 * Creates a container for a pile with label
 */
function createPileContainer(label: string, count: number): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'center-pile-container';
  container.innerHTML = `<div class="pile-label">${label} (${count})</div>`;
  return container;
}

/**
 * Creates an empty pile element
 */
function createPile(className: string): HTMLDivElement {
  const pile = document.createElement('div');
  pile.className = `${className} pile`;
  return pile;
}

/**
 * Main render function to update the entire game view
 * @param {any} gameState - Full game state
 */
export function renderGameState(gameState: any): void {
  const slotTop = document.querySelector('.table-slot-top') as HTMLElement | null;
  const slotBottom = document.querySelector('.table-slot-bottom') as HTMLElement | null;
  const slotLeft = document.querySelector('.table-slot-left') as HTMLElement | null;
  const slotRight = document.querySelector('.table-slot-right') as HTMLElement | null;
  if (slotTop) slotTop.innerHTML = '';
  if (slotBottom) slotBottom.innerHTML = '';
  if (slotLeft) slotLeft.innerHTML = '';
  if (slotRight) slotRight.innerHTML = '';

  document.querySelectorAll('.player-area.active').forEach((el) => el.classList.remove('active'));

  const myId = window.sessionStorage.getItem('myId');
  const players = gameState.players as any[];
  const playerCount = players.length;
  const meIdx = players.findIndex((p: any) => p.id === myId);

  function seatFor(idx: number): string {
    if (playerCount === 0) return 'bottom';
    if (playerCount === 1 && idx === meIdx) return 'bottom';
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

  players.forEach((p: any, idx: number) => {
    const seat = seatFor(idx);
    let panel = document.createElement('div');
    panel.className = 'player-area' + (p.isComputer ? ' computer-player' : '');
    panel.dataset.playerId = p.id;
    if (seat === 'bottom' && p.id === myId) panel.id = 'my-area';
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
    if (p.id === myId) handRow.id = 'my-hand';
    handRow.className = p.id === myId ? 'hand' : 'opp-hand';

    const handCardsToRender =
      p.id === myId && p.hand ? p.hand : Array(p.handCount || 0).fill({ back: true });

    if (handCardsToRender && handCardsToRender.length > 0) {
      for (let i = 0; i < handCardsToRender.length; i++) {
        const card = handCardsToRender[i];
        const canInteract = p.id === myId && gameState.currentPlayerId === myId && !card.back;
        const cardElement = cardImg(card, canInteract);
        if (p.id === myId && !card.back) {
          const imgEl = cardElement.querySelector('.card-img');
          if (imgEl && imgEl instanceof HTMLImageElement) imgEl.dataset.idx = String(i);
        }
        handRow.appendChild(cardElement);
      }
    }

    const handLabel = document.createElement('div');
    handLabel.className = 'row-label';
    handLabel.textContent = `Hand (${p.handCount || 0})`;
    panel.appendChild(handLabel);
    panel.appendChild(handRow);

    const stackRow = document.createElement('div');
    stackRow.className = 'stack-row';
    if (p.upCards && p.upCards.length > 0) {
      p.upCards.forEach((c: CardType, i: number) => {
        const col = document.createElement('div');
        col.className = 'stack';
        if (p.downCount > i) {
          const downCardElement = cardImg({ value: '', suit: '', back: true } as CardType, false);
          const downImg = downCardElement.querySelector('.card-img');
          if (downImg) downImg.classList.add('down-card');
          col.appendChild(downCardElement);
        }
        const canPlayUp = p.id === myId && gameState.currentPlayerId === myId && p.handCount === 0;
        const upCardElement = cardImg(c, canPlayUp);
        const upImg = upCardElement.querySelector('.card-img');
        if (upImg && upImg instanceof HTMLImageElement) {
          upImg.classList.add('up-card');
          if (p.id === myId) upImg.dataset.idx = String(i + 1000);
        }
        col.appendChild(upCardElement);
        if (canPlayUp) col.classList.add('playable-stack');
        stackRow.appendChild(col);
      });
    } else if (p.downCount && p.downCount > 0) {
      for (let i = 0; i < p.downCount; i++) {
        const col = document.createElement('div');
        col.className = 'stack';
        const canPlayDown =
          p.id === myId &&
          gameState.currentPlayerId === myId &&
          p.handCount === 0 &&
          p.upCount === 0;
        const downCardElement = cardImg(
          { value: '', suit: '', back: true } as CardType,
          canPlayDown && i === 0
        );
        const downImg = downCardElement.querySelector('.card-img');
        if (downImg && downImg instanceof HTMLImageElement) {
          downImg.classList.add('down-card');
          if (p.id === myId) downImg.dataset.idx = String(i + 2000);
        }
        col.appendChild(downCardElement);
        if (canPlayDown && i === 0) col.classList.add('playable-stack');
        stackRow.appendChild(col);
      }
    }

    const stackLabel = document.createElement('div');
    stackLabel.className = 'row-label';
    stackLabel.textContent = `Up (${p.upCount || 0}) / Down (${p.downCount || 0})`;
    panel.appendChild(stackLabel);
    panel.appendChild(stackRow);

    if (seat === 'bottom' && slotBottom) slotBottom.appendChild(panel);
    else if (seat === 'top' && slotTop) slotTop.appendChild(panel);
    else if (seat === 'left' && slotLeft) slotLeft.appendChild(panel);
    else if (seat === 'right' && slotRight) slotRight.appendChild(panel);
  });

  createCenterPiles(gameState);
}

/**
 * Overlay special card symbol on top of discard pile card
 */
export function showCardEvent(cardValue: number | string | null, type: string): void {
  let discardImg = document.querySelector('.discard .card-img') as HTMLImageElement | null;
  let retries = 0;
  function tryRunEffect() {
    discardImg = document.querySelector('.discard .card-img') as HTMLImageElement | null;
    if (!discardImg && retries < 5) {
      retries++;
      setTimeout(tryRunEffect, 100);
      return;
    }
    if (!discardImg) return;
    function runEffect() {
      const parentElement = discardImg!.parentElement;
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
      parentElement.style.position = 'relative';
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
