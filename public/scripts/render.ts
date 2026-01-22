import { Card as CardType, GameStateData } from '../../src/shared/types.js';
import {
  normalizeCardValue,
  rank,
  isSpecialCard,
} from '../../utils/cardUtils.js';
// Import assets so Vite can resolve hashed filenames
// Resolve player/robot avatars at runtime to avoid build-time failures
let playerAvatarUrl = '/assets/Player.svg';
let robotAvatarUrl = '/assets/robot.svg';

async function resolveAsset(url: string, fallback: string): Promise<string> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return url;
  } catch (err) {
    // ignore
  }
  return fallback;
}

// Kick off resolution but don't block module load
if (typeof window !== 'undefined') {
  (async () => {
    playerAvatarUrl = await resolveAsset(playerAvatarUrl, '/assets/Player.svg');
    robotAvatarUrl = await resolveAsset(robotAvatarUrl, '/assets/robot.svg');
  })();
}
// @ts-ignore - Vite handles asset imports
import fourOfAKindIconUrl from '../src/shared/4ofakind-icon.png';
// @ts-ignore - Vite handles asset imports
import burnIconUrl from '../src/shared/Burn-icon.png';
// @ts-ignore - Vite handles asset imports
import copyIconUrl from '../src/shared/Copy-icon.png';
// @ts-ignore - Vite handles asset imports
import crownIconUrl from '../src/shared/crownv2.svg';
// @ts-ignore - Vite handles asset imports
import invalidIconUrl from '../src/shared/invalid play-icon.png';
// @ts-ignore - Vite handles asset imports
import logoUrl from '../src/shared/logov2.svg';
// @ts-ignore - Vite handles asset imports
import resetIconUrl from '../src/shared/Reset-icon.png';

// --- PRELOAD LOGIC START ---
const ICON_PATHS = {
  two: resetIconUrl,
  five: copyIconUrl,
  ten: burnIconUrl,
  four: fourOfAKindIconUrl,
  invalid: invalidIconUrl,
};

// Set header logo if present (use imported logoUrl so Vite can hash it)
if (typeof document !== 'undefined') {
  const headerLogo = document.getElementById(
    'site-logo'
  ) as HTMLImageElement | null;
  if (headerLogo) {
    headerLogo.src = logoUrl;
    headerLogo.onload = () =>
      console.log('Logo loaded successfully:', headerLogo.src);
    headerLogo.onerror = () =>
      console.error('Logo failed to load:', headerLogo.src);
  }
}

// Preload the card back logo to prevent empty card backs
let logoPreloaded = false;

// Start preloading immediately
(() => {
  const logoImg = new Image();
  logoImg.onload = () => {
    logoPreloaded = true;
    console.log('[Assets] Card back logo preloaded');
  };
  logoImg.onerror = () => {
    console.warn('[Assets] Failed to preload card back logo');
    logoPreloaded = true; // Still mark as complete to prevent blocking
  };
  logoImg.src = logoUrl;
})();

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

let drawPileBlankUntilMs = 0;

export function blankDrawPileFor(ms: number): void {
  const duration = Math.max(0, ms);
  drawPileBlankUntilMs = Math.max(drawPileBlankUntilMs, Date.now() + duration);
}

function shouldBlankDrawPile(): boolean {
  return Date.now() < drawPileBlankUntilMs;
}

let lastLocalHandCount = -1;
let suppressNextHandAnimation = false;
let lastHandOverlap = 0;
let lastHandCompressed = false;

// === GAME LOG FUNCTIONALITY ===
interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: 'play' | 'take' | 'draw' | 'special' | 'turn' | 'game';
}

const MAX_LOG_ENTRIES = 5;
let logEntries: LogEntry[] = [];
let nextLogId = 0;
let gameLogMinimized = false;
let tableMenuEscapeListenerAttached = false;

function addLogEntry(message: string, type: LogEntry['type'] = 'game'): void {
  const entry: LogEntry = {
    id: nextLogId++,
    timestamp: new Date(),
    message,
    type,
  };

  logEntries.unshift(entry); // Add to beginning

  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries = logEntries.slice(0, MAX_LOG_ENTRIES);
  }

  renderGameLog();
}

function renderGameLog(): void {
  const logContainer = document.getElementById('game-log-entries');
  if (!logContainer) return;

  if (logEntries.length === 0) {
    logContainer.innerHTML =
      '<div class="game-log-empty">No moves yet...</div>';
    return;
  }

  logContainer.innerHTML = logEntries
    .map((entry) => {
      const timeStr = entry.timestamp.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      return `
        <div class="game-log-entry game-log-entry--${entry.type}" data-id="${entry.id}">
          <span class="game-log-time">${timeStr}</span>
          <span class="game-log-message">${entry.message}</span>
        </div>
      `;
    })
    .join('');
}

function formatCardValue(value: string | number): string {
  if (value === 10) return '🔥';
  if (value === 2) return '2️⃣';
  if (value === 5) return '5️⃣';
  if (value === 7) return '7️⃣';
  return String(value);
}

function formatCards(cards: Array<{ value: string | number }>): string {
  if (cards.length === 1) {
    return formatCardValue(cards[0].value);
  }
  return `${cards.length}x ${formatCardValue(cards[0].value)}`;
}

function getPlayerDisplayName(playerId: string, players: any[]): string {
  const player = players.find((p) => p.id === playerId);
  return player ? player.name : 'Unknown';
}

export function logCardPlayed(
  playerId: string,
  cards: CardType[],
  players: any[]
): void {
  const playerName = getPlayerDisplayName(playerId, players);
  const cardStr = formatCards(cards);
  addLogEntry(`${playerName} played ${cardStr} to the Draw pile`, 'play');
}

export function logPileTaken(
  playerId: string,
  pileSize: number,
  players: any[]
): void {
  const playerName = getPlayerDisplayName(playerId, players);
  addLogEntry(`${playerName} took the Draw pile (${pileSize} cards)`, 'take');
}

/**
 * RENAMED: logDeckToPile -> logPlayToDraw
 */
export function logPlayToDraw(): void {
  addLogEntry('Card flipped from Play pile to Draw pile', 'draw');
}

export function logSpecialEffect(effectType: string, _value?: any): void {
  let message = '';
  switch (effectType) {
    case 'ten':
      message = '🔥 Pile burned!';
      break;
    case 'two':
      message = '2️⃣ Pile reset!';
      break;
    case 'five':
      message = '5️⃣ Copies top card!';
      break;
    case 'four':
      message = '💥 Four of a kind!';
      break;
    default:
      message = `Special card effect: ${effectType}`;
  }
  addLogEntry(message, 'special');
}

export function logTurnChange(playerId: string, players: any[]): void {
  const playerName = getPlayerDisplayName(playerId, players);
  addLogEntry(`${playerName}'s turn`, 'turn');
}

export function logGameStart(): void {
  logEntries = []; // Clear on game start
  nextLogId = 0;
  addLogEntry('Game started!', 'game');
}

