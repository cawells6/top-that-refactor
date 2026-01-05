import {
  Card as CardType,
  GameStateData,
} from '../../src/shared/types.js';
import {
  normalizeCardValue,
  rank,
  isSpecialCard,
} from '../../utils/cardUtils.js';

// --- PRELOAD LOGIC START ---
const ICON_PATHS = {
  two: '/src/shared/Reset-icon.png',
  five: '/src/shared/Copy-icon.png',
  ten: '/src/shared/Burn-icon.png',
  invalid: '/src/shared/invalid play-icon.png',
  take: '/src/shared/take pile-icon.png',
};

// Preload images immediately when this module loads
function preloadIcons() {
  console.log('[Assets] Preloading special card icons...');
  Object.values(ICON_PATHS).forEach((src) => {
    const img = new Image();
    img.src = src;
    // We don't need to attach them to DOM, just loading them caches them
  });
}
preloadIcons();
// --- PRELOAD LOGIC END ---

// Track active card flight animations
let activeFlyPromise: Promise<void> | null = null;

/**
 * Returns a promise that resolves when the current card flight (if any) is finished.
 */
export function waitForFlyingCard(): Promise<void> {
  return activeFlyPromise || Promise.resolve();
}

let lastLocalHandCount = -1;
let suppressNextHandAnimation = false;

// Cache compression values to prevent hand flexing
let lastHandOverlap = 0;
let lastHandCompressed = false;

/**
 * Reset hand tracking to prevent animation issues when taking pile
 */
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


// Helper to map card values to icon types
function getCardIconType(card: CardType): string | null {
  if (card.back) return null;
  
  const val = String(card.value);
  if (val === '2') return 'two';
  if (val === '5') return 'five';
  if (val === '10') return 'ten';
  
  return null;
}

// Convert {value:'A',suit:'hearts'} → "AH", 10→"0"
export function code(card: CardType): string {
  if (card.value == null || card.suit == null) {
    // Simplified null/undefined check
    return 'ERR';
  }
  const v =
    String(card.value).toUpperCase() === '10'
      ? '0'
      : String(card.value).toUpperCase();
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
  // [REMOVED NOISY LOGS]

  // Try using direct URLs instead of the proxy
  const imgSrc = `https://deckofcardsapi.com/static/img/${cardCode}.png`;
  // [REMOVED NOISY LOGS]

  img.src = imgSrc;
  img.alt = card.back ? 'Card back' : `${card.value} of ${card.suit}`;

  // Set up onload and error handling
  img.onload = () => {
    img.style.visibility = 'visible';
    // [REMOVED NOISY LOGS]
    if (onLoad) onLoad(img);
  };

  // Improved error handling with retry
  img.onerror = () => {
    console.error(`⚠️ Failed to load card image: ${img.src}`);

    // Try an alternative URL with slight delay
    setTimeout(() => {
      // Try different source paths as fallback
      const fallbacks = [
        `/cards-api/static/img/${cardCode}.png`, // Try proxy
        `https://raw.githubusercontent.com/hayeah/playing-cards-assets/master/png/${cardCode}.png`, // GitHub hosted fallback
      ];

      // If we've already tried all fallbacks, show a placeholder
      const currentSrcIndex = fallbacks.indexOf(img.src);

      if (currentSrcIndex < fallbacks.length - 1) {
        console.log(
          `🔄 Trying alternative source: ${fallbacks[currentSrcIndex + 1]}`
        );
        img.src = fallbacks[currentSrcIndex + 1];
      } else {
        // Create a fallback visual representation
        console.warn(
          `⚠️ All image sources failed for ${cardCode}, using fallback`
        );
        img.style.visibility = 'visible';
        container.style.border = '1px solid #ccc';
        container.style.borderRadius = '8px';
        container.style.backgroundColor = card.back ? '#0f1f19' : 'white';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.flexDirection = 'column';
        container.style.padding = '5px';

        // Display the value and suit as text
        if (!card.back) {
          const valueDisplay = document.createElement('div');
          valueDisplay.style.fontSize = '18px';
          valueDisplay.style.fontWeight = 'bold';
          valueDisplay.style.color =
            card.suit === 'hearts' || card.suit === 'diamonds'
              ? 'red'
              : 'black';
          valueDisplay.textContent = String(card.value);

          const suitDisplay = document.createElement('div');
          suitDisplay.style.fontSize = '24px';
          suitDisplay.style.color =
            card.suit === 'hearts' || card.suit === 'diamonds'
              ? 'red'
              : 'black';
          const suitMap: Record<string, string> = {
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣',
            spades: '♠',
          };
          suitDisplay.textContent =
            suitMap[card.suit as keyof typeof suitMap] || '';

          container.appendChild(valueDisplay);
          container.appendChild(suitDisplay);
        } else {
          // For card backs
          container.textContent = 'BACK';
          container.style.fontSize = '18px';
          container.style.fontWeight = 'bold';
          container.style.color = '#fef7e0';
        }

        if (onLoad) onLoad(img);
      }
    }, 500); // Delay retry to avoid rapid retries
  };

  if (selectable) {
    img.classList.add('selectable');
    img.style.touchAction = 'manipulation';
    container.classList.add('selectable-container');
  }

  container.appendChild(img);

  // Add Special Icon Overlay (only if requested, e.g., in hand)
  const iconType = getCardIconType(card);
  if (showAbilityIcon && iconType) {
    const iconOverlay = document.createElement('img');
    iconOverlay.src = ICON_PATHS[iconType as keyof typeof ICON_PATHS];
    iconOverlay.className = 'card-ability-icon';
    
    Object.assign(iconOverlay.style, {
      position: 'absolute',
      bottom: '5%',
      left: '5%',
      width: '37.5%',
      height: 'auto',
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
      pointerEvents: 'none',
      zIndex: '2'
    });
    
    container.appendChild(iconOverlay);
  }

  return container;
}

