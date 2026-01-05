import {
  Card as CardType,
  GameStateData,
} from '../../src/shared/types.js';
import {
  normalizeCardValue,
  rank,
  isSpecialCard,
} from '../../utils/cardUtils.js';

// Import assets so Vite can resolve hashed filenames
import playerAvatarUrl from '../assets/Player.svg';
import robotAvatarUrl from '../assets/robot.svg';

// --- PRELOAD LOGIC START ---
const ICON_PATHS = {
  two: '/src/shared/Reset-icon.png',
  five: '/src/shared/Copy-icon.png',
  ten: '/src/shared/Burn-icon.png',
  invalid: '/src/shared/invalid play-icon.png',
  take: '/src/shared/take pile-icon.png',
};

function preloadIcons() {
  console.log('[Assets] Preloading special card icons...');
  Object.values(ICON_PATHS).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}
preloadIcons();
// --- PRELOAD LOGIC END ---

let activeFlyPromise: Promise<void> | null = null;

export function waitForFlyingCard(): Promise<void> {
  return activeFlyPromise || Promise.resolve();
}

let lastLocalHandCount = -1;
let lastLocalHandCards: CardType[] = [];
let suppressNextHandAnimation = false;
let lastHandOverlap = 0;
let lastHandCompressed = false;

export function resetHandTracking(): void {
  suppressNextHandAnimation = true;
}

const seatAccents: Record<string, string> = {
  bottom: '#f6c556',
  right: '#60d6a6',
  top: '#ff8b5f',
  left: '#6fb4ff',
};

function createTag(text: string, variant: string): HTMLSpanElement {
  const tag = document.createElement('span');
  tag.className = `tag tag--${variant}`;
  tag.textContent = text;
  return tag;
}

function getCardIconType(card: CardType): string | null {
  if (card.back) return null;
  const val = String(card.value);
  if (val === '2') return 'two';
  if (val === '5') return 'five';
  if (val === '10') return 'ten';
  return null;
}

export function code(card: CardType): string {
  if (card.value == null || card.suit == null) return 'ERR';
  const v = String(card.value).toUpperCase() === '10' ? '0' : String(card.value).toUpperCase();
  const suitMap: { [key: string]: string } = { hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S' };
  const s = suitMap[card.suit.toLowerCase() as keyof typeof suitMap];
  if (!s) return 'ERR';
  return v + s;
}

export function cardImg(
  card: CardType,
  selectable?: boolean,
  onLoad?: (img: HTMLImageElement) => void,
  showAbilityIcon: boolean = true
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'card-container';
  container.style.position = 'relative';

  const img = new Image();
  img.className = 'card-img';
  img.style.visibility = 'hidden';

  const cardCode = card.back ? 'back' : code(card);
  const imgSrc = `https://deckofcardsapi.com/static/img/${cardCode}.png`;

  img.src = imgSrc;
  img.alt = card.back ? 'Card back' : `${card.value} of ${card.suit}`;

  img.onload = () => {
    img.style.visibility = 'visible';
    if (onLoad) onLoad(img);
  };

  img.onerror = () => {
    setTimeout(() => {
      const fallbacks = [
        `/cards-api/static/img/${cardCode}.png`,
        `https://raw.githubusercontent.com/hayeah/playing-cards-assets/master/png/${cardCode}.png`,
      ];
      img.src = fallbacks[1];
      img.style.visibility = 'visible';
    }, 500);
  };

  if (selectable) {
    img.classList.add('selectable');
    img.style.touchAction = 'manipulation';
    container.classList.add('selectable-container');
  }

  container.appendChild(img);

  const iconType = getCardIconType(card);
  if (showAbilityIcon && iconType) {
    const iconOverlay = document.createElement('img');
    iconOverlay.src = ICON_PATHS[iconType as keyof typeof ICON_PATHS];
    iconOverlay.className = 'card-ability-icon';
    Object.assign(iconOverlay.style, {
      position: 'absolute', bottom: '5%', left: '5%', width: '37.5%', height: 'auto',
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))', pointerEvents: 'none', zIndex: '2'
    });
    container.appendChild(iconOverlay);
  }

  return container;
}

// --- DOM RECONCILIATION HELPERS ---