export function logGameOver(winnerName: string): void {
  addLogEntry(`🏆 ${winnerName} wins!`, 'game');
}

// === END GAME LOG FUNCTIONALITY ===

export function resetHandTracking(): void {
  suppressNextHandAnimation = true;
}

const seatAccents: Record<string, string> = {
  bottom: '#f6c556',
  right: '#60d6a6',
  top: '#ff8b5f',
  left: '#6fb4ff',
};

function getCardIconType(card: CardType): string | null {
  if (card.back) return null;
  const val = normalizeCardValue(card.value);
  if (val === 'two') return 'two';
  if (val === 'five') return 'five';
  if (val === 'ten') return 'ten';
  return null;
}

export function code(card: CardType): string {
  if (card.value == null || card.suit == null) return 'ERR';
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

export function cardImg(
  card: CardType,
  selectable?: boolean,
  onLoad?: (img: HTMLImageElement) => void,
  showAbilityIcon: boolean = true,
  skeletonMode: boolean = false
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'card-container';

  const cardCode = card.back ? 'back' : code(card);

  if (card.back) {
    // Create custom card back element instead of using img
    const cardBack = document.createElement('div');
    cardBack.className = 'card-img card-back-custom';

    // Hide in skeleton mode
    if (skeletonMode) {
      cardBack.style.visibility = 'hidden';
      cardBack.style.opacity = '0';
    }

    // Add inner structure and logo
    const inner = document.createElement('div');
    inner.className = 'card-back-inner';
    const logo = document.createElement('img');
    logo.className = 'card-back-logo';
    logo.src = logoUrl; // Use imported asset URL for proper Vite hashing
    logo.alt = 'Top That';

    // Ensure logo visibility after it loads (prevents blank card backs)
    if (!logoPreloaded) {
      logo.style.opacity = '0';
      logo.onload = () => {
        logo.style.opacity = '1';
      };
    }

    inner.appendChild(logo);
    cardBack.appendChild(inner);

    if (selectable) {
      cardBack.classList.add('selectable');
      cardBack.style.touchAction = 'manipulation';
      container.classList.add('selectable-container');
    }

    container.appendChild(cardBack);
  } else {
    const img = new Image();
    img.className = 'card-img';
    img.style.visibility = 'hidden';

    // Use local assets by default for instant loading
    const imgSrc = `/assets/cards/${cardCode}.png`;
    img.src = imgSrc;
    img.alt = `${card.value} of ${card.suit}`;

    img.onload = () => {
      if (!skeletonMode) {
        img.style.visibility = 'visible';
      }
      if (onLoad) onLoad(img);
    };

    img.onerror = () => {
      console.warn(
        `Failed to load local card asset: ${cardCode}, trying remote fallback`
      );
      // Fallback to deckofcardsapi if local is missing (safety net)
      const fallbackUrl = `https://deckofcardsapi.com/static/img/${cardCode}.png`;
      img.src = fallbackUrl;
      if (!skeletonMode) {
        img.style.visibility = 'visible';
      }
    };

    if (selectable) {
      img.classList.add('selectable');
      img.style.touchAction = 'manipulation';
      container.classList.add('selectable-container');
    }

    container.appendChild(img);
  }

  const iconType = getCardIconType(card);
  if (showAbilityIcon && iconType) {
    const iconOverlay = document.createElement('img');
    iconOverlay.src = ICON_PATHS[iconType as keyof typeof ICON_PATHS];
    iconOverlay.className = 'card-ability-icon';
    container.appendChild(iconOverlay);
  }

  return container;
}

// --- DOM RECONCILIATION HELPERS ---

function updateOpponentHandStack(
  handStack: HTMLElement,
  handCount: number,
  skeletonMode: boolean = false
) {
  // Remove any existing badges from handStack or card containers
  const oldBadge = handStack.querySelector('.hand-count-badge');
  if (oldBadge) oldBadge.remove();

  const desiredCards = Math.min(3, handCount);
  const currentCards = handStack.querySelectorAll(
    '.card-container:not(.card-slot--empty)'
  );

  if (desiredCards > 0 && handStack.querySelector('.card-slot--empty')) {
    const ph = handStack.querySelector('.card-slot--empty');
    if (ph) ph.remove();
  }

  if (desiredCards === 0 && !handStack.querySelector('.card-slot--empty')) {
    currentCards.forEach((c) => c.remove());
    const emptySlot = document.createElement('div');
    emptySlot.className = 'card-container card-slot card-slot--empty';
    emptySlot.innerHTML = '<div class="empty-card-placeholder"></div>';
    handStack.appendChild(emptySlot);
    return;
  }

  if (currentCards.length < desiredCards) {
    for (let i = currentCards.length; i < desiredCards; i++) {
      const backCard: CardType = { back: true, value: 'A', suit: 'hearts' };
      const cardEl = cardImg(backCard, false, undefined, true, skeletonMode);
      cardEl.classList.add('stacked-card');
      cardEl.style.position = 'relative'; // Anchor for badge positioning
      handStack.appendChild(cardEl);
    }
  } else if (currentCards.length > desiredCards) {
    for (let i = 0; i < currentCards.length - desiredCards; i++) {
      currentCards[i].remove();
    }
  }

  // Add badge to the last card container if hand count > 0
  if (handCount > 0 && desiredCards > 0) {
    const cards = handStack.querySelectorAll(
      '.card-container:not(.card-slot--empty)'
    );
    const lastCard = cards[cards.length - 1] as HTMLElement;
    if (lastCard) {
      const badge = document.createElement('div');
      badge.className = 'hand-count-badge';
      badge.textContent = String(handCount);
      if (handCount <= 5) badge.classList.add('badge-safe');
      else if (handCount <= 10) badge.classList.add('badge-warning');
      else badge.classList.add('badge-danger');
      // Hide badge in skeleton mode
      if (skeletonMode) {
        badge.style.visibility = 'hidden';
        badge.style.opacity = '0';
      }
      lastCard.appendChild(badge);
    }
  }
}

function updateCenterArea(
  centerArea: HTMLElement,
  gameState: GameStateData,
  visualPileTop?: CardType | null,
  skeletonMode: boolean = false
) {
  let centerWrap = centerArea.querySelector(
    '.center-piles'
  ) as HTMLDivElement | null;
  if (!centerWrap) {
    centerArea.innerHTML = '';
    centerWrap = document.createElement('div');
    centerWrap.className = 'center-piles';
    // Ensure card dimensions are set
    centerWrap.style.setProperty('--card-w-desktop', '90px');
    centerWrap.style.setProperty('--card-h-desktop', '126px');
    centerArea.appendChild(centerWrap);
  }

  // 1. SOURCE PILE (Left - "Play")
  let deckContainer = centerWrap.querySelector(
    '.pile-group--deck'
  ) as HTMLElement;
  if (!deckContainer) {
    deckContainer = document.createElement('div');
    deckContainer.className = 'pile-group pile-group--deck';
    deckContainer.innerHTML = `
      <div class="pile-nameplate"><span class="pile-name">Play</span><span class="pile-count">0</span></div>
      <div class="pile-cards deck-stack" id="deck-pile">
         <div class="pile-count-badge" style="display: none;">0</div>
      </div>
    `;
    centerWrap.appendChild(deckContainer);
  }
  const deckCountEl = deckContainer.querySelector('.pile-count');
  if (deckCountEl) deckCountEl.textContent = String(gameState.deckSize ?? 0);
  // Update badge
  const deckBadgeEl = deckContainer.querySelector('.pile-count-badge');
  if (deckBadgeEl) deckBadgeEl.textContent = String(gameState.deckSize ?? 0);

  // 2. TARGET PILE (Right - "Draw")
  let playContainer = centerWrap.querySelector(
    '.pile-group--discard'
  ) as HTMLElement;
  if (!playContainer) {
    playContainer = document.createElement('div');
    playContainer.className = 'pile-group pile-group--discard';
    playContainer.id = 'discard-pile';
    playContainer.innerHTML = `
      <div class="pile-nameplate"><span class="pile-name">Draw</span><span class="pile-count">0</span></div>
      <div class="pile-cards play-stack" id="play-pile">
        <div class="pile-count-badge" style="display: none;">0</div>
      </div>
    `;
    centerWrap.appendChild(playContainer);
  }

  // --- RENDER PLAY SOURCE (Always Visible) ---
  const deckStack = deckContainer.querySelector('.deck-stack') as HTMLElement;
  if (deckStack) {
    const deckSize = gameState.deckSize ?? 0;
    if (deckSize > 0 && !deckStack.querySelector('.deck-card')) {
      deckStack.innerHTML = '';
      const deckBack: CardType = { back: true, value: 'A', suit: 'spades' };
      const deckCard = cardImg(deckBack, false, undefined, true, false); // skeletonMode=false
      deckCard.classList.add('deck-card');
      deckStack.appendChild(deckCard);
    } else if (deckSize === 0) {
      deckStack.innerHTML = '<div class="pile-placeholder"></div>';
    }
  }

  // --- RENDER DRAW TARGET (The Discard Pile) ---
  const playStack = playContainer.querySelector('.play-stack') as HTMLElement;
  const pile = gameState.pile ?? [];
  const forceBlank = !skeletonMode && shouldBlankDrawPile();
  const drawCountEl = playContainer.querySelector('.pile-count');
  if (drawCountEl)
    drawCountEl.textContent = forceBlank ? '0' : String(pile.length);

  if (playStack) {
    // Calculate new signature to avoid unnecessary re-renders
    let newSignature = 'EMPTY';
    const topCard =
      visualPileTop || (pile.length > 0 ? pile[pile.length - 1] : null);

    if (skeletonMode || forceBlank) {
      newSignature = 'BLANK';
    } else if (topCard) {
      const shouldShowCopyShingle =
        Boolean((topCard as any).copied) && pile.length >= 2;
      if (shouldShowCopyShingle) {
        const belowCard = pile[pile.length - 2];
        newSignature = `SHINGLE:${code(topCard)}:${code(belowCard)}`;
      } else {
        const normalizedTopValue = normalizeCardValue(topCard.value);
        const isStarterSpecial =
          pile.length === 1 &&
          (normalizedTopValue === 'five' || normalizedTopValue === 'ten');
        newSignature = `SINGLE:${code(topCard)}${
          isStarterSpecial ? ':STARTER' : ''
        }`;
      }
    }

    // If signature hasn't changed, skip DOM updates
    if (playStack.dataset.pileSignature === newSignature) {
      return;
    }
    playStack.dataset.pileSignature = newSignature;

    // During initial deal, Draw pile must stay blank
    if (skeletonMode || forceBlank) {
      playStack.classList.remove('pile-multiple');
      playStack.innerHTML = '<div class="pile-placeholder"></div>';
      return;
    }

    if (topCard) {
      playStack.innerHTML = '';

      const shouldShowCopyShingle =
        Boolean((topCard as any).copied) && pile.length >= 2;
      if (shouldShowCopyShingle) {
        const belowCard = pile[pile.length - 2];

        const belowEl = cardImg(belowCard, false, undefined, true, false);
        belowEl.id = 'pile-below-card';
        belowEl.classList.add('pile-shingle', 'pile-shingle--below');

        const topEl = cardImg(topCard, false, undefined, true, false);
        topEl.id = 'pile-top-card';
        topEl.classList.add('pile-shingle', 'pile-shingle--top');

        playStack.classList.add('pile-multiple');
        playStack.appendChild(belowEl);
        playStack.appendChild(topEl);
      } else {
        const normalizedTopValue = normalizeCardValue(topCard.value);
        const isStarterSpecial =
          pile.length === 1 &&
          (normalizedTopValue === 'five' || normalizedTopValue === 'ten');

        const topEl = cardImg(topCard, false, undefined, true, false);
        topEl.id = 'pile-top-card';

        if (isStarterSpecial) {
          topEl.classList.add('card-container--special-inactive');
        }

        playStack.classList.remove('pile-multiple');
        playStack.appendChild(topEl);
      }
    } else {
      playStack.classList.remove('pile-multiple');
      playStack.innerHTML = '<div class="pile-placeholder"></div>';
    }
  }
}

/**
 * Helper to hide elements in skeleton mode
 */
function applySkeleton(element: HTMLElement | null, skeletonMode: boolean) {
  if (!element) return;

  // 1. Hide the main image
  const img = element.querySelector('.card-img') as HTMLElement;
  if (img) img.style.visibility = skeletonMode ? 'hidden' : 'visible';

  // 2. Hide the special ability icon
  const icon = element.querySelector('.card-ability-icon') as HTMLElement;
  if (icon) icon.style.visibility = skeletonMode ? 'hidden' : 'visible';

  // 3. For Up Cards, we might want to hide the container border too so it looks empty
  // (Currently optional - uncomment if you want slots to look 100% empty)
  // if (skeletonMode && element.classList.contains('up-card')) {
  //     element.style.visibility = 'hidden';
  // }
}

function updateStacks(
  stackRow: HTMLElement,
  upCards: (CardType | null)[],
  downCount: number,
  isLocal: boolean,
  isMyTurn: boolean,
  handCount: number,
  upCount: number,
  skeletonMode: boolean = false,
  playerId: string = ''
) {
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
    // Add target ID for animation
    const colEl = col as HTMLElement;
    colEl.id = `deal-target-${playerId}-down-${i}`;

    const hasDownCard = downCount > i;
    const canPlayDown =
      isLocal && hasDownCard && isMyTurn && handCount === 0 && upCount === 0;
    let existingDownContainer = col.querySelector(
      '.card-container.down-card'
    ) as HTMLElement | null;

    if (hasDownCard) {
      if (!existingDownContainer) {
        // New Card
        const downCard = cardImg(
          { value: '', suit: '', back: true } as CardType,
          canPlayDown,
          undefined,
          true,
          skeletonMode
        );
        downCard.classList.add('down-card');
        const downImg = downCard.querySelector('.card-img') as HTMLElement;
        if (downImg) downImg.classList.add('down-card');
        if (isLocal) {
          downCard.dataset.idx = String(i);
          downCard.dataset.zone = 'downCards';
          if (downImg) {
            downImg.dataset.idx = String(i);
            downImg.dataset.zone = 'downCards';
          }
        }
        col.insertBefore(downCard, col.firstChild);

        // Apply skeleton mode (will hide if needed)
        applySkeleton(downCard, skeletonMode);
      } else {
        // Existing Card - FORCE SKELETON CHECK
        applySkeleton(existingDownContainer as HTMLElement, skeletonMode);

        const cardFace = existingDownContainer.querySelector(
          '.card-img'
        ) as HTMLElement | null;

        if (isLocal) {
          existingDownContainer.dataset.idx = String(i);
          existingDownContainer.dataset.zone = 'downCards';
          if (cardFace) {
            cardFace.dataset.idx = String(i);
            cardFace.dataset.zone = 'downCards';
          }
        }

        if (cardFace) {
          if (canPlayDown && !cardFace.classList.contains('selectable')) {
            cardFace.classList.add('selectable');
            existingDownContainer.classList.add('selectable-container');
          } else if (
            !canPlayDown &&
            cardFace.classList.contains('selectable')
          ) {
            cardFace.classList.remove('selectable');
            existingDownContainer.classList.remove('selectable-container');
          }
        }
      }
    } else {
      if (existingDownContainer) existingDownContainer.remove();
    }

    const upCard = upCards[i];
    const canPlayUp = isLocal && Boolean(upCard) && isMyTurn && handCount === 0;
    let existingUpContainer = col.querySelector(
      '.card-container.up-card'
    ) as HTMLElement;

    if (upCard) {
      // Update target ID for up cards
      const colEl = col as HTMLElement;
      colEl.id = `deal-target-${playerId}-up-${i}`;

      const existingUpImg = existingUpContainer?.querySelector(
        '.card-img'
      ) as HTMLImageElement;
      const newVal = String(upCard.value);
      if (!existingUpImg || existingUpImg.dataset.value !== newVal) {
        if (existingUpContainer) existingUpContainer.remove();

        const upCardEl = cardImg(
          upCard,
          canPlayUp,
          undefined,
          true,
          skeletonMode
        );
        upCardEl.classList.add('up-card');
        const upImg = upCardEl.querySelector('.card-img') as HTMLElement;
        if (upImg) upImg.classList.add('up-card');
        if (isLocal) {
          upCardEl.dataset.idx = String(i);
          upCardEl.dataset.zone = 'upCards';
          upCardEl.dataset.value = newVal;
          if (upImg) {
            upImg.dataset.idx = String(i);
            upImg.dataset.zone = 'upCards';
            upImg.dataset.value = newVal;
          }
        }
        col.appendChild(upCardEl);

        // Apply skeleton mode (will hide if needed)
        applySkeleton(upCardEl, skeletonMode);
      } else {
        // Existing Card - FORCE SKELETON CHECK
        applySkeleton(existingUpContainer, skeletonMode);

        // FIX: Always update data attributes so clicks work
        if (isLocal && existingUpContainer) {
          existingUpContainer.dataset.idx = String(i);
          existingUpContainer.dataset.zone = 'upCards';
          existingUpContainer.dataset.value = newVal;
        }
        if (isLocal && existingUpImg) {
          existingUpImg.dataset.idx = String(i);
          existingUpImg.dataset.zone = 'upCards';
          existingUpImg.dataset.value = newVal;
        }

        if (canPlayUp && !existingUpImg.classList.contains('selectable')) {
          existingUpImg.classList.add('selectable');
          existingUpContainer?.classList.add('selectable-container');
        } else if (
          !canPlayUp &&
          existingUpImg.classList.contains('selectable')
        ) {
          existingUpImg.classList.remove('selectable');
          existingUpContainer?.classList.remove('selectable-container');
        }
      }
    } else {
      if (existingUpContainer) existingUpContainer.remove();
    }

    if (canPlayUp || canPlayDown) col.classList.add('playable-stack');
    else col.classList.remove('playable-stack');
  });
}