/**
 * Renders played cards immediately to the pile.
 * Used to show the card before a special effect (burn/copy) might remove/cover it.
 * Matches the normal rendering: only shows the top card of what was played.
 */
export function renderPlayedCards(cards: CardType[]): void {
  const playStack = document.querySelector('.pile-cards.play-stack');
  console.log('[renderPlayedCards] playStack exists?', !!playStack, 'cards:', cards);
  if (!playStack || cards.length === 0) return;

  // Clear existing pile display
  playStack.innerHTML = '';

  // Show only the top (last) card that was played, just like normal rendering
  const topCard = cards[cards.length - 1];
  const cardEl = cardImg(topCard, false, undefined, false);
  cardEl.id = 'pile-top-card';
  playStack.appendChild(cardEl);
  console.log('[renderPlayedCards] Added card with id=pile-top-card', topCard);
}

export function isValidPlay(cards: CardType[], pile: CardType[]): boolean {
  console.log('--- isValidPlay Check ---');
  console.log(
    'Cards to play:',
    cards.map((c) => c.value)
  );
  console.log('Top of pile:', pile.length > 0 ? pile[pile.length - 1] : 'empty');

  if (!cards || cards.length === 0) {
    console.log('Result: false (no cards)');
    return false;
  }

  const firstValue = normalizeCardValue(cards[0].value);
  if (cards.some((card) => normalizeCardValue(card.value) !== firstValue)) {
    console.log('Result: false (not same value)');
    return false;
  }

  if (cards.length >= 4) {
    console.log('Result: true (bomb)');
    return true;
  }

  if (!pile || pile.length === 0) {
    console.log('Result: true (empty pile)');
    return true;
  }

  if (isSpecialCard(firstValue)) {
    console.log('Result: true (special card played)');
    return true;
  }

  const playedRank = rank(cards[0]);
  const topPileCard = pile[pile.length - 1];
  const topPileRank = rank(topPileCard);

  const result = playedRank > topPileRank;
  console.log(
    `Played rank: ${playedRank}, Pile rank: ${topPileRank}, Result: ${result}`
  );
  console.log('-------------------------');
  return result;
}

function hasValidHandPlay(hand: CardType[], pile: CardType[]): boolean {
  if (!hand || hand.length === 0) {
    return false;
  }

  const groups = new Map<string, CardType[]>();
  for (const card of hand) {
    const key = String(normalizeCardValue(card.value) ?? card.value);
    const existing = groups.get(key);
    if (existing) {
      existing.push(card);
    } else {
      groups.set(key, [card]);
    }
  }

  for (const group of groups.values()) {
    if (isValidPlay(group, pile)) {
      return true;
    }
  }

  return false;
}

function hasValidUpPlay(
  upCards: Array<CardType | null>,
  pile: CardType[]
): boolean {
  if (!upCards || upCards.length === 0) {
    return false;
  }

  return upCards
    .filter((card) => Boolean(card))
    .some((card) => isValidPlay([card], pile));
}

function applyHandCompression(
  panel: HTMLDivElement,
  handRow: HTMLDivElement,
  cardCount: number
): void {
  if (cardCount <= 1) {
    handRow.classList.remove('hand-row--compressed');
    handRow.style.removeProperty('--hand-overlap');
    lastHandCompressed = false;
    return;
  }

  const firstCard = handRow.querySelector(
    '.card-container'
  ) as HTMLDivElement | null;
  if (!firstCard) {
    lastHandCompressed = false;
    return;
  }

  const panelStyles = window.getComputedStyle(panel);
  const paddingLeft = parseFloat(panelStyles.paddingLeft) || 0;
  const paddingRight = parseFloat(panelStyles.paddingRight) || 0;
  const availableWidth = panel.clientWidth - paddingLeft - paddingRight;
  if (availableWidth <= 0) {
    lastHandCompressed = false;
    return;
  }

  const cardWidth = firstCard.getBoundingClientRect().width;
  if (cardWidth <= 0) {
    lastHandCompressed = false;
    return;
  }
  const cardStyles = window.getComputedStyle(firstCard);
  const marginLeft = parseFloat(cardStyles.marginLeft) || 0;
  const marginRight = parseFloat(cardStyles.marginRight) || 0;
  const cardTotalWidth = cardWidth + marginLeft + marginRight;

  const rowStyles = window.getComputedStyle(handRow);
  const gapValue = rowStyles.gap || rowStyles.columnGap || '0';
  const gap = parseFloat(gapValue) || 0;
  const totalWidth = cardTotalWidth * cardCount + gap * (cardCount - 1);

  if (totalWidth <= availableWidth) {
    handRow.classList.remove('hand-row--compressed');
    handRow.style.removeProperty('--hand-overlap');
    lastHandCompressed = false;
    return;
  }

  let overlap =
    (availableWidth - cardTotalWidth * cardCount) / (cardCount - 1) - gap;
  if (overlap > 0) {
    overlap = 0;
  }
  const minOverlap = -cardTotalWidth * 0.9;
  if (overlap < minOverlap) {
    overlap = minOverlap;
  }

  lastHandOverlap = overlap;
  lastHandCompressed = true;

  handRow.classList.add('hand-row--compressed');
  handRow.style.setProperty('--hand-overlap', `${overlap}px`);
}

/**
 * Animates a card flying from a player's hand to the discard pile.
 * Creates a visual "ghost" so the original can be hidden immediately.
 */