function updateOpponentHandStack(handStack: HTMLElement, handCount: number) {
  // Remove any existing badges from handStack or card containers
  const oldBadge = handStack.querySelector('.hand-count-badge');
  if (oldBadge) oldBadge.remove();

  const desiredCards = Math.min(3, handCount);
  const currentCards = handStack.querySelectorAll('.card-container:not(.card-slot--empty)');
  
  if (desiredCards > 0 && handStack.querySelector('.card-slot--empty')) {
    const ph = handStack.querySelector('.card-slot--empty');
    if(ph) ph.remove();
  }

  if (desiredCards === 0 && !handStack.querySelector('.card-slot--empty')) {
    currentCards.forEach(c => c.remove());
    const emptySlot = document.createElement('div');
    emptySlot.className = 'card-container card-slot card-slot--empty';
    emptySlot.innerHTML = '<div class="empty-card-placeholder"></div>';
    handStack.appendChild(emptySlot);
    return;
  }

  if (currentCards.length < desiredCards) {
    for (let i = currentCards.length; i < desiredCards; i++) {
      const backCard: CardType = { back: true, value: 'A', suit: 'hearts' };
      const cardEl = cardImg(backCard, false);
      cardEl.classList.add('stacked-card');
      cardEl.style.position = 'relative'; // Anchor for badge positioning
      handStack.appendChild(cardEl);
    }
  } else if (currentCards.length > desiredCards) {
    for (let i = 0; i < (currentCards.length - desiredCards); i++) {
      currentCards[i].remove();
    }
  }

  // Add badge to the last card container if hand count > 0
  if (handCount > 0 && desiredCards > 0) {
    const cards = handStack.querySelectorAll('.card-container:not(.card-slot--empty)');
    const lastCard = cards[cards.length - 1] as HTMLElement;
    if (lastCard) {
      const badge = document.createElement('div');
      badge.className = 'hand-count-badge';
      badge.textContent = String(handCount);
      if (handCount <= 5) badge.classList.add('badge-safe');
      else if (handCount <= 10) badge.classList.add('badge-warning');
      else badge.classList.add('badge-danger');
      lastCard.appendChild(badge);
    }
  }
}

function updateCenterArea(centerArea: HTMLElement, gameState: GameStateData, visualPileTop?: CardType | null) {
  let centerWrap = centerArea.querySelector('.center-piles');
  if (!centerWrap) {
    centerArea.innerHTML = ''; 
    centerWrap = document.createElement('div');
    centerWrap.className = 'center-piles';
    
    const deckContainer = document.createElement('div');
    deckContainer.className = 'pile-group pile-group--deck';
    const deckNameplate = document.createElement('div');
    deckNameplate.className = 'pile-nameplate';
    deckNameplate.innerHTML = `<span class="pile-name">Deck</span><span class="pile-count">0</span>`;
    const deckStack = document.createElement('div');
    deckStack.className = 'pile-cards deck-stack';
    deckContainer.append(deckNameplate, deckStack);

    const playContainer = document.createElement('div');
    playContainer.className = 'pile-group pile-group--discard';
    playContainer.id = 'discard-pile';
    const playNameplate = document.createElement('div');
    playNameplate.className = 'pile-nameplate';
    playNameplate.innerHTML = `<span class="pile-name">Discard</span><span class="pile-count">0</span>`;
    const playStack = document.createElement('div');
    playStack.className = 'pile-cards play-stack';
    playContainer.append(playNameplate, playStack);

    centerWrap.append(deckContainer, playContainer);
    centerArea.appendChild(centerWrap);
  }

  // --- UPDATE DECK ---
  const deckSize = gameState.deckSize ?? 0;
  const deckContainer = centerWrap.querySelector('.pile-group--deck') as HTMLElement;
  if (deckContainer) {
    const countEl = deckContainer.querySelector('.pile-count');
    if (countEl) countEl.textContent = String(deckSize);

    const deckStack = deckContainer.querySelector('.deck-stack') as HTMLElement;
    if (deckStack) {
      deckStack.classList.remove('deck-full', 'deck-half', 'deck-low');
      if (deckSize > 40) deckStack.classList.add('deck-full');
      else if (deckSize > 20) deckStack.classList.add('deck-half');
      else if (deckSize > 0) deckStack.classList.add('deck-low');

      const hasCard = deckStack.querySelector('.deck-card');
      const hasPlaceholder = deckStack.querySelector('.pile-placeholder');

      if (deckSize > 0 && !hasCard) {
        if(hasPlaceholder) hasPlaceholder.remove();
        const deckBack: CardType = { back: true, value: 'A', suit: 'spades' };
        const deckCard = cardImg(deckBack, false);
        deckCard.classList.add('deck-card');
        deckStack.appendChild(deckCard);
      } else if (deckSize === 0 && !hasPlaceholder) {
        if(hasCard) hasCard.remove();
        const placeholder = document.createElement('div');
        placeholder.className = 'pile-placeholder';
        deckStack.appendChild(placeholder);
      }
    }
  }

  // --- UPDATE PILE ---
  const pile = gameState.pile ?? [];
  const playContainer = centerWrap.querySelector('.pile-group--discard') as HTMLElement;
  if (playContainer) {
    const countEl = playContainer.querySelector('.pile-count');
    if (countEl) countEl.textContent = String(pile.length);

    const playStack = playContainer.querySelector('.play-stack') as HTMLElement;
    if (playStack) {
        if (pile.length > 1) playStack.classList.add('pile-multiple');
        else playStack.classList.remove('pile-multiple');

        const logicalTop = pile.length > 0 ? pile[pile.length - 1] : null;
        const effectiveTopCard = visualPileTop || logicalTop;
        
        let burnedEl = playContainer.querySelector('.pile-burned');
        if (gameState.discardCount > 0) {
            if (!burnedEl) {
                burnedEl = document.createElement('div');
                burnedEl.className = 'pile-burned';
                playContainer.appendChild(burnedEl);
            }
            burnedEl.textContent = `Burned ${gameState.discardCount}`;
        } else if (burnedEl) {
            burnedEl.remove();
        }

        if (!effectiveTopCard) {
            if (!playStack.querySelector('.pile-placeholder')) {
                playStack.innerHTML = '';
                const placeholder = document.createElement('div');
                placeholder.className = 'pile-placeholder';
                playStack.appendChild(placeholder);
            }
        } else {
            const currentTop = playStack.querySelector('#pile-top-card') as HTMLElement;
            let needsUpdate = true;
            
            if (currentTop) {
                const img = currentTop.querySelector('.card-img') as HTMLElement;
                if (img && img.getAttribute('alt')?.includes(`${effectiveTopCard.value} of ${effectiveTopCard.suit}`)) {
                     needsUpdate = false;
                     const hasBadge = currentTop.querySelector('.copied-badge');
                     if (!!effectiveTopCard.copied !== !!hasBadge) needsUpdate = true;
                }
            }

            if (needsUpdate) {
                playStack.innerHTML = '';
                const playCard = cardImg(effectiveTopCard, false, undefined, false);
                playCard.id = 'pile-top-card';
                if (effectiveTopCard.copied) {
                    const badge = document.createElement('div');
                    badge.className = 'copied-badge';
                    badge.textContent = 'COPIED';
                    Object.assign(badge.style, {
                        position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
                        backgroundColor: '#FFD700', color: '#000', padding: '2px 6px',
                        borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)', zIndex: '10', pointerEvents: 'none',
                        whiteSpace: 'nowrap', border: '1px solid #b8860b'
                    });
                    playCard.appendChild(badge);
                }
                playStack.appendChild(playCard);
            }
        }
    }
  }
}