function updateHandRow(
  handRow: HTMLDivElement,
  cards: CardType[],
  isMyTurn: boolean,
  skeletonMode: boolean = false
) {
  const currentElements = Array.from(handRow.children) as HTMLDivElement[];

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
      // New Card
      const newCardEl = cardImg(card, isMyTurn, undefined, true, skeletonMode);
      newCardEl.style.zIndex = String(i + 1);
      const imgEl = newCardEl.querySelector('.card-img') as HTMLElement;
      if (imgEl) {
        imgEl.dataset.idx = String(i);
        imgEl.dataset.zone = 'hand';
        imgEl.dataset.value = String(
          normalizeCardValue(card.value) ?? card.value
        );
        imgEl.dataset.cardCode = card.back ? 'back' : code(card);
      }
      handRow.appendChild(newCardEl);

      // Apply skeleton mode (will hide if needed)
      applySkeleton(newCardEl, skeletonMode);
      continue;
    }

    // Defensive: undo optimistic "hide" styles from play animation if this element is reused.
    el.style.removeProperty('opacity');
    el.style.removeProperty('pointer-events');
    el.style.zIndex = String(i + 1);

    // Existing Card - FORCE SKELETON CHECK
    applySkeleton(el, skeletonMode);

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
      const currentCode = imgEl.dataset.cardCode;
      const newCode = card.back ? 'back' : code(card);

      // Update attributes on existing element so clicks work
      imgEl.dataset.idx = String(i);
      imgEl.dataset.zone = 'hand';
      imgEl.dataset.value = newVal;
      imgEl.dataset.cardCode = newCode;

      // NOTE: Using full card code avoids bugs when two cards share a rank (e.g., two 9s).
      if (currentCode !== newCode || currentVal !== newVal) {
        const newContent = cardImg(
          card,
          isMyTurn,
          undefined,
          true,
          skeletonMode
        );
        newContent.style.zIndex = String(i + 1);
        // FIX: Apply data-zone to replacement element
        const newImg = newContent.querySelector('.card-img') as HTMLElement;
        if (newImg) {
          newImg.dataset.idx = String(i);
          newImg.dataset.zone = 'hand';
          newImg.dataset.value = newVal;
          newImg.dataset.cardCode = newCode;
          if (isMyTurn) {
            newImg.classList.add('selectable');
            newContent.classList.add('selectable-container');
          }
        }

        applySkeleton(newContent, skeletonMode);
        handRow.replaceChild(newContent, el);
      }
    }
  }
}