export function animatePlayerPlay(cardElement: HTMLElement): void {
  const pileEl = document.getElementById('pile-top-card') || document.getElementById('discard-pile');
  if (!pileEl || !cardElement) return;

  // Wrap animation in a promise for tracking
  const animationTask = new Promise<void>((resolve) => {
    const startRect = cardElement.getBoundingClientRect();
    const endRect = pileEl.getBoundingClientRect();

    // Create flying ghost
    const flyer = cardElement.cloneNode(true) as HTMLElement;
    
    // Clean up classes for the ghost so it doesn't look "selected"
    flyer.classList.remove('selected', 'selectable', 'selected-container');
    flyer.classList.add('flying-card-ghost');
    
    // Find the image inside and ensure it's visible
    const img = flyer.querySelector('img');
    if (img) img.style.visibility = 'visible';

    // Position explicitly fixed to viewport
    Object.assign(flyer.style, {
      position: 'fixed',
      top: `${startRect.top}px`,
      left: `${startRect.left}px`,
      width: `${startRect.width}px`,
      height: `${startRect.height}px`,
      zIndex: '1000',
      margin: '0',
      pointerEvents: 'none',
      transition: 'none', // Disable CSS transitions so we can control it via API
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
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', // Snappy ease-out
      fill: 'forwards'
    });

    animation.onfinish = () => {
      flyer.remove();
      resolve();
    };
  });

  // Track this promise
  activeFlyPromise = animationTask;
  animationTask.then(() => {
    if (activeFlyPromise === animationTask) activeFlyPromise = null;
  });
}

/**
 * ANIMATION: Fly a card from a specific player to the discard pile.
 * Returns a Promise that resolves when the animation finishes.
 */
export function animateCardFromPlayer(
  playerId: string, 
  playedCards?: CardType[]
): Promise<void> {
  // Create the animation promise
  const animationTask = new Promise<void>((resolve) => {
    const pileEl = document.getElementById('pile-top-card') || document.getElementById('discard-pile');
    const playerArea = document.querySelector(`.player-area[data-player-id="${playerId}"]`);

    if (!pileEl || !playerArea) {
      resolve();
      return;
    }

    // 1. DETERMINE SOURCE ELEMENT
    let sourceEl: HTMLElement | null = null;
    
    // Strategy: Try to find the specific card first (for Up/Table plays)
    if (playedCards && playedCards.length > 0) {
      const topVal = playedCards[playedCards.length - 1].value;
      // Look in Up Cards for a match
      const upCards = playerArea.querySelectorAll('.up-card');
      upCards.forEach((img) => {
        if ((img as HTMLElement).dataset.value == String(topVal)) {
          sourceEl = img.closest('.card-container');
        }
      });
    }

    // Fallback 1: Hand Stack (Visual representation of opponent hand)
    if (!sourceEl) {
      sourceEl = playerArea.querySelector('.hand-stack .card-container');
    }
    
    // Fallback 2: Any card in hand row (for unexpected cases)
    if (!sourceEl) {
      sourceEl = playerArea.querySelector('.hand-row .card-container');
    }
    
    // Fallback 3: The Player Avatar (Absolute worst case, "throws" from body)
    if (!sourceEl) {
      sourceEl = playerArea.querySelector('.player-avatar');
    }

    if (!sourceEl) {
      resolve();
      return;
    }

    // 2. PERFORM ANIMATION
    const startRect = sourceEl.getBoundingClientRect();
    const endRect = pileEl.getBoundingClientRect();

    // Create ghost
    const flyer = sourceEl.cloneNode(true) as HTMLElement;
    flyer.classList.remove('selected', 'selectable', 'selected-container');
    flyer.classList.add('flying-card-ghost');
    
    // Ensure it's visible (in case we cloned a hidden/optimistic element)
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
      resolve(); // Resolve the promise so socketService can proceed
    };
  });

  // Track this promise
  activeFlyPromise = animationTask;
  // Clear it when done so we don't block future non-animated events
  animationTask.then(() => {
    if (activeFlyPromise === animationTask) activeFlyPromise = null;
  });

  return animationTask;
}

function updateHandRow(
  handRow: HTMLDivElement,
  cards: CardType[],
  isMyTurn: boolean
): void {
  let currentElements = Array.from(handRow.children) as HTMLDivElement[];

  if (cards.length === 0) {
    if (
      currentElements.length !== 1 ||
      !currentElements[0].classList.contains('card-slot--empty')
    ) {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'card-container card-slot card-slot--empty';
      emptySlot.innerHTML = '<div class="empty-card-placeholder"></div>';
      handRow.innerHTML = '';
      handRow.appendChild(emptySlot);
    }
    return;
  }

  if (
    currentElements.length > 0 &&
    currentElements[0].classList.contains('card-slot--empty')
  ) {
    handRow.innerHTML = '';
    currentElements = [];
  }

  const maxLength = Math.max(cards.length, currentElements.length);
  for (let i = 0; i < maxLength; i++) {
    const card = cards[i];
    const existing = currentElements[i];

    if (!card) {
      if (existing) existing.remove();
      continue;
    }

    if (!existing) {
      const newCardEl = cardImg(card, isMyTurn);
      const imgEl = newCardEl.querySelector('.card-img') as HTMLElement | null;
      if (imgEl) {
        imgEl.dataset.idx = String(i);
        imgEl.dataset.zone = 'hand';
        imgEl.dataset.value = String(
          normalizeCardValue(card.value) ?? card.value
        );
      }
      handRow.appendChild(newCardEl);
      continue;
    }

    const imgEl = existing.querySelector('.card-img') as HTMLImageElement | null;
    if (!imgEl) {
      continue;
    }

    if (isMyTurn) {
      imgEl.classList.add('selectable');
      existing.classList.add('selectable-container');
    } else {
      imgEl.classList.remove('selectable');
      existing.classList.remove('selectable-container');
    }

    const newValue = String(
      normalizeCardValue(card.value) ?? card.value
    );
    const currentValue = imgEl.dataset.value;

    imgEl.dataset.idx = String(i);
    imgEl.dataset.zone = 'hand';
    imgEl.dataset.value = newValue;

    if (!card.back && currentValue !== newValue) {
      const replacement = cardImg(card, isMyTurn);
      const replacementImg = replacement.querySelector('.card-img') as HTMLElement | null;
      if (replacementImg) {
        replacementImg.dataset.idx = String(i);
        replacementImg.dataset.zone = 'hand';
        replacementImg.dataset.value = newValue;
      }
      handRow.replaceChild(replacement, existing);
    }
  }
}