function updateStacks(stackRow: HTMLElement, upCards: (CardType|null)[], downCount: number, isLocal: boolean, isMyTurn: boolean, handCount: number, upCount: number) {
    const maxStackCount = Math.max(upCards.length, downCount);
    
    while (stackRow.children.length < maxStackCount) {
        const col = document.createElement('div');
        col.className = 'stack';
        stackRow.appendChild(col);
    }
    while (stackRow.children.length > maxStackCount) {
        stackRow.lastChild?.remove();
    }

    const children = Array.from(stackRow.children);
    children.forEach((col, i) => {
        const hasDownCard = downCount > i;
        const canPlayDown = isLocal && hasDownCard && isMyTurn && handCount === 0 && upCount === 0;
        let existingDownImg = col.querySelector('.down-card');
        
        if (hasDownCard) {
            if (!existingDownImg) {
                const downCard = cardImg({ value: '', suit: '', back: true } as CardType, canPlayDown);
                const downImg = downCard.querySelector('.card-img') as HTMLElement;
                downImg.classList.add('down-card');
                if (isLocal) {
                    downImg.dataset.idx = String(i);
                    downImg.dataset.zone = 'downCards';
                }
                col.insertBefore(downCard, col.firstChild);
            } else {
                const container = existingDownImg.closest('.card-container');
                if (container) {
                    const img = container.querySelector('img');
                    if (canPlayDown && img && !img.classList.contains('selectable')) {
                        img.classList.add('selectable');
                        container.classList.add('selectable-container');
                    } else if (!canPlayDown && img && img.classList.contains('selectable')) {
                        img.classList.remove('selectable');
                        container.classList.remove('selectable-container');
                    }
                }
            }
        } else {
            if (existingDownImg) existingDownImg.closest('.card-container')?.remove();
        }

        const upCard = upCards[i];
        const canPlayUp = isLocal && Boolean(upCard) && isMyTurn && handCount === 0;
        let existingUpImg = col.querySelector('.up-card') as HTMLImageElement;
        
        if (upCard) {
            const newVal = String(upCard.value);
            if (!existingUpImg || existingUpImg.dataset.value !== newVal) {
                if (existingUpImg) existingUpImg.closest('.card-container')?.remove();
                
                const upCardEl = cardImg(upCard, canPlayUp, undefined, true);
                const upImg = upCardEl.querySelector('.card-img') as HTMLElement;
                upImg.classList.add('up-card');
                if (isLocal) {
                    upImg.dataset.idx = String(i);
                    upImg.dataset.zone = 'upCards';
                    upImg.dataset.value = newVal;
                }
                col.appendChild(upCardEl);
            } else {
                const container = existingUpImg.closest('.card-container');
                if (canPlayUp && !existingUpImg.classList.contains('selectable')) {
                    existingUpImg.classList.add('selectable');
                    container?.classList.add('selectable-container');
                } else if (!canPlayUp && existingUpImg.classList.contains('selectable')) {
                    existingUpImg.classList.remove('selectable');
                    container?.classList.remove('selectable-container');
                }
            }
        } else {
            if (existingUpImg) existingUpImg.closest('.card-container')?.remove();
        }
        
        if (canPlayUp || canPlayDown) col.classList.add('playable-stack');
        else col.classList.remove('playable-stack');
    });
}