export function renderPlayedCards(cards: CardType[]): void {
  const playStack = document.querySelector('.pile-cards.play-stack');
  if (!playStack || cards.length === 0) return;

  playStack.innerHTML = '';
  playStack.classList.remove('pile-multiple');
  const topCard = cards[cards.length - 1];
  const cardEl = cardImg(topCard, false, undefined, true);
  cardEl.id = 'pile-top-card';
  playStack.appendChild(cardEl);
}

export function isValidPlay(cards: CardType[], pile: CardType[]): boolean {
  if (!cards || cards.length === 0) return false;
  const firstValue = normalizeCardValue(cards[0].value);
  if (cards.some((card) => normalizeCardValue(card.value) !== firstValue))
    return false;
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

function hasValidUpPlay(
  upCards: Array<CardType | null>,
  pile: CardType[]
): boolean {
  if (!upCards || upCards.length === 0) return false;
  return upCards
    .filter((card): card is CardType => Boolean(card))
    .some((card) => isValidPlay([card], pile));
}

// --- FIXED COMPRESSION LOGIC (Prevents Flexing) ---
function applyHandCompression(
  panel: HTMLDivElement,
  handRow: HTMLDivElement,
  cardCount: number
): void {
  const handTray = panel.querySelector(
    '.hand-tray--local'
  ) as HTMLElement | null;

  if (cardCount <= 1) {
    if (handRow.classList.contains('hand-row--compressed')) {
      handRow.classList.remove('hand-row--compressed');
      handRow.style.removeProperty('--hand-overlap');
      lastHandCompressed = false;
      lastHandOverlap = 0;
    }
    handTray?.classList.remove('hand-tray--scroll');
    return;
  }

  const firstCard = handRow.querySelector(
    '.card-container'
  ) as HTMLDivElement | null;
  if (!firstCard) return;

  const widthHost = (handTray ?? handRow) as HTMLElement;
  const hostStyles = window.getComputedStyle(widthHost);
  const paddingLeft = parseFloat(hostStyles.paddingLeft) || 0;
  const paddingRight = parseFloat(hostStyles.paddingRight) || 0;
  const availableWidth = widthHost.clientWidth - paddingLeft - paddingRight;
  if (availableWidth <= 0) return;

  const cardWidth = firstCard.getBoundingClientRect().width;
  if (cardWidth === 0) return; // Not rendered yet

  const cardStyles = window.getComputedStyle(firstCard);
  const marginLeft = parseFloat(cardStyles.marginLeft) || 0;
  const marginRight = parseFloat(cardStyles.marginRight) || 0;
  const cardTotalWidth = cardWidth + marginLeft + marginRight;

  const rowStyles = window.getComputedStyle(handRow);
  const baseOverlap =
    parseFloat(rowStyles.getPropertyValue('--hand-base-overlap')) || -14;

  const requiredOverlap =
    (availableWidth - cardTotalWidth * cardCount) / (cardCount - 1);

  const naturalGap =
    parseFloat(rowStyles.getPropertyValue('--hand-natural-gap')) || 6;
  const requiredNoOverlapWidth =
    cardTotalWidth * cardCount + naturalGap * (cardCount - 1);

  // If the hand fits, keep a subtle shingle overlap for readability.
  if (requiredNoOverlapWidth <= availableWidth + 0.5) {
    const overlap = Math.min(baseOverlap, 0);
    const currentOverlap =
      parseFloat(handRow.style.getPropertyValue('--hand-overlap')) || 0;
    if (
      !handRow.classList.contains('hand-row--compressed') ||
      Math.abs(currentOverlap - overlap) > 0.5
    ) {
      handRow.classList.add('hand-row--compressed');
      handRow.style.setProperty('--hand-overlap', `${overlap}px`);
    }
    handTray?.classList.remove('hand-tray--scroll');
    lastHandCompressed = true;
    lastHandOverlap = overlap;
    return;
  }

  let overlap = Math.min(baseOverlap, requiredOverlap);

  const minPeek =
    parseFloat(rowStyles.getPropertyValue('--hand-min-peek')) || 32;
  const minOverlap = -Math.max(0, cardTotalWidth - minPeek);

  const needsScroll = overlap < minOverlap;
  if (needsScroll) overlap = minOverlap;
  if (needsScroll) handTray?.classList.add('hand-tray--scroll');
  else handTray?.classList.remove('hand-tray--scroll');

  // IMPORTANT: Only touch the DOM if values changed significantly
  const currentOverlap =
    parseFloat(handRow.style.getPropertyValue('--hand-overlap')) || 0;
  if (
    !handRow.classList.contains('hand-row--compressed') ||
    Math.abs(currentOverlap - overlap) > 0.5
  ) {
    handRow.classList.add('hand-row--compressed');
    handRow.style.setProperty('--hand-overlap', `${overlap}px`);
    // Update module memory for next render's cache
    lastHandCompressed = true;
    lastHandOverlap = overlap;
  }
}

export function animatePlayerPlay(cardElement: HTMLElement): Promise<void> {
  const pileEl =
    document.getElementById('pile-top-card') ||
    document.getElementById('discard-pile');
  if (!pileEl || !cardElement) return Promise.resolve();

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
      opacity: '1',
    });

    document.body.appendChild(flyer);

    const deltaX =
      endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
    const deltaY =
      endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);

    const animation = flyer.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
        {
          transform: `translate(${deltaX}px, ${deltaY}px) scale(0.6) rotate(10deg)`,
        },
      ],
      {
        duration: 450,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'forwards',
      }
    );

    animation.onfinish = () => {
      flyer.remove();
      resolve();
    };
  });

  activeFlyPromise = animationTask;
  return animationTask.then(() => {
    if (activeFlyPromise === animationTask) activeFlyPromise = null;
    return;
  });
}