function updateTableStacks(
  stackRow: HTMLDivElement,
  upCards: Array<CardType | null>,
  downCount: number,
  isMyTurn: boolean,
  handCount: number,
  upCount: number,
  isLocal: boolean,
  isForcedDown: boolean
): void {
  stackRow.innerHTML = '';

  if (isForcedDown) {
    stackRow.classList.add('forced-down');
  } else {
    stackRow.classList.remove('forced-down');
  }

  if (handCount > 0) {
    stackRow.classList.add('dimmed-stacks');
  } else {
    stackRow.classList.remove('dimmed-stacks');
  }

  const maxStackCount = Math.max(upCards.length, downCount);
  for (let i = 0; i < maxStackCount; i++) {
    const col = document.createElement('div');
    col.className = 'stack';

    const hasDownCard = downCount > i;
    const canPlayDown =
      hasDownCard && isMyTurn && handCount === 0 && upCount === 0;

    if (hasDownCard) {
      const downCard = cardImg(
        { value: '', suit: '', back: true } as CardType,
        canPlayDown
      );
      const downImg = downCard.querySelector('.card-img') as HTMLElement | null;
      if (downImg) {
        downImg.classList.add('down-card');
        if (isForcedDown) {
          downImg.classList.add('forced-down-card');
        }
        if (isLocal) {
          downImg.dataset.idx = String(i);
          downImg.dataset.zone = 'downCards';
        }
      }
      col.appendChild(downCard);
    }

    const upCard = upCards[i];
    const canPlayUp = Boolean(upCard) && isMyTurn && handCount === 0;
    if (upCard) {
      const upCardEl = cardImg(upCard, canPlayUp, undefined, true);
      const upImg = upCardEl.querySelector('.card-img') as HTMLElement | null;
      if (upImg) {
        upImg.classList.add('up-card');
        if (isLocal) {
          upImg.dataset.idx = String(i);
          upImg.dataset.zone = 'upCards';
          upImg.dataset.value = String(upCard.value);
        }
      }
      col.appendChild(upCardEl);
    }

    if (canPlayUp || canPlayDown) {
      col.classList.add('playable-stack');
    }

    stackRow.appendChild(col);
  }
}

function ensureLocalPanel(slotTarget: HTMLElement, seat: string): HTMLDivElement {
  let panel = slotTarget.querySelector('.player-area.is-local') as HTMLDivElement | null;
  if (panel) {
    return panel;
  }

  panel = document.createElement('div');
  panel.className = 'player-area seat classic-theme is-local';
  panel.id = 'my-area';
  panel.dataset.seat = seat;
  panel.style.setProperty('--seat-accent', seatAccents[seat] ?? '#f6c556');

  const header = document.createElement('div');
  header.className = 'player-header';

  const ident = document.createElement('div');
  ident.className = 'player-ident';

  const avatar = document.createElement('div');
  avatar.className = 'player-avatar';
  avatar.innerHTML = '<img src="/assets/Player.svg" alt="Player avatar">';

  const meta = document.createElement('div');
  meta.className = 'player-meta';

  const nameEl = document.createElement('div');
  nameEl.className = 'player-name';

  const tagRow = document.createElement('div');
  tagRow.className = 'player-tags';

  meta.append(nameEl, tagRow);
  ident.append(avatar, meta);
  header.appendChild(ident);
  panel.appendChild(header);

  const handZone = document.createElement('div');
  handZone.className = 'player-zone player-zone--hand player-zone--hand-local';

  const handLabel = document.createElement('div');
  handLabel.className = 'zone-label';
  handLabel.textContent = 'Hand';

  const handTray = document.createElement('div');
  handTray.className = 'hand-tray hand-tray--local';

  const handRow = document.createElement('div');
  handRow.className = 'hand-row hand-row--local';
  handTray.appendChild(handRow);

  handZone.append(handLabel, handTray);
  panel.appendChild(handZone);

  const actionRow = document.createElement('div');
  actionRow.className = 'player-actions';

  const playButton = document.createElement('button');
  playButton.id = 'play-button';
  playButton.className = 'action-button action-button--play';
  playButton.textContent = 'Play';

  const takeButton = document.createElement('button');
  takeButton.id = 'take-button';
  takeButton.className = 'action-button action-button--take';
  takeButton.textContent = 'Take';

  actionRow.append(playButton, takeButton);
  panel.appendChild(actionRow);

  const tableZone = document.createElement('div');
  tableZone.className = 'player-zone player-zone--table';

  const tabledWrapper = document.createElement('div');
  tabledWrapper.className = 'card-zone--tabled';

  const tableLabel = document.createElement('div');
  tableLabel.className = 'zone-label';
  tableLabel.textContent = 'Up / Down';

  const stackRow = document.createElement('div');
  stackRow.className = 'stack-row';

  tabledWrapper.append(tableLabel, stackRow);
  tableZone.appendChild(tabledWrapper);
  panel.appendChild(tableZone);

  slotTarget.innerHTML = '';
  slotTarget.appendChild(panel);

  return panel;
}