function updateHandRow(handRow: HTMLDivElement, cards: CardType[], isMyTurn: boolean) {
  const currentElements = Array.from(handRow.children) as HTMLDivElement[];
  
  if (cards.length === 0) {
    if (currentElements.length !== 1 || !currentElements[0].classList.contains('card-slot--empty')) {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'card-container card-slot card-slot--empty';
      emptySlot.innerHTML = '<div class="empty-card-placeholder"></div>';
      handRow.innerHTML = '';
      handRow.appendChild(emptySlot);
    }
    return;
  }

  if (currentElements.length > 0 && currentElements[0].classList.contains('card-slot--empty')) {
    handRow.innerHTML = '';
    currentElements.length = 0;
  }

  for (let i = 0; i < Math.max(cards.length, currentElements.length); i++) {
    const card = cards[i];
    const el = currentElements[i];

    if (!card) {
      el.remove();
      continue;
    }

    if (!el) {
      const newCardEl = cardImg(card, isMyTurn);
      const imgEl = newCardEl.querySelector('.card-img') as HTMLElement;
      if (imgEl) {
        imgEl.dataset.idx = String(i);
        imgEl.dataset.zone = 'hand';
        imgEl.dataset.value = String(normalizeCardValue(card.value) ?? card.value);
      }
      handRow.appendChild(newCardEl);
      continue;
    }

    const imgEl = el.querySelector('.card-img') as HTMLImageElement;
    if (imgEl) {
      if (isMyTurn && !imgEl.classList.contains('selectable')) {
        imgEl.classList.add('selectable');
        el.classList.add('selectable-container');
      } else if (!isMyTurn && imgEl.classList.contains('selectable')) {
        imgEl.classList.remove('selectable');
        el.classList.remove('selectable-container');
      }

      const currentVal = imgEl.dataset.value;
      const newVal = String(normalizeCardValue(card.value) ?? card.value);
      
      // Update attributes on existing element so clicks work
      imgEl.dataset.idx = String(i);
      imgEl.dataset.zone = 'hand';
      imgEl.dataset.value = newVal;

      if (currentVal !== newVal && !card.back) {
         const newContent = cardImg(card, isMyTurn);
         // FIX: Apply data-zone to replacement element
         const newImg = newContent.querySelector('.card-img') as HTMLElement;
         if (newImg) {
             newImg.dataset.idx = String(i);
             newImg.dataset.zone = 'hand';
             newImg.dataset.value = newVal;
             if (isMyTurn) {
                 newImg.classList.add('selectable');
                 newContent.classList.add('selectable-container');
             }
         }
         handRow.replaceChild(newContent, el);
      }
    }
  }
}

export function renderPlayedCards(cards: CardType[]): void {
  const playStack = document.querySelector('.pile-cards.play-stack');
  if (!playStack || cards.length === 0) return;

  playStack.innerHTML = '';
  const topCard = cards[cards.length - 1];
  const cardEl = cardImg(topCard, false, undefined, false);
  cardEl.id = 'pile-top-card';
  playStack.appendChild(cardEl);
}

export function isValidPlay(cards: CardType[], pile: CardType[]): boolean {
  if (!cards || cards.length === 0) return false;
  const firstValue = normalizeCardValue(cards[0].value);
  if (cards.some((card) => normalizeCardValue(card.value) !== firstValue)) return false;
  if (cards.length >= 4) return true;
  if (!pile || pile.length === 0) return true;
  if (isSpecialCard(firstValue)) return true;
  const playedRank = rank(cards[0]);
  const topPileCard = pile[pile.length - 1];
  const topPileRank = rank(topPileCard);
  return playedRank > topPileRank;
}

function hasValidHandPlay(hand: CardType[], pile: CardType[]): boolean {
  if (!hand || hand.length === 0) return false;
  const groups = new Map<string, CardType[]>();
  for (const card of hand) {
    const key = String(normalizeCardValue(card.value) ?? card.value);
    const existing = groups.get(key);
    if (existing) existing.push(card);
    else groups.set(key, [card]);
  }
  for (const group of groups.values()) {
    if (isValidPlay(group, pile)) return true;
  }
  return false;
}

function hasValidUpPlay(upCards: Array<CardType | null>, pile: CardType[]): boolean {
  if (!upCards || upCards.length === 0) return false;
  return upCards.filter((card): card is CardType => Boolean(card)).some((card) => isValidPlay([card], pile));
}