export function animateCardFromPlayer(
  playerId: string,
  playedCards?: CardType[]
): Promise<void> {
  const animationTask = new Promise<void>((resolve) => {
    const pileEl =
      document.getElementById('pile-top-card') ||
      document.getElementById('discard-pile');
    const playerArea = document.querySelector(
      `.player-area[data-player-id="${playerId}"]`
    );

    if (!pileEl || !playerArea) {
      resolve();
      return;
    }

    let sourceEl: HTMLElement | null = null;

    if (playedCards && playedCards.length > 0) {
      const topVal = playedCards[playedCards.length - 1].value;
      const upCards = playerArea.querySelectorAll('.up-card');
      upCards.forEach((img) => {
        if ((img as HTMLElement).dataset.value === String(topVal)) {
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
      margin: '0',
    });

    document.body.appendChild(flyer);

    const deltaX =
      endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
    const deltaY =
      endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);

    const animation = flyer.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
        {
          transform: `translate(${deltaX}px, ${deltaY}px) scale(0.6) rotate(15deg)`,
        },
      ],
      {
        duration: 500,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'forwards',
      }
    );

    animation.onfinish = () => {
      flyer.remove();
      resolve();
    };
  });

  activeFlyPromise = animationTask;
  return animationTask.then(() => {
    if (activeFlyPromise === animationTask) activeFlyPromise = null;
    return;
  });
}