/**
 * Main render function to update the entire game view
 * @param {GameStateData} gameState - Full game state from server
 * @param {string | null} localPlayerId - The local player ID
 * @param {CardType | null} visualPileTop - Optional visual override for pile top card
 */
export function renderGameState(
  gameState: GameStateData,
  localPlayerId: string | null,
  visualPileTop?: CardType | null
): void {
  if (!gameState?.started) {
    lastLocalHandCount = -1;
  }

  const table = document.querySelector('#game-table .table') as HTMLElement | null;
  const slotTop = document.getElementById('opponent-area-top') as HTMLElement | null;
  const slotBottom = document.getElementById('player-area-bottom') as HTMLElement | null;
  const slotLeft = document.getElementById('opponent-area-left') as HTMLElement | null;
  const slotRight = document.getElementById('opponent-area-right') as HTMLElement | null;
  const centerArea = document.getElementById('center-area') as HTMLElement | null;

  if (!gameState || !gameState.players) {
    if (table) {
      table.removeAttribute('data-player-count');
    }
    if (slotTop) slotTop.innerHTML = '';
    if (slotBottom) slotBottom.innerHTML = '';
    if (slotLeft) slotLeft.innerHTML = '';
    if (slotRight) slotRight.innerHTML = '';
    if (centerArea) centerArea.innerHTML = '';
    return;
  }

  if (slotTop) slotTop.innerHTML = '';
  if (slotLeft) slotLeft.innerHTML = '';
  if (slotRight) slotRight.innerHTML = '';
  if (centerArea) centerArea.innerHTML = '';

  const players = gameState.players;
  if (table) {
    table.dataset.playerCount = String(players.length);
  }

  const meIdx = localPlayerId
    ? players.findIndex((p) => p.id === localPlayerId)
    : -1;

  if (slotBottom && meIdx < 0) {
    slotBottom.innerHTML = '';
  }

  const rotatedPlayers =
    meIdx >= 0
      ? players.slice(meIdx).concat(players.slice(0, meIdx))
      : players.slice();

  let currentSeatOrder: string[];
  if (players.length === 2) {
    currentSeatOrder = ['bottom', 'top'];
  } else if (players.length === 3) {
    currentSeatOrder = ['bottom', 'left', 'top'];
  } else {
    currentSeatOrder = ['bottom', 'left', 'top', 'right'];
  }

  currentSeatOrder.forEach((seat, idx) => {
    const slotTarget =
      seat === 'bottom'
        ? slotBottom
        : seat === 'top'
          ? slotTop
          : seat === 'left'
            ? slotLeft
            : slotRight;
    if (!slotTarget) {
      return;
    }

    const player = rotatedPlayers[idx];
    if (!player) {
      if (seat !== 'bottom') {
        slotTarget.innerHTML = '';
      }
      return;
    }

    const isLocalPlayer = Boolean(localPlayerId && player.id === localPlayerId);
    const isCurrentTurn = player.id === gameState.currentPlayerId;
    const isMyTurn = isLocalPlayer && isCurrentTurn;

    const handCount = player.handCount ?? player.hand?.length ?? 0;
    const upCards = player.upCards ?? [];
    const upCount =
      player.upCount ??
      upCards.filter((card) => Boolean(card)).length;
    const downCount = player.downCount ?? player.downCards?.length ?? 0;
    const isForcedDown =
      isLocalPlayer &&
      isMyTurn &&
      handCount === 0 &&
      upCount === 0 &&
      downCount > 0;

    if (isLocalPlayer && seat === 'bottom') {
      const panel = ensureLocalPanel(slotTarget, seat);
      panel.dataset.playerId = player.id;
      panel.dataset.seat = seat;
      panel.style.setProperty('--seat-accent', seatAccents[seat] ?? '#f6c556');
      panel.classList.toggle('disconnected', Boolean(player.disconnected));

      const avatar = panel.querySelector('.player-avatar');
      if (avatar) {
        avatar.classList.toggle('active-turn', isCurrentTurn);
      }

      const nameEl = panel.querySelector('.player-name');
      if (nameEl) {
        nameEl.textContent = player.name || player.id;
      }

      const tagRow = panel.querySelector('.player-tags');
      if (tagRow) {
        tagRow.innerHTML = '';
        if (player.disconnected) {
          tagRow.appendChild(createTag('Offline', 'offline'));
        }
      }

      const handRow = panel.querySelector('.hand-row') as HTMLDivElement | null;
      if (handRow) {
        if (suppressNextHandAnimation || handCount === lastLocalHandCount) {
          handRow.classList.add('no-animate');
        } else {
          handRow.classList.remove('no-animate');
        }

        if (handCount < lastLocalHandCount && lastLocalHandCount !== -1) {
          suppressNextHandAnimation = false;
        }

        if (lastHandCompressed && handCount > 1) {
          handRow.classList.add('hand-row--compressed');
          handRow.style.setProperty('--hand-overlap', `${lastHandOverlap}px`);
        } else if (handCount <= 1) {
          handRow.classList.remove('hand-row--compressed');
          handRow.style.removeProperty('--hand-overlap');
        }

        updateHandRow(handRow, player.hand ?? [], isMyTurn);
        requestAnimationFrame(() => {
          applyHandCompression(panel, handRow, handCount);
        });
      }

      lastLocalHandCount = handCount;

      const playButton = panel.querySelector('#play-button') as HTMLButtonElement | null;
      if (playButton) {
        playButton.disabled = !isMyTurn;
      }

      const takeButton = panel.querySelector('#take-button') as HTMLButtonElement | null;
      if (takeButton) {
        const requiredZone =
          handCount > 0
            ? 'hand'
            : upCount > 0
              ? 'upCards'
              : downCount > 0
                ? 'downCards'
                : null;
        const hasPlayableCard =
          requiredZone === 'hand'
            ? hasValidHandPlay(player.hand ?? [], gameState.pile ?? [])
            : requiredZone === 'upCards'
              ? hasValidUpPlay(player.upCards ?? [], gameState.pile ?? [])
              : false;
        takeButton.disabled =
          !isMyTurn ||
          requiredZone === null ||
          requiredZone === 'downCards' ||
          hasPlayableCard;
      }

      const stackRow = panel.querySelector('.stack-row') as HTMLDivElement | null;
      if (stackRow) {
        updateTableStacks(
          stackRow,
          upCards,
          downCount,
          isMyTurn,
          handCount,
          upCount,
          true,
          isForcedDown
        );
      }
    } else {
      slotTarget.innerHTML = '';

      const panel = document.createElement('div');
      panel.className = 'player-area seat classic-theme';
      panel.dataset.playerId = player.id;
      panel.dataset.seat = seat;
      panel.style.setProperty('--seat-accent', seatAccents[seat] ?? '#f6c556');
      if (player.isComputer) {
        panel.classList.add('computer-player');
      }
      panel.classList.toggle('disconnected', Boolean(player.disconnected));

      const header = document.createElement('div');
      header.className = 'player-header';

      const ident = document.createElement('div');
      ident.className = 'player-ident';

      const avatar = document.createElement('div');
      avatar.className = 'player-avatar';
      avatar.classList.toggle('active-turn', isCurrentTurn);
      const avatarImg = document.createElement('img');
      avatarImg.src = player.isComputer ? '/assets/robot.svg' : '/assets/Player.svg';
      avatarImg.alt = player.isComputer ? 'CPU avatar' : 'Player avatar';
      avatar.appendChild(avatarImg);

      const meta = document.createElement('div');
      meta.className = 'player-meta';

      const nameEl = document.createElement('div');
      nameEl.className = 'player-name';
      nameEl.textContent = player.name || player.id;

      const tagRow = document.createElement('div');
      tagRow.className = 'player-tags';
      if (player.disconnected) {
        tagRow.appendChild(createTag('Offline', 'offline'));
      }

      meta.append(nameEl, tagRow);
      ident.append(avatar, meta);
      header.appendChild(ident);
      panel.appendChild(header);

      const handZone = document.createElement('div');
      handZone.className = 'player-zone player-zone--hand';
      const handLabel = document.createElement('div');
      handLabel.className = 'zone-label';
      handLabel.textContent = 'Hand';
      const handTray = document.createElement('div');
      handTray.className = 'hand-tray';
      const handRow = document.createElement('div');
      handRow.className = 'hand-row hand-row--opponent';

      const handStack = document.createElement('div');
      handStack.className = 'hand-stack';
      const visibleCount = Math.min(3, handCount);
      if (visibleCount === 0) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'card-container card-slot card-slot--empty';
        emptySlot.innerHTML = '<div class="empty-card-placeholder"></div>';
        handStack.appendChild(emptySlot);
      } else {
        for (let i = 0; i < visibleCount; i++) {
          const backCard: CardType = { back: true, value: 'A', suit: 'hearts' };
          const cardEl = cardImg(backCard, false);
          cardEl.classList.add('stacked-card');
          handStack.appendChild(cardEl);
        }
      }
      if (handCount > 0) {
        const badge = document.createElement('div');
        badge.className = 'hand-count-badge';
        if (handCount <= 5) badge.classList.add('badge-safe');
        else if (handCount <= 10) badge.classList.add('badge-warning');
        else badge.classList.add('badge-danger');
        badge.textContent = String(handCount);
        handStack.appendChild(badge);
      }
      handRow.appendChild(handStack);
      handTray.appendChild(handRow);
      handZone.append(handLabel, handTray);
      panel.appendChild(handZone);

      const tableZone = document.createElement('div');
      tableZone.className = 'player-zone player-zone--table';
      const tabledWrapper = document.createElement('div');
      tabledWrapper.className = 'card-zone--tabled';
      const tableLabel = document.createElement('div');
      tableLabel.className = 'zone-label';
      tableLabel.textContent = 'Up / Down';
      const stackRow = document.createElement('div');
      stackRow.className = 'stack-row';
      if (handCount > 0) {
        stackRow.classList.add('dimmed-stacks');
      }

      const maxStackCount = Math.max(upCards.length, downCount);
      for (let i = 0; i < maxStackCount; i++) {
        const col = document.createElement('div');
        col.className = 'stack';

        if (downCount > i) {
          const downCard = cardImg({ value: '', suit: '', back: true } as CardType, false);
          const downImg = downCard.querySelector('.card-img');
          if (downImg) {
            downImg.classList.add('down-card');
          }
          col.appendChild(downCard);
        }

        const upCard = upCards[i];
        if (upCard) {
          const upCardEl = cardImg(upCard, false, undefined, true);
          const upImg = upCardEl.querySelector('.card-img');
          if (upImg) {
            upImg.classList.add('up-card');
          }
          col.appendChild(upCardEl);
        }

        stackRow.appendChild(col);
      }

      tabledWrapper.append(tableLabel, stackRow);
      tableZone.appendChild(tabledWrapper);
      panel.appendChild(tableZone);

      slotTarget.appendChild(panel);
    }
  });

  if (table && !table.querySelector('#table-rules-button')) {
    const rulesButton = document.createElement('button');
    rulesButton.id = 'table-rules-button';
    rulesButton.className = 'action-button action-button--rules';
    rulesButton.textContent = 'Rules';
    rulesButton.onclick = () => {
      document.dispatchEvent(new CustomEvent('open-rules-modal'));
    };
    table.appendChild(rulesButton);
  }

  if (table && !table.querySelector('#table-branding')) {
    const branding = document.createElement('div');
    branding.id = 'table-branding';

    const crownSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    crownSvg.setAttribute('class', 'branding-crown');
    crownSvg.setAttribute('viewBox', '0 0 32 32');
    crownSvg.innerHTML = `
      <path d="M4 22L6 12L11 16L16 8L21 16L26 12L28 22H4Z" fill="#ffd700" stroke="#b8860b" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="6" cy="12" r="2" fill="#ffd700" stroke="#b8860b" stroke-width="1"/>
      <circle cx="16" cy="8" r="2.5" fill="#ffd700" stroke="#b8860b" stroke-width="1"/>
      <circle cx="26" cy="12" r="2" fill="#ffd700" stroke="#b8860b" stroke-width="1"/>
      <rect x="4" y="22" width="24" height="4" rx="1" fill="#ffd700" stroke="#b8860b" stroke-width="1"/>
      <path d="M10 24H22" stroke="#b8860b" stroke-width="1.5" stroke-linecap="round"/>
    `;

    const title = document.createElement('div');
    title.className = 'branding-title';
    title.textContent = 'Top That!';

    const slogan = document.createElement('div');
    slogan.className = 'branding-slogan';
    slogan.textContent = 'One Crown. Zero Mercy.';

    branding.appendChild(crownSvg);
    branding.appendChild(title);
    branding.appendChild(slogan);
    table.appendChild(branding);
  }

  if (centerArea) {
    const centerWrap = document.createElement('div');
    centerWrap.className = 'center-piles';

    const deckContainer = document.createElement('div');
    deckContainer.className = 'pile-group pile-group--deck';

    const deckSize = gameState.deckSize ?? 0;
    const deckStack = document.createElement('div');
    deckStack.className = 'pile-cards deck-stack';
    if (deckSize > 40) deckStack.classList.add('deck-full');
    else if (deckSize > 20) deckStack.classList.add('deck-half');
    else if (deckSize > 0) deckStack.classList.add('deck-low');
    if (deckSize > 0) {
      const deckBack: CardType = { back: true, value: 'A', suit: 'spades' };
      const deckCard = cardImg(deckBack, false);
      deckCard.classList.add('deck-card');
      deckStack.appendChild(deckCard);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'pile-placeholder';
      deckStack.appendChild(placeholder);
    }
    const deckNameplate = document.createElement('div');
    deckNameplate.className = 'pile-nameplate';
    const deckName = document.createElement('span');
    deckName.className = 'pile-name';
    deckName.textContent = 'Deck';
    const deckCount = document.createElement('span');
    deckCount.className = 'pile-count';
    deckCount.textContent = String(deckSize);
    deckNameplate.append(deckName, deckCount);
    deckContainer.append(deckNameplate, deckStack);

    const playContainer = document.createElement('div');
    playContainer.className = 'pile-group pile-group--discard';
    playContainer.id = 'discard-pile';

    const pile = gameState.pile ?? [];
    const playStack = document.createElement('div');
    playStack.className = 'pile-cards play-stack';
    if (pile.length > 1) {
      playStack.classList.add('pile-multiple');
    }

    const logicalTop = pile.length > 0 ? pile[pile.length - 1] : null;
    const effectiveTopCard = visualPileTop || logicalTop;

    if (effectiveTopCard) {
      const playCard = cardImg(effectiveTopCard, false, undefined, false);
      playCard.id = 'pile-top-card';

      if (effectiveTopCard.copied) {
        const badge = document.createElement('div');
        badge.className = 'copied-badge';
        badge.textContent = 'COPIED';
        badge.style.position = 'absolute';
        badge.style.bottom = '10px';
        badge.style.left = '50%';
        badge.style.transform = 'translateX(-50%)';
        badge.style.backgroundColor = '#FFD700';
        badge.style.color = '#000';
        badge.style.padding = '2px 6px';
        badge.style.borderRadius = '4px';
        badge.style.fontSize = '10px';
        badge.style.fontWeight = 'bold';
        badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
        badge.style.zIndex = '10';
        badge.style.pointerEvents = 'none';
        badge.style.whiteSpace = 'nowrap';
        badge.style.border = '1px solid #b8860b';
        playCard.appendChild(badge);
      }

      playStack.appendChild(playCard);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'pile-placeholder';
      playStack.appendChild(placeholder);
    }

    const playNameplate = document.createElement('div');
    playNameplate.className = 'pile-nameplate';
    const playName = document.createElement('span');
    playName.className = 'pile-name';
    playName.textContent = 'Discard';
    const playCount = document.createElement('span');
    playCount.className = 'pile-count';
    playCount.textContent = String(pile.length);
    playNameplate.append(playName, playCount);
    playContainer.append(playNameplate, playStack);

    if (gameState.discardCount > 0) {
      const burned = document.createElement('div');
      burned.className = 'pile-burned';
      burned.textContent = `Burned ${gameState.discardCount}`;
      playContainer.appendChild(burned);
    }

    centerWrap.append(deckContainer, playContainer);
    centerArea.appendChild(centerWrap);
  }
}