// --- FIXED COMPRESSION LOGIC (Prevents Flexing) ---
function applyHandCompression(panel: HTMLDivElement, handRow: HTMLDivElement, cardCount: number): void {
  if (cardCount <= 1) {
    if (handRow.classList.contains('hand-row--compressed')) {
        handRow.classList.remove('hand-row--compressed');
        handRow.style.removeProperty('--hand-overlap');
        lastHandCompressed = false;
        lastHandOverlap = 0;
    }
    return;
  }

  const firstCard = handRow.querySelector('.card-container') as HTMLDivElement | null;
  if (!firstCard) return;

  const panelStyles = window.getComputedStyle(panel);
  const paddingLeft = parseFloat(panelStyles.paddingLeft) || 0;
  const paddingRight = parseFloat(panelStyles.paddingRight) || 0;
  const availableWidth = panel.clientWidth - paddingLeft - paddingRight;

  const cardWidth = firstCard.getBoundingClientRect().width;
  if (cardWidth === 0) return; // Not rendered yet

  const cardStyles = window.getComputedStyle(firstCard);
  const marginLeft = parseFloat(cardStyles.marginLeft) || 0;
  const marginRight = parseFloat(cardStyles.marginRight) || 0;
  const cardTotalWidth = cardWidth + marginLeft + marginRight;

  const rowStyles = window.getComputedStyle(handRow);
  const gapValue = rowStyles.gap || rowStyles.columnGap || '0';
  const gap = parseFloat(gapValue) || 0;
  const totalWidth = cardTotalWidth * cardCount + gap * (cardCount - 1);

  if (totalWidth <= availableWidth) {
    if (handRow.classList.contains('hand-row--compressed')) {
        handRow.classList.remove('hand-row--compressed');
        handRow.style.removeProperty('--hand-overlap');
    }
    return;
  }

  let overlap = (availableWidth - cardTotalWidth * cardCount) / (cardCount - 1) - gap;
  if (overlap > 0) overlap = 0;
  
  const minOverlap = -cardTotalWidth * 0.9;
  if (overlap < minOverlap) overlap = minOverlap;

  // IMPORTANT: Only touch the DOM if values changed significantly
  const currentOverlap = parseFloat(handRow.style.getPropertyValue('--hand-overlap')) || 0;
  if (!handRow.classList.contains('hand-row--compressed') || Math.abs(currentOverlap - overlap) > 0.5) {
      handRow.classList.add('hand-row--compressed');
      handRow.style.setProperty('--hand-overlap', `${overlap}px`);
      // Update module memory for next render's cache
      lastHandCompressed = true;
      lastHandOverlap = overlap;
  }
}

export function animatePlayerPlay(cardElement: HTMLElement): void {
  const pileEl = document.getElementById('pile-top-card') || document.getElementById('discard-pile');
  if (!pileEl || !cardElement) return;

  const animationTask = new Promise<void>((resolve) => {
    const startRect = cardElement.getBoundingClientRect();
    const endRect = pileEl.getBoundingClientRect();

    const flyer = cardElement.cloneNode(true) as HTMLElement;
    flyer.classList.remove('selected', 'selectable', 'selected-container');
    flyer.classList.add('flying-card-ghost');
    
    const img = flyer.querySelector('img');
    if (img) img.style.visibility = 'visible';

    Object.assign(flyer.style, {
      position: 'fixed',
      top: `${startRect.top}px`,
      left: `${startRect.left}px`,
      width: `${startRect.width}px`,
      height: `${startRect.height}px`,
      zIndex: '1000',
      margin: '0',
      pointerEvents: 'none',
      transition: 'none',
      opacity: '1'
    });

    document.body.appendChild(flyer);

    const deltaX = (endRect.left + endRect.width / 2) - (startRect.left + startRect.width / 2);
    const deltaY = (endRect.top + endRect.height / 2) - (startRect.top + startRect.height / 2);

    const animation = flyer.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
      { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.6) rotate(10deg)` }
    ], {
      duration: 450,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      fill: 'forwards'
    });

    animation.onfinish = () => {
      flyer.remove();
      resolve();
    };
  });

  activeFlyPromise = animationTask;
  animationTask.then(() => {
    if (activeFlyPromise === animationTask) activeFlyPromise = null;
  });
}

export function animateCardFromPlayer(
  playerId: string, 
  playedCards?: CardType[]
): Promise<void> {
  const animationTask = new Promise<void>((resolve) => {
    const pileEl = document.getElementById('pile-top-card') || document.getElementById('discard-pile');
    const playerArea = document.querySelector(`.player-area[data-player-id="${playerId}"]`);

    if (!pileEl || !playerArea) {
      resolve();
      return;
    }

    let sourceEl: HTMLElement | null = null;
    
    if (playedCards && playedCards.length > 0) {
      const topVal = playedCards[playedCards.length - 1].value;
      const upCards = playerArea.querySelectorAll('.up-card');
      upCards.forEach((img) => {
        if ((img as HTMLElement).dataset.value == String(topVal)) {
          sourceEl = img.closest('.card-container');
        }
      });
    }

    if (!sourceEl) {
      sourceEl = playerArea.querySelector('.hand-stack .card-container');
    }
    
    if (!sourceEl) {
      sourceEl = playerArea.querySelector('.hand-row .card-container');
    }
    
    if (!sourceEl) {
      sourceEl = playerArea.querySelector('.player-avatar');
    }

    if (!sourceEl) {
      resolve();
      return;
    }

    const startRect = sourceEl.getBoundingClientRect();
    const endRect = pileEl.getBoundingClientRect();

    const flyer = sourceEl.cloneNode(true) as HTMLElement;
    flyer.classList.remove('selected', 'selectable', 'selected-container');
    flyer.classList.add('flying-card-ghost');
    
    flyer.style.opacity = '1';
    const img = flyer.querySelector('img');
    if (img) img.style.visibility = 'visible';

    Object.assign(flyer.style, {
      position: 'fixed',
      top: `${startRect.top}px`,
      left: `${startRect.left}px`,
      width: `${startRect.width}px`,
      height: `${startRect.height}px`,
      zIndex: '1000',
      pointerEvents: 'none',
      transition: 'none',
      margin: '0'
    });

    document.body.appendChild(flyer);

    const deltaX = (endRect.left + endRect.width / 2) - (startRect.left + startRect.width / 2);
    const deltaY = (endRect.top + endRect.height / 2) - (startRect.top + startRect.height / 2);

    const animation = flyer.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
      { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.6) rotate(15deg)` }
    ], {
      duration: 500,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      fill: 'forwards'
    });

    animation.onfinish = () => {
      flyer.remove();
      resolve();
    };
  });

  activeFlyPromise = animationTask;
  animationTask.then(() => {
    if (activeFlyPromise === animationTask) activeFlyPromise = null;
  });

  return animationTask;
}