export function showCardEvent(
  cardValue: number | string | null,
  type: string,
  targetPlayerId?: string
): void {
  console.log('[showCardEvent] Starting - type:', type, 'value:', cardValue);
  let retries = 0;
  function tryRunEffect() {
    let discardImg = document.getElementById(
      'pile-top-card'
    ) as HTMLImageElement | null;
    const discardContainer = document.getElementById('discard-pile');

    if (!discardImg || discardImg.style.display === 'none') {
      discardImg = document.querySelector(
        '.discard .card-img'
      ) as HTMLImageElement | null;
    }

    const target =
      discardImg && discardImg.style.display !== 'none'
        ? discardImg
        : discardContainer;

    if (!target && retries < 5) {
      retries++;
      setTimeout(tryRunEffect, 100);
      return;
    }
    if (!target) return;

    function runEffect(effectTarget: HTMLElement) {
      const parentElement =
        effectTarget instanceof HTMLImageElement
          ? effectTarget.parentElement
          : effectTarget;
      if (!parentElement) return;

      const prev = parentElement.querySelector('.special-icon');
      if (prev) prev.remove();

      const icon = document.createElement('img');
      icon.className = 'special-icon';

      // For 'take' type, skip the icon and just do the animation
      if (type === 'take') {
        if (targetPlayerId) {
          animatePileToPlayer(targetPlayerId);
        }
        return;
      }

      let src = '';
      if (type === 'two') src = ICON_PATHS.two;
      else if (type === 'five') src = ICON_PATHS.five;
      else if (type === 'ten') src = ICON_PATHS.ten;
      else if (type === 'four') src = ICON_PATHS.four;
      else if (type === 'invalid') src = ICON_PATHS.invalid;
      else if (type === 'regular') return;

      icon.src = src;
      icon.onerror = () => {
        icon.remove();
      };

      Object.assign(icon.style, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '70px',
        height: '70px',
        zIndex: '100',
        pointerEvents: 'none',
        opacity: '0.85',
        filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.35))',
        animation: 'iconPulse 1.5s ease-in-out',
        display: 'block',
      });

      let iconColor = '#ffffff';
      if (type === 'two') iconColor = '#3b82f6';
      else if (type === 'five') iconColor = '#10b981';
      else if (type === 'ten') iconColor = '#ef4444';
      else if (type === 'four') iconColor = '#fbbf24';
      else if (type === 'invalid') iconColor = '#dc2626';
      icon.style.color = iconColor;

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
    if (target instanceof HTMLImageElement && !target.complete) {
      target.addEventListener('load', () => runEffect(target), { once: true });
    } else {
      runEffect(target);
    }
  }
  tryRunEffect();
}

function animatePileToPlayer(targetPlayerId: string): void {
  const pileEl =
    document.getElementById('pile-top-card') ||
    document.getElementById('discard-pile');
  const targetEl = document.querySelector(
    `.player-area[data-player-id="${targetPlayerId}"] .player-avatar`
  );

  if (!pileEl || !targetEl) return;

  const startRect = pileEl.getBoundingClientRect();
  const endRect = targetEl.getBoundingClientRect();

  const flyer = document.createElement('div');
  flyer.classList.add('flying-card');
  flyer.style.left = `${startRect.left}px`;
  flyer.style.top = `${startRect.top}px`;

  document.body.appendChild(flyer);

  const deltaX =
    endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
  const deltaY =
    endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);

  const animation = flyer.animate(
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      {
        transform: `translate(${deltaX}px, ${deltaY}px) scale(0.4) rotate(360deg)`,
        opacity: 0.5,
      },
    ],
    {
      duration: 600,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      fill: 'forwards',
    }
  );

  animation.onfinish = () => {
    flyer.remove();
  };
}

export function animateDeckToPlayPile(): void {
  const deckEl = document.getElementById('deck-pile');
  const playPileEl = document.getElementById('play-pile');

  console.log('🎴 Animating deck to play pile:', { deckEl, playPileEl });

  if (!deckEl || !playPileEl) {
    console.log('❌ Could not find deck or play pile elements for animation');
    return;
  }

  // Hide the play pile card during animation
  const playPileCard = playPileEl.querySelector('.card-container');
  if (playPileCard) {
    (playPileCard as HTMLElement).style.opacity = '0';
  }

  const startRect = deckEl.getBoundingClientRect();
  const endRect = playPileEl.getBoundingClientRect();

  const flyer = document.createElement('div');
  flyer.classList.add('flying-card');
  flyer.style.left = `${startRect.left}px`;
  flyer.style.top = `${startRect.top}px`;

  document.body.appendChild(flyer);

  const deltaX = endRect.left - startRect.left;
  const deltaY = endRect.top - startRect.top;

  const animation = flyer.animate(
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      {
        transform: `translate(${deltaX}px, ${deltaY}px) scale(1) rotate(5deg)`,
        opacity: 1,
      },
    ],
    {
      duration: 500,
      easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      fill: 'forwards',
    }
  );

  animation.onfinish = () => {
    flyer.remove();
    // Show the play pile card after animation completes
    if (playPileCard) {
      (playPileCard as HTMLElement).style.opacity = '1';
    }
  };
}

// Track last turn for turn change logging
let lastCurrentPlayerId: string | null = null;