/**
 * Overlay special card symbol on top of discard pile card or container
 */
export function showCardEvent(
  cardValue: number | string | null,
  type: string,
  targetPlayerId?: string
): void {
  console.log('[showCardEvent] Starting - type:', type, 'value:', cardValue);
  let retries = 0;
  function tryRunEffect() {
    // Query for the pile top card image directly, as it's now consistently used.
    let discardImg = document.getElementById(
      'pile-top-card'
    ) as HTMLImageElement | null;
    const discardContainer = document.getElementById('discard-pile');
    
    console.log('[showCardEvent] Attempt', retries + 1, '- pile-top-card exists?', !!discardImg, 'discard-pile exists?', !!discardContainer);

    // If pile-top-card is not visible (e.g. pile is empty), try to find a card in a .discard container if that structure still exists from old code.
    // This is a fallback, ideally the pile-top-card is the single source of truth for the top discard image.
    if (!discardImg || discardImg.style.display === 'none') {
      discardImg = document.querySelector(
        '.discard .card-img'
      ) as HTMLImageElement | null;
      console.log('[showCardEvent] Fallback to .discard .card-img:', !!discardImg);
    }

    const target =
      discardImg && discardImg.style.display !== 'none'
        ? discardImg
        : discardContainer;
    
    console.log('[showCardEvent] Target element:', target?.id || target?.className || 'NONE');

    if (!target && retries < 5) {
      retries++;
      console.log('[showCardEvent] Target not found, retrying in 100ms...');
      setTimeout(tryRunEffect, 100);
      return;
    }
    if (!target) {
      console.warn(
        '[showCardEvent] FAILED - Could not find target after 5 retries'
      );
      return;
    }

    function runEffect(effectTarget: HTMLElement) {
      const parentElement =
        effectTarget instanceof HTMLImageElement
          ? effectTarget.parentElement
          : effectTarget;
      console.log('[showCardEvent] Parent element for icon:', parentElement?.className || 'NONE');
      if (!parentElement) {
        console.warn('[showCardEvent] No parent element found!');
        return;
      }

      const prev = parentElement.querySelector('.special-icon');
      if (prev) {
        console.log('[showCardEvent] Removing previous icon');
        prev.remove();
      }
      const icon = document.createElement('img');
      icon.className = 'special-icon';

      // Use the mapped paths to ensure consistency
      let src = '';
      if (type === 'two') src = ICON_PATHS.two;
      else if (type === 'five') src = ICON_PATHS.five;
      else if (type === 'ten') src = ICON_PATHS.ten;
      else if (type === 'invalid') src = ICON_PATHS.invalid;
      else if (type === 'take') src = ICON_PATHS.take;
      else if (type === 'regular') return;

      icon.src = src;
      console.log('[showCardEvent] Creating icon with src:', src);

      // --- DEBUG LOGGING ---
      const startTime = Date.now();
      icon.onload = () => {
        console.log(
          `[showCardEvent] Icon loaded in ${Date.now() - startTime}ms: ${src}`
        );
      };
      // ---------------------

      icon.onerror = () => {
        console.error(`[showCardEvent] Failed to load icon: ${src}`);
        icon.style.background = type === 'invalid' ? '#dc2626' : '#ffc300';
        icon.style.borderRadius = '50%';
        icon.style.display = 'flex';
        icon.style.justifyContent = 'center';
        icon.style.alignItems = 'center';
        icon.style.border = '2px solid white';
        const text = document.createElement('div');
        text.textContent = type === 'invalid' ? '✕' : '!';
        text.style.color = 'white';
        text.style.fontWeight = '900';
        text.style.fontSize = '40px';
        icon.appendChild(text);
      };
      icon.style.position = 'absolute';
      icon.style.top = '50%';
      icon.style.left = '50%';
      icon.style.transform = 'translate(-50%, -50%)';
      icon.style.width = '70px';
      icon.style.height = '70px';
      icon.style.zIndex = '100';
      icon.style.background = 'none';
      icon.style.backgroundColor = 'transparent';
      icon.style.pointerEvents = 'none';
      icon.style.opacity = '0.85';
      icon.style.filter = 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.35))';
      
      // Set color for pulse effect based on card type
      let iconColor = '#ffffff'; // Default white
      if (type === 'two') iconColor = '#3b82f6'; // Blue for reset
      else if (type === 'five') iconColor = '#10b981'; // Green for copy
      else if (type === 'ten') iconColor = '#ef4444'; // Red for burn
      else if (type === 'invalid') iconColor = '#dc2626'; // Dark red for invalid
      
      icon.style.color = iconColor;
      icon.style.animation = 'iconPulse 1.5s ease-in-out';

      // IMPORTANT: Ensure visibility
      icon.style.display = 'block';

      // Ensure parent has relative positioning if it doesn't already.
      if (getComputedStyle(parentElement).position === 'static') {
        parentElement.style.position = 'relative';
      }
      parentElement.appendChild(icon);
      
      // Trigger flight animation if it's a 'take' event and we know who took it
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
  // Find the specific player's avatar to fly towards
  const targetEl = document.querySelector(`.player-area[data-player-id="${targetPlayerId}"] .player-avatar`);

  if (!pileEl || !targetEl) return;

  const startRect = pileEl.getBoundingClientRect();
  const endRect = targetEl.getBoundingClientRect();

  // Create a temporary flying card element
  const flyer = document.createElement('div');
  flyer.classList.add('flying-card');
  
  // Set initial position exactly over the pile
  flyer.style.left = `${startRect.left}px`;
  flyer.style.top = `${startRect.top}px`;
  
  document.body.appendChild(flyer);

  // Calculate the distance to travel
  const deltaX = (endRect.left + endRect.width / 2) - (startRect.left + startRect.width / 2);
  const deltaY = (endRect.top + endRect.height / 2) - (startRect.top + startRect.height / 2);

  // Run the animation using Web Animations API
  const animation = flyer.animate([
    { 
      transform: 'translate(0, 0) scale(1) rotate(0deg)',
      opacity: 1 
    },
    { 
      transform: `translate(${deltaX}px, ${deltaY}px) scale(0.4) rotate(360deg)`,
      opacity: 0.5 
    }
  ], {
    duration: 600,
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    fill: 'forwards'
  });

  // Clean up element after animation finishes
  animation.onfinish = () => {
    flyer.remove();
  };
}

export function playArea() {
  // Mock implementation for tests
}

export function lobbyLink() {
  // Mock implementation for tests
}