export function showCardEvent(
  cardValue: number | string | null,
  type: string,
  targetPlayerId?: string
): void {
  console.log('[showCardEvent] Starting - type:', type, 'value:', cardValue);
  let retries = 0;
  function tryRunEffect() {
    let discardImg = document.getElementById('pile-top-card') as HTMLImageElement | null;
    const discardContainer = document.getElementById('discard-pile');

    if (!discardImg || discardImg.style.display === 'none') {
      discardImg = document.querySelector('.discard .card-img') as HTMLImageElement | null;
    }

    const target = (discardImg && discardImg.style.display !== 'none') ? discardImg : discardContainer;

    if (!target && retries < 5) {
      retries++;
      setTimeout(tryRunEffect, 100);
      return;
    }
    if (!target) return;

    function runEffect(effectTarget: HTMLElement) {
      const parentElement = effectTarget instanceof HTMLImageElement ? effectTarget.parentElement : effectTarget;
      if (!parentElement) return;

      const prev = parentElement.querySelector('.special-icon');
      if (prev) prev.remove();
      
      const icon = document.createElement('img');
      icon.className = 'special-icon';

      let src = '';
      if (type === 'two') src = ICON_PATHS.two;
      else if (type === 'five') src = ICON_PATHS.five;
      else if (type === 'ten') src = ICON_PATHS.ten;
      else if (type === 'invalid') src = ICON_PATHS.invalid;
      else if (type === 'take') src = ICON_PATHS.take;
      else if (type === 'regular') return;

      icon.src = src;
      icon.onerror = () => { icon.remove(); }; 
      
      Object.assign(icon.style, {
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '70px', height: '70px', zIndex: '100', pointerEvents: 'none',
          opacity: '0.85', filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.35))',
          animation: 'iconPulse 1.5s ease-in-out', display: 'block'
      });
      
      let iconColor = '#ffffff';
      if (type === 'two') iconColor = '#3b82f6';
      else if (type === 'five') iconColor = '#10b981';
      else if (type === 'ten') iconColor = '#ef4444';
      else if (type === 'invalid') iconColor = '#dc2626';
      icon.style.color = iconColor;

      if (getComputedStyle(parentElement).position === 'static') {
        parentElement.style.position = 'relative';
      }
      parentElement.appendChild(icon);
      
      if (type === 'take' && targetPlayerId) {
        animatePileToPlayer(targetPlayerId);
      }
      
      setTimeout(() => {
        icon.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        icon.style.opacity = '0';
        icon.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => icon.remove(), 500);
      }, 1800);
    }
    if (target instanceof HTMLImageElement && !target.complete) {
      target.addEventListener('load', () => runEffect(target), { once: true });
    } else {
      runEffect(target);
    }
  }
  tryRunEffect();
}