export function renderGameState(
  gameState: GameStateData,
  localPlayerId: string | null,
  visualPileTop?: CardType | null,
  options: { skeletonMode?: boolean } = {}
): void {
  if (!gameState?.started) {
    lastLocalHandCount = -1;
    lastCurrentPlayerId = null; // Reset on game restart
  }

  // Track turn changes
  if (
    gameState.currentPlayerId &&
    gameState.currentPlayerId !== lastCurrentPlayerId
  ) {
    if (lastCurrentPlayerId !== null) {
      // Don't log on initial render
      logTurnChange(gameState.currentPlayerId, gameState.players);
    }
    lastCurrentPlayerId = gameState.currentPlayerId;
  }

  // --- HYBRID CAPTURE START ---
  let cachedOverlap = '';
  let cachedCompressed = false;

  // 1. Try DOM first (most accurate for current state)
  const existingLocalHand = document.querySelector(
    '#my-area .hand-row'
  ) as HTMLElement;
  if (existingLocalHand) {
    cachedOverlap = existingLocalHand.style.getPropertyValue('--hand-overlap');
    cachedCompressed = existingLocalHand.classList.contains(
      'hand-row--compressed'
    );
  }

  // 2. Fallback to Module Memory if DOM failed
  // (Fixes the "rapid update" race condition)
  if (!cachedOverlap && lastHandCompressed) {
    cachedOverlap = `${lastHandOverlap}px`;
    cachedCompressed = true;
  }
  // --- HYBRID CAPTURE END ---

  const table = document.querySelector(
    '#game-table .table'
  ) as HTMLElement | null;
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
  const centerArea = document.getElementById(
    'center-area'
  ) as HTMLElement | null;

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
    updateCenterArea(
      centerArea,
      gameState,
      visualPileTop,
      options.skeletonMode || false
    );
  }

  const players = gameState.players;
  if (table) table.dataset.playerCount = String(players.length);

  const meIdx = localPlayerId
    ? players.findIndex((p) => p.id === localPlayerId)
    : -1;
  const rotatedPlayers =
    meIdx >= 0
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
    const upCount =
      player.upCount ??
      (player.upCards ? player.upCards.filter(Boolean).length : 0);
    const downCount = player.downCount ?? player.downCards?.length ?? 0;
    const shouldDimTable = handCount > 0;
    const isForcedDown =
      isLocalPlayer &&
      isMyTurn &&
      handCount === 0 &&
      upCount === 0 &&
      downCount > 0;

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

      const handZone = document.createElement('div');
      handZone.className = 'player-zone player-zone--hand';
      if (isLocalPlayer) handZone.classList.add('player-zone--hand-local');
      handZone.innerHTML = `
             <div class="zone-label">Hand</div>
             <div class="hand-tray ${isLocalPlayer ? 'hand-tray--local' : ''}">
                 <div class="hand-row ${isLocalPlayer ? 'hand-row--local' : 'hand-row--opponent'}"></div>
             </div>`;

      // Best-in-class interaction space: keep the local player's header below the hand
      // so lifted/selected cards never collide with the avatar/name.
      const placeHeaderLast = seat === 'bottom' && isLocalPlayer;
      if (!placeHeaderLast) {
        panel.appendChild(header);
      }

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

      if (placeHeaderLast) {
        panel.appendChild(header);
      }

      slotTarget.appendChild(panel);
    }

    // 2. UPDATE ATTRIBUTES
    panel.dataset.playerId = player.id;
    panel.dataset.seat = seat;
    panel.style.setProperty('--seat-accent', seatAccents[seat] ?? '#f6c556');

    if (player.isComputer) panel.classList.add('computer-player');
    else panel.classList.remove('computer-player');

    // Flattened Class Logic: Apply standard class based on relationship
    panel.classList.toggle('player-area--opponent', !isLocalPlayer);
    panel.classList.toggle('player-area--local', isLocalPlayer);

    if (player.disconnected) panel.classList.add('disconnected');
    else panel.classList.remove('disconnected');

    // 3. UPDATE HEADER
    const nameEl = panel.querySelector('.player-name');
    if (nameEl) nameEl.textContent = player.name || player.id;

    const avatar = panel.querySelector('.player-avatar') as HTMLElement;
    if (avatar) {
      // Determine the target avatar value
      let avatarValue = player.avatar;
      if (!avatarValue) {
        avatarValue = player.isComputer ? robotAvatarUrl : playerAvatarUrl;
      }

      // Check if we already have this avatar rendered to avoid flickering
      const currentVal = avatar.dataset.currentAvatar;
      if (currentVal !== avatarValue) {
        // Update the tracker
        avatar.dataset.currentAvatar = avatarValue;

        // Clear previous content
        avatar.innerHTML = '';

        const isImageAvatar =
          /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(avatarValue) ||
          avatarValue.startsWith('/assets/');

        if (isImageAvatar) {
          // Preload image and append after it loads to avoid flashes
          const tmp = new Image();
          tmp.decoding = 'async';
          tmp.loading = 'eager';
          tmp.src = avatarValue;
          tmp.onload = () => {
            // Check if the avatar value hasn't changed while we were loading
            if (avatar.dataset.currentAvatar === avatarValue) {
              avatar.innerHTML = ''; // Ensure clean slate
              const img = document.createElement('img');
              img.className = 'image-avatar loaded';
              img.src = avatarValue!;
              img.alt = 'avatar';
              avatar.appendChild(img);
            }
          };
          tmp.onerror = () => {
            if (avatar.dataset.currentAvatar === avatarValue) {
              avatar.innerHTML = '';
              const emojiDiv = document.createElement('div');
              emojiDiv.className = 'emoji-avatar';
              emojiDiv.textContent = '👤';
              avatar.appendChild(emojiDiv);
            }
          };
        } else {
          const emojiDiv = document.createElement('div');
          emojiDiv.className = 'emoji-avatar';
          emojiDiv.textContent = avatarValue;
          avatar.appendChild(emojiDiv);
        }
      }
    }

    if (player.id === gameState.currentPlayerId) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
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
        updateHandRow(
          handRow,
          player.hand ?? [],
          isMyTurn,
          options.skeletonMode || false
        );

        // Only recalculate compression if hand count changed
        if (handCountChanged) {
          requestAnimationFrame(() =>
            applyHandCompression(panel, handRow, handCount)
          );
        }
      } else {
        // OPPONENT
        updateOpponentHandStack(
          handRow,
          handCount,
          options.skeletonMode || false
        );
      }
    }

    // 5. UPDATE TABLE STACKS
    const stackRow = panel.querySelector('.stack-row') as HTMLElement;
    if (stackRow) {
      if (shouldDimTable) stackRow.classList.add('dimmed-stacks');
      else stackRow.classList.remove('dimmed-stacks');

      if (isForcedDown) stackRow.classList.add('forced-down');
      else stackRow.classList.remove('forced-down');

      updateStacks(
        stackRow,
        player.upCards ?? [],
        downCount,
        isLocalPlayer,
        isMyTurn,
        handCount,
        upCount,
        options.skeletonMode,
        player.id
      );
    }

    // 6. UPDATE BUTTONS (Local)
    if (isLocalPlayer) {
      const playButton = panel.querySelector(
        '#play-button'
      ) as HTMLButtonElement;
      const takeButton = panel.querySelector(
        '#take-button'
      ) as HTMLButtonElement;

      if (playButton) playButton.disabled = !isMyTurn;
      if (takeButton) {
        let hasPlayable = false;
        if (handCount > 0)
          hasPlayable = hasValidHandPlay(
            player.hand ?? [],
            gameState.pile ?? []
          );
        else if (upCount > 0)
          hasPlayable = hasValidUpPlay(
            player.upCards ?? [],
            gameState.pile ?? []
          );

        const requiredZone =
          handCount > 0
            ? 'hand'
            : upCount > 0
              ? 'upCards'
              : downCount > 0
                ? 'downCards'
                : null;
        takeButton.disabled =
          !isMyTurn ||
          requiredZone === null ||
          requiredZone === 'downCards' ||
          hasPlayable;
      }
    }
  });

  // Ensure Branding/Rules (One-time)
  if (table) {
    const toggleGameLog = () => {
      const logPanel = document.getElementById('game-log');
      if (!logPanel) return;
      logPanel.style.display =
        logPanel.style.display === 'none' ? 'block' : 'none';
    };

    if (!table.querySelector('#table-rules-button')) {
      const rulesButton = document.createElement('button');
      rulesButton.id = 'table-rules-button';
      rulesButton.className = 'action-button action-button--rules';
      rulesButton.textContent = 'Rules';
      rulesButton.onclick = () =>
        document.dispatchEvent(new CustomEvent('open-rules-modal'));
      table.appendChild(rulesButton);
    }

    if (!table.querySelector('#table-history-button')) {
      const historyButton = document.createElement('button');
      historyButton.id = 'table-history-button';
      historyButton.className = 'action-button action-button--history';
      historyButton.textContent = 'Move History';
      historyButton.onclick = toggleGameLog;
      table.appendChild(historyButton);
    }

    // Mobile: hamburger menu (Rules + Move History)
    if (!table.querySelector('#table-menu-button')) {
      const menuButton = document.createElement('button');
      menuButton.id = 'table-menu-button';
      menuButton.className = 'action-button action-button--menu';
      menuButton.type = 'button';
      menuButton.title = 'Menu';
      menuButton.setAttribute('aria-label', 'Menu');
      menuButton.setAttribute('aria-haspopup', 'menu');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.textContent = '☰';
      table.appendChild(menuButton);
    }

    if (!table.querySelector('#table-menu-panel')) {
      const menuPanel = document.createElement('div');
      menuPanel.id = 'table-menu-panel';
      menuPanel.className = 'table-menu-panel';
      menuPanel.innerHTML = `
        <button type="button" class="table-menu-item" data-action="rules">Rules</button>
        <button type="button" class="table-menu-item" data-action="history">Move History</button>
      `;
      table.appendChild(menuPanel);
    }

    if (!table.querySelector('#table-menu-backdrop')) {
      const backdrop = document.createElement('div');
      backdrop.id = 'table-menu-backdrop';
      backdrop.className = 'table-menu-backdrop';
      table.appendChild(backdrop);
    }

    const menuButton = table.querySelector(
      '#table-menu-button'
    ) as HTMLButtonElement | null;
    const menuPanel = table.querySelector(
      '#table-menu-panel'
    ) as HTMLDivElement | null;
    const menuBackdrop = table.querySelector(
      '#table-menu-backdrop'
    ) as HTMLDivElement | null;

    const setMenuOpen = (open: boolean) => {
      if (!menuButton || !menuPanel || !menuBackdrop) return;
      menuPanel.classList.toggle('is-open', open);
      menuBackdrop.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    if (menuButton && menuPanel && menuBackdrop && !menuPanel.dataset.bound) {
      menuPanel.dataset.bound = 'true';

      menuButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(!menuPanel.classList.contains('is-open'));
      });

      menuBackdrop.addEventListener('click', () => setMenuOpen(false));

      menuPanel.addEventListener('click', (e) => {
        const target = e.target as HTMLElement | null;
        const action = target?.getAttribute('data-action');
        if (!action) return;

        if (action === 'rules') {
          document.dispatchEvent(new CustomEvent('open-rules-modal'));
          setMenuOpen(false);
          return;
        }

        if (action === 'history') {
          toggleGameLog();
          setMenuOpen(false);
        }
      });
    }

    if (!tableMenuEscapeListenerAttached) {
      tableMenuEscapeListenerAttached = true;
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const menuPanel = document.getElementById('table-menu-panel');
        const menuBackdrop = document.getElementById('table-menu-backdrop');
        const menuButton = document.getElementById('table-menu-button');
        if (!menuPanel || !menuBackdrop) return;
        if (!menuPanel.classList.contains('is-open')) return;
        menuPanel.classList.remove('is-open');
        menuBackdrop.classList.remove('is-open');
        if (menuButton) menuButton.setAttribute('aria-expanded', 'false');
      });
    }

    // Initialize game log panel (hidden by default)
    if (!document.getElementById('game-log')) {
      const logPanel = document.createElement('div');
      logPanel.id = 'game-log';
      logPanel.style.display = 'none'; // Start hidden
      logPanel.innerHTML = `
          <div class="game-log-header">
            <h3>Move History</h3>
            <div class="game-log-controls">
              <button id="game-log-minimize" class="game-log-minimize-btn" title="Minimize">−</button>
              <button id="game-log-clear" class="game-log-clear-btn" title="Close">×</button>
            </div>
          </div>
          <div id="game-log-entries" class="game-log-entries">
            <div class="game-log-empty">No moves yet...</div>
          </div>
        `;
      table.appendChild(logPanel);

      // Add minimize button handler
      const minimizeBtn = document.getElementById('game-log-minimize');
      if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
          const logPanel = document.getElementById('game-log');
          const entriesContainer = document.getElementById('game-log-entries');
          if (logPanel && entriesContainer) {
            gameLogMinimized = !gameLogMinimized;
            if (gameLogMinimized) {
              logPanel.classList.add('game-log--minimized');
              minimizeBtn.textContent = '+';
              minimizeBtn.title = 'Expand';
            } else {
              logPanel.classList.remove('game-log--minimized');
              minimizeBtn.textContent = '−';
              minimizeBtn.title = 'Minimize';
            }
          }
        });
      }

      // Add clear button handler
      const clearBtn = document.getElementById('game-log-clear');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          const logPanel = document.getElementById('game-log');
          if (logPanel) {
            logPanel.style.display = 'none';
          }
        });
      }
    }
  }

  // Ensure branding outside the table border
  const gameTable = document.getElementById('game-table');
  if (gameTable && !gameTable.querySelector('#table-branding')) {
    const branding = document.createElement('div');
    branding.id = 'table-branding';
    branding.innerHTML = `
      <img src="${crownIconUrl}" class="branding-crown" alt="Crown" />
      <div class="branding-title">Top That!</div>
      <div class="branding-slogan">One Crown. Zero Mercy.</div>
    `;
    gameTable.appendChild(branding);
  }
}

export function animateVictory(winnerId: string): void {
  // 1. Create Overlay
  const overlay = document.createElement('div');
  overlay.className = 'victory-overlay';

  // 2. Get Winner Info
  const playerArea = document.querySelector(
    `.player-area[data-player-id="${winnerId}"]`
  );
  const playerName =
    playerArea?.querySelector('.player-name')?.textContent || 'Winner';

  // 3. Construct HTML
  overlay.innerHTML = `
    <div class="victory-content">
      <img src="${crownIconUrl}" class="victory-crown" alt="Crown">
      <h1 class="victory-title">The Crown is Taken!</h1>
      <div class="victory-winner">${playerName}</div>
      <button id="victory-restart-btn" class="action-button">Play Again</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // 4. Attach Event Listener for Restart
  const btn = overlay.querySelector('#victory-restart-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      window.location.reload();
    });
  }

  // 5. Trigger Animation Frame
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
  });
}

export function playArea() {}
export function lobbyLink() {}