function animatePileToPlayer(targetPlayerId: string): void {
  const pileEl = document.getElementById('pile-top-card') || document.getElementById('discard-pile');
  const targetEl = document.querySelector(`.player-area[data-player-id="${targetPlayerId}"] .player-avatar`);

  if (!pileEl || !targetEl) return;

  const startRect = pileEl.getBoundingClientRect();
  const endRect = targetEl.getBoundingClientRect();

  const flyer = document.createElement('div');
  flyer.classList.add('flying-card');
  flyer.style.left = `${startRect.left}px`;
  flyer.style.top = `${startRect.top}px`;
  
  document.body.appendChild(flyer);

  const deltaX = (endRect.left + endRect.width / 2) - (startRect.left + startRect.width / 2);
  const deltaY = (endRect.top + endRect.height / 2) - (startRect.top + startRect.height / 2);

  const animation = flyer.animate([
    { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
    { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.4) rotate(360deg)`, opacity: 0.5 }
  ], {
    duration: 600,
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    fill: 'forwards'
  });

  animation.onfinish = () => {
    flyer.remove();
  };
}

export function renderGameState(
  gameState: GameStateData,
  localPlayerId: string | null,
  visualPileTop?: CardType | null
): void {
  if (!gameState?.started) {
    lastLocalHandCount = -1;
    lastLocalHandCards = [];
  }
  
  // --- HYBRID CAPTURE START ---
  let cachedOverlap = '';
  let cachedCompressed = false;
  
  // 1. Try DOM first (most accurate for current state)
  const existingLocalHand = document.querySelector('#my-area .hand-row') as HTMLElement;
  if (existingLocalHand) {
    cachedOverlap = existingLocalHand.style.getPropertyValue('--hand-overlap');
    cachedCompressed = existingLocalHand.classList.contains('hand-row--compressed');
  }

  // 2. Fallback to Module Memory if DOM failed
  // (Fixes the "rapid update" race condition)
  if (!cachedOverlap && lastHandCompressed) {
     cachedOverlap = `${lastHandOverlap}px`;
     cachedCompressed = true;
  }
  // --- HYBRID CAPTURE END ---
  
  const table = document.querySelector('#game-table .table') as HTMLElement | null;
  const slotTop = document.getElementById(
    'opponent-area-top'
  ) as HTMLElement | null;
  const slotBottom = document.getElementById(
    'player-area-bottom'
  ) as HTMLElement | null;
  const slotLeft = document.getElementById(
    'opponent-area-left'
  ) as HTMLElement | null;
  const slotRight = document.getElementById(
    'opponent-area-right'
  ) as HTMLElement | null;
  const centerArea = document.getElementById('center-area') as HTMLElement | null;

  if (!gameState || !gameState.players) {
    if (table) {
      table.removeAttribute('data-player-count');
    }
    // Only wipe if critical data missing
    if (table) table.innerHTML = '';
    return;
  }

  // --- CENTER AREA UPDATE (Smart) ---
  if (centerArea) {
    updateCenterArea(centerArea, gameState, visualPileTop);
  }

  const players = gameState.players;
  if (table) table.dataset.playerCount = String(players.length);
  
  const meIdx = localPlayerId ? players.findIndex((p) => p.id === localPlayerId) : -1;
  const rotatedPlayers = meIdx >= 0
      ? players.slice(meIdx).concat(players.slice(0, meIdx))
      : players.slice();

  let currentSeatOrder: string[] = [];
  if (players.length === 2) currentSeatOrder = ['bottom', 'top'];
  else if (players.length === 3) currentSeatOrder = ['bottom', 'left', 'top'];
  else currentSeatOrder = ['bottom', 'left', 'top', 'right'];

  currentSeatOrder.forEach((seat, idx) => {
    const player = rotatedPlayers[idx];
    if (!player) return;

    const isLocalPlayer = player.id === localPlayerId;
    const isMyTurn = isLocalPlayer && player.id === gameState.currentPlayerId;
    const handCount = player.handCount ?? player.hand?.length ?? 0;
    const upCount = player.upCount ?? (player.upCards ? player.upCards.filter(Boolean).length : 0);
    const downCount = player.downCount ?? player.downCards?.length ?? 0;
    const shouldDimTable = handCount > 0;
    const isForcedDown = isLocalPlayer && isMyTurn && handCount === 0 && upCount === 0 && downCount > 0;

    let slotTarget: HTMLElement | null = null;
    if (seat === 'bottom') slotTarget = slotBottom;
    else if (seat === 'top') slotTarget = slotTop;
    else if (seat === 'left') slotTarget = slotLeft;
    else if (seat === 'right') slotTarget = slotRight;

    if (!slotTarget) return;

    // --- PANEL RECONCILIATION ---
    let panel = slotTarget.querySelector('.player-area') as HTMLDivElement;
    
    // 1. CREATE PANEL IF MISSING (First run)
    if (!panel) {
        panel = document.createElement('div');
        panel.className = 'player-area seat classic-theme';
        if (isLocalPlayer) {
            panel.id = 'my-area';
            panel.classList.add('is-local');
        }
        
        const header = document.createElement('div');
        header.className = 'player-header';
        header.innerHTML = `
            <div class="player-ident">
                <div class="player-avatar"><img src="" alt="avatar"></div>
                <div class="player-meta">
                    <div class="player-name"></div>
                    <div class="player-tags"></div>
                </div>
            </div>`;
        panel.appendChild(header);

        const handZone = document.createElement('div');
        handZone.className = 'player-zone player-zone--hand';
        if (isLocalPlayer) handZone.classList.add('player-zone--hand-local');
        handZone.innerHTML = `
            <div class="zone-label">Hand</div>
            <div class="hand-tray ${isLocalPlayer ? 'hand-tray--local' : ''}">
                <div class="hand-row ${isLocalPlayer ? 'hand-row--local' : 'hand-row--opponent'}"></div>
            </div>`;
        panel.appendChild(handZone);

        if (seat === 'bottom' && isLocalPlayer) {
            const actionRow = document.createElement('div');
            actionRow.className = 'player-actions';
            actionRow.innerHTML = `
                <button id="play-button" class="action-button action-button--play" disabled>Play</button>
                <button id="take-button" class="action-button action-button--take" disabled>Take</button>
            `;
            panel.appendChild(actionRow);
        }

        const tableZone = document.createElement('div');
        tableZone.className = 'player-zone player-zone--table';
        tableZone.innerHTML = `
            <div class="card-zone--tabled">
                <div class="zone-label">Up / Down</div>
                <div class="stack-row"></div>
            </div>`;
        panel.appendChild(tableZone);

        slotTarget.appendChild(panel);
    }

    // 2. UPDATE ATTRIBUTES
    panel.dataset.playerId = player.id;
    panel.dataset.seat = seat;
    panel.style.setProperty('--seat-accent', seatAccents[seat] ?? '#f6c556');
    
    if (player.isComputer) panel.classList.add('computer-player');
    else panel.classList.remove('computer-player');
    
    if (player.disconnected) panel.classList.add('disconnected');
    else panel.classList.remove('disconnected');

    // 3. UPDATE HEADER
    const nameEl = panel.querySelector('.player-name');
    if (nameEl) nameEl.textContent = player.name || player.id;
    
    const avatar = panel.querySelector('.player-avatar');
    if (avatar) {
        if (player.id === gameState.currentPlayerId) avatar.classList.add('active-turn');
        else avatar.classList.remove('active-turn');
        const img = avatar.querySelector('img');
        if (img) img.src = player.isComputer ? robotAvatarUrl : playerAvatarUrl;
    }

    // 4. UPDATE HAND
    const handRow = panel.querySelector('.hand-row') as HTMLDivElement;
    if (handRow) {
        if (isLocalPlayer) {
            // Apply cached compression ONCE before updates
            if (cachedCompressed && cachedOverlap && handCount > 1) {
              handRow.classList.add('hand-row--compressed');
              handRow.style.setProperty('--hand-overlap', cachedOverlap);
            }
            
            if (suppressNextHandAnimation || handCount === lastLocalHandCount) {
                handRow.classList.add('no-animate');
            } else {
                handRow.classList.remove('no-animate');
            }
            if (handCount < lastLocalHandCount && lastLocalHandCount !== -1) {
                suppressNextHandAnimation = false;
            }
            
            const handCountChanged = handCount !== lastLocalHandCount;
            lastLocalHandCount = handCount;

            // USE RECONCILIATION FOR HAND
            updateHandRow(handRow, player.hand ?? [], isMyTurn);
            
            // Only recalculate compression if hand count changed
            if (handCountChanged) {
                requestAnimationFrame(() => applyHandCompression(panel, handRow, handCount));
            }
        } else {
            // OPPONENT
            updateOpponentHandStack(handRow, handCount);
        }
    }

    // 5. UPDATE TABLE STACKS
    const stackRow = panel.querySelector('.stack-row') as HTMLElement;
    if (stackRow) {
        if (shouldDimTable) stackRow.classList.add('dimmed-stacks');
        else stackRow.classList.remove('dimmed-stacks');
        
        if (isForcedDown) stackRow.classList.add('forced-down');
        else stackRow.classList.remove('forced-down');

        updateStacks(stackRow, player.upCards ?? [], downCount, isLocalPlayer, isMyTurn, handCount, upCount);
    }

    // 6. UPDATE BUTTONS (Local)
    if (isLocalPlayer) {
        const playButton = panel.querySelector('#play-button') as HTMLButtonElement;
        const takeButton = panel.querySelector('#take-button') as HTMLButtonElement;
        
        if (playButton) playButton.disabled = !isMyTurn;
        if (takeButton) {
           let hasPlayable = false;
           if (handCount > 0) hasPlayable = hasValidHandPlay(player.hand ?? [], gameState.pile ?? []);
           else if (upCount > 0) hasPlayable = hasValidUpPlay(player.upCards ?? [], gameState.pile ?? []);
           
           const requiredZone = handCount > 0 ? 'hand' : upCount > 0 ? 'upCards' : downCount > 0 ? 'downCards' : null;
           takeButton.disabled = !isMyTurn || requiredZone === null || requiredZone === 'downCards' || hasPlayable;
        }
    }
  });

  // Ensure Branding/Rules (One-time)
  if (table) {
      if (!table.querySelector('#table-rules-button')) {
        const rulesButton = document.createElement('button');
        rulesButton.id = 'table-rules-button';
        rulesButton.className = 'action-button action-button--rules';
        rulesButton.textContent = 'Rules';
        rulesButton.onclick = () => document.dispatchEvent(new CustomEvent('open-rules-modal'));
        table.appendChild(rulesButton);
      }
      if (!table.querySelector('#table-branding')) {
        const branding = document.createElement('div');
        branding.id = 'table-branding';
        branding.innerHTML = `
          <svg class="branding-crown" viewBox="0 0 32 32">
            <path d="M4 22L6 12L11 16L16 8L21 16L26 12L28 22H4Z" fill="#ffd700" stroke="#b8860b" stroke-width="1.5" stroke-linejoin="round"/>
            <circle cx="6" cy="12" r="2" fill="#ffd700" stroke="#b8860b" stroke-width="1"/>
            <circle cx="16" cy="8" r="2.5" fill="#ffd700" stroke="#b8860b" stroke-width="1"/>
            <circle cx="26" cy="12" r="2" fill="#ffd700" stroke="#b8860b" stroke-width="1"/>
            <rect x="4" y="22" width="24" height="4" rx="1" fill="#ffd700" stroke="#b8860b" stroke-width="1"/>
            <path d="M10 24H22" stroke="#b8860b" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <div class="branding-title">Top That!</div>
          <div class="branding-slogan">One Crown. Zero Mercy.</div>
        `;
        table.appendChild(branding);
      }
  }
}

export function playArea() {}
export function lobbyLink() {}