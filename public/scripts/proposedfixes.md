// File: public/scripts/card.ts
// Change: import { Card } from '@srcTypes/types.js';
// To: import { Card } from '@srcTypes/types';
// (Assuming @srcTypes/types resolves to src/types.ts)

// Original line 2:
// import { Card } from '@srcTypes/types.js'; // Use path alias
// Corrected line 2:
import { Card } from '@srcTypes/types'; // Use path alias

/**
 * Creates a card element with appropriate styling and behavior
 * @param {Card} card - Card data (value, suit, or {back: true})
 * @param {boolean} selectable - Whether the card can be selected
 * @param {(card: Card, selected: boolean) => void | null} onSelect - Optional callback when card is selected
 * @returns {HTMLDivElement} The card container element
 */
export function createCardElement(
  card: Card,
  selectable = false,
  onSelect: ((card: Card, selected: boolean) => void) | null = null
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'card-container';

  const img = document.createElement('img');
  img.className = 'card-img';

  // Handle back of card vs face
  if (card.back) {
    img.src = '/assets/cards/back.png'; // Ensure this path is correct relative to your public dir
    img.alt = 'Card Back';
  } else {
    // Format card values for image src
    const value = formatCardValue(card.value);
    const suit = card.suit.toLowerCase();
    img.src = `/assets/cards/${value}_of_${suit}.png`; // Ensure this path is correct
    img.alt = `${value} of ${suit}`;

    // Handle copied cards (e.g., 5s effect)
    if (card.copied) {
      img.classList.add('copied-card');
    }
  }

  // Make card selectable if needed
  if (selectable) {
    img.classList.add('selectable');
    img.style.touchAction = 'manipulation';

    container.addEventListener('click', () => {
      img.classList.toggle('selected');
      container.classList.toggle('selected-container', img.classList.contains('selected'));

      if (onSelect) onSelect(card, img.classList.contains('selected'));
    });
  }

  container.appendChild(img);
  return container;
}

/**
 * Formats card value for file naming
 * @param {string | number} value - Card value (e.g., 2, 10, J, Q, K, A)
 * @returns {string} Formatted card value
 */
export function formatCardValue(value: string | number): string {
  const v = String(value).toLowerCase();
  if (v === 'j' || v === 'jack') return 'jack';
  if (v === 'q' || v === 'queen') return 'queen';
  if (v === 'k' || v === 'king') return 'king';
  if (v === 'a' || v === 'ace') return 'ace';
  return v;
}
```typescript
// File: public/scripts/render.ts
// Change: import { Card as CardType } from '@srcTypes/types.js';
// To: import { Card as CardType } from '@srcTypes/types';
// Change: import GameStateType from '@models/GameState.js';
// To: import GameStateType from '@models/GameState';
// Change: import PlayerType from '@models/Player.js';
// To: import PlayerType from '@models/Player';

// Original lines 2-4:
// import { Card as CardType } from '@srcTypes/types.js';
// import GameStateType from '@models/GameState.js'; // Reverted to default import
// import PlayerType from '@models/Player.js'; // Reverted to default import
// Corrected lines 2-4:
import { Card as CardType } from '@srcTypes/types';
import GameStateType from '@models/GameState';
import PlayerType from '@models/Player';


// Convert {value:'A',suit:'hearts'} → "AH", 10→"0"
function code(card: CardType): string {
  // This function is only called by cardImg when card.back is false.
  // So, we expect card.value and card.suit to be present.
  if (card.value === null || card.value === undefined || card.suit === null || card.suit === undefined) {
    // Handle cases where card value or suit might be missing if card.back is false,
    // though ideally this shouldn't happen if logic is correct.
    return 'ERR'; // Or some other error indicator
  }
  const v = String(card.value).toUpperCase() === '10' ? '0' : String(card.value).toUpperCase();
  const suitMap: { [key: string]: string } = { hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S' };
  const s = suitMap[card.suit.toLowerCase() as keyof typeof suitMap];
  if (!s) return 'ERR'; // Handle invalid suit
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
    ? '[https://deckofcardsapi.com/static/img/back.png](https://deckofcardsapi.com/static/img/back.png)'
    : `https://deckofcardsapi.com/static/img/${code(card)}.png`;
  img.alt = card.back ? 'Card back' : `${card.value} of ${card.suit}`;
  // console.log('cardImg input:', card, 'Output src:', img.src); // Debugging
  img.onload = () => {
    img.style.visibility = 'visible';
    if (onLoad) onLoad(img);
  };
  img.onerror = () => { // Fallback for image load errors
    img.style.visibility = 'visible'; // Show alt text or placeholder
    img.alt = `Error loading ${img.alt}`;
    // Optionally set a placeholder background or text
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
 * @param {GameStateType} gameState - Current game state
 */
export function createCenterPiles(gameState: GameStateType): void {
  const center = document.getElementById('center');
  if (!center) return;
  center.innerHTML = ''; // Clear previous content

  const wrapper = document.createElement('div');
  wrapper.className = 'center-piles-wrapper';

  // Create deck pile with label
  const deckContainer = createPileContainer('Deck', gameState.deck?.length || 0);
  const deckPile = createPile('deck');
  if (gameState.deck && gameState.deck.length > 0) {
    deckPile.appendChild(cardImg({ value: '', suit: '', back: true } as CardType, false)); // Provide dummy value/suit for back card
  }
  deckContainer.appendChild(deckPile);

  // Create discard pile with label
  const discardContainer = createPileContainer('Discard', gameState.discard?.length || 0);
  const discardPile = createPile('discard');
  if (gameState.pile && gameState.pile.length > 0) { // Changed from gameState.discard to gameState.pile
    discardPile.appendChild(cardImg(gameState.pile[gameState.pile.length - 1], false));
  } else if (gameState.discard && gameState.discard.length > 0) { // Fallback to discard if pile is empty but discard isn't (e.g. after burn)
     discardPile.appendChild(cardImg(gameState.discard[gameState.discard.length - 1], false));
  }


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
 * @param {GameStateType} gameState - Full game state (should be ClientState from controller)
 */
export function renderGameState(gameState: any): void { // Changed GameStateType to any for now, should be ClientState
  // console.log('Rendering game state:', gameState);

  const slotTop = document.querySelector('.table-slot-top') as HTMLElement | null;
  const slotBottom = document.querySelector('.table-slot-bottom') as HTMLElement | null;
  const slotLeft = document.querySelector('.table-slot-left') as HTMLElement | null;
  const slotRight = document.querySelector('.table-slot-right') as HTMLElement | null;
  if (slotTop) slotTop.innerHTML = '';
  if (slotBottom) slotBottom.innerHTML = '';
  if (slotLeft) slotLeft.innerHTML = '';
  if (slotRight) slotRight.innerHTML = '';

  document.querySelectorAll('.player-area.active').forEach((el) => el.classList.remove('active'));

  const myId = window.sessionStorage.getItem('myId'); // Assuming myId is stored in session storage
  const players = gameState.players as any[]; // Should be ClientStatePlayer[]
  const playerCount = players.length;
  const meIdx = players.findIndex((p: any) => p.id === myId);

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
    return 'bottom'; // Default or for 1 player (though game needs >=2)
  }

  players.forEach((p: any, idx: number) => { // p should be ClientStatePlayer
    const seat = seatFor(idx);
    let panel = document.createElement('div');
    panel.className = 'player-area' + (p.isComputer ? ' computer-player' : '');
    panel.dataset.playerId = p.id;
    if (seat === 'bottom' && p.id === myId) panel.id = 'my-area';
    if (p.isComputer) panel.classList.add('computer-player');
    if (p.disconnected) panel.classList.add('disconnected');
    if (p.id === gameState.currentPlayerId) { // Use gameState.currentPlayerId
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
    
    // Render actual hand for self, or placeholders for others
    const handCardsToRender = p.id === myId ? p.hand : Array(p.handCount || 0).fill({ back: true });

    if (handCardsToRender && handCardsToRender.length > 0) {
      for (let i = 0; i < handCardsToRender.length; i++) {
        const card = handCardsToRender[i];
        // My hand cards are selectable if it's my turn
        const canInteract = p.id === myId && gameState.currentPlayerId === myId;
        const cardElement = cardImg(card, canInteract && !card.back); // Only make face-up cards selectable
        if (p.id === myId && !card.back) { // Only add data-idx to actual hand cards
            const imgEl = cardElement.querySelector('.card-img');
            if (imgEl && imgEl instanceof HTMLImageElement) imgEl.dataset.idx = String(i);
        }
        handRow.appendChild(cardElement);
      }
    }


    const handLabel = document.createElement('div');
    handLabel.className = 'row-label';
    handLabel.textContent = `Hand (${p.handCount || 0})`; // Use handCount
    panel.appendChild(handLabel);
    panel.appendChild(handRow);

    const stackRow = document.createElement('div');
    stackRow.className = 'stack-row';
    // Up cards (always visible)
    if (p.upCards && p.upCards.length > 0) {
      p.upCards.forEach((c: CardType, i: number) => {
        const col = document.createElement('div');
        col.className = 'stack';
        // Corresponding down card (always show back)
        if (p.downCount > i) { // Check if a down card exists for this up card
            const downCardElement = cardImg({ value: '', suit: '', back: true } as CardType, false);
            const downImg = downCardElement.querySelector('.card-img');
            if (downImg) downImg.classList.add('down-card');
            col.appendChild(downCardElement);
        }
        // Up card
        const canPlayUp = p.id === myId && gameState.currentPlayerId === myId && (p.handCount === 0);
        const upCardElement = cardImg(c, canPlayUp);
        const upImg = upCardElement.querySelector('.card-img');
        if (upImg && upImg instanceof HTMLImageElement) {
          upImg.classList.add('up-card');
          if (p.id === myId) upImg.dataset.idx = String(i + 1000);
        }
        col.appendChild(upCardElement); // Up card on top
        if (canPlayUp) col.classList.add('playable-stack');
        stackRow.appendChild(col);
      });
    } else if (p.downCount && p.downCount > 0) { // Only down cards visible (up cards are gone)
      for (let i = 0; i < p.downCount; i++) {
        const col = document.createElement('div');
        col.className = 'stack';
        const canPlayDown = p.id === myId && gameState.currentPlayerId === myId && (p.handCount === 0) && (p.upCount === 0);
        // For down cards, only the first one might be selectable if it's the player's turn and other cards are gone.
        // However, the actual card is unknown, so selection happens on click, then revealed.
        // For rendering, we just show backs. Selection logic is handled elsewhere.
        const downCardElement = cardImg({ value: '', suit: '', back: true } as CardType, canPlayDown && i === 0);
        const downImg = downCardElement.querySelector('.card-img');
        if (downImg && downImg instanceof HTMLImageElement) {
          downImg.classList.add('down-card');
          if (p.id === myId) downImg.dataset.idx = String(i + 2000); // Special index for down cards
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
```typescript
// File: tests/cardUtils.test.ts
// Change: import { ... } from '../utils/cardUtils';
// To: import { ... } from '../utils/cardUtils.js';
// Change: import { Card } from '../src/types';
// To: import { Card } from '../src/types.js';

import {
  normalizeCardValue,
  rank,
  isTwoCard,
  isFiveCard,
  isTenCard,
  isSpecialCard,
  isFourOfAKind,
} from '../utils/cardUtils.js'; // Added .js
import { Card } from '../src/types.js'; // Added .js

describe('normalizeCardValue', () => {
  test('normalizes string numbers to keywords where applicable', () => {
    expect(normalizeCardValue('2')).toBe('two');
    expect(normalizeCardValue('5')).toBe('five');
    expect(normalizeCardValue('10')).toBe('ten');
    expect(normalizeCardValue('3')).toBe('3');
  });

  test('normalizes actual numbers to keywords or stringified numbers', () => {
    expect(normalizeCardValue(2)).toBe('two');
    expect(normalizeCardValue(5)).toBe('five');
    expect(normalizeCardValue(10)).toBe('ten');
    expect(normalizeCardValue(7)).toBe('7');
  });

  test('normalizes mixed case face cards to single lowercase letter', () => {
    expect(normalizeCardValue('J')).toBe('j');
    expect(normalizeCardValue('q')).toBe('q');
    expect(normalizeCardValue('King')).toBe('k');
    expect(normalizeCardValue('ACE')).toBe('a');
    expect(normalizeCardValue('jack')).toBe('j');
    expect(normalizeCardValue('queen')).toBe('q');
    expect(normalizeCardValue('king')).toBe('k');
    expect(normalizeCardValue('ace')).toBe('a');
  });

  test('handles null and undefined', () => {
    expect(normalizeCardValue(null)).toBeNull();
    expect(normalizeCardValue(undefined)).toBeUndefined();
  });

  test('handles empty string', () => {
    expect(normalizeCardValue('')).toBe('');
  });
});

describe('rank', () => {
  const createCard = (value: string | number, suit = 'hearts'): Card => {
    return { value, suit };
  };

  test('correctly ranks numeric cards', () => {
    expect(rank(createCard('3'))).toBe(3);
    expect(rank(createCard(8, 'spades'))).toBe(8);
  });

  test('correctly ranks special cards', () => {
    expect(rank(createCard('2'))).toBe(2);
    expect(rank(createCard('5', 'diamonds'))).toBe(5);
    expect(rank(createCard('10', 'clubs'))).toBe(10);
  });

  test('correctly ranks face cards (after normalization to single letter)', () => {
    expect(rank(createCard('J'))).toBe(11);
    expect(rank(createCard('Queen'))).toBe(12);
    expect(rank(createCard('king', 'clubs'))).toBe(13);
    expect(rank(createCard('ACE', 'spades'))).toBe(14);
  });

  test('rank returns 0 for unrankable or invalid card values', () => {
    expect(rank(createCard(null as any))).toBe(0);
    expect(rank(createCard(undefined as any))).toBe(0);
    expect(rank(createCard('xyz'))).toBe(0);
    expect(rank({ value: {}, suit: 'hearts' } as any)).toBe(0);
  });
});

describe('isSpecialCard type checks', () => {
  test('isTwoCard', () => {
    expect(isTwoCard('2')).toBe(true);
    expect(isTwoCard(2)).toBe(true);
    expect(isTwoCard('two')).toBe(true);
    expect(isTwoCard('3')).toBe(false);
    expect(isTwoCard(null)).toBe(false);
  });
  test('isFiveCard', () => {
    expect(isFiveCard('5')).toBe(true);
    expect(isFiveCard(5)).toBe(true);
    expect(isFiveCard('five')).toBe(true);
    expect(isFiveCard('6')).toBe(false);
    expect(isFiveCard(undefined)).toBe(false);
  });
  test('isTenCard', () => {
    expect(isTenCard('10')).toBe(true);
    expect(isTenCard(10)).toBe(true);
    expect(isTenCard('ten')).toBe(true);
    expect(isTenCard('J')).toBe(false);
  });
  test('isSpecialCard', () => {
    expect(isSpecialCard('2')).toBe(true);
    expect(isSpecialCard(5)).toBe(true);
    expect(isSpecialCard('ten')).toBe(true);
    expect(isSpecialCard('ace')).toBe(false);
    expect(isSpecialCard('king')).toBe(false);
  });
});

describe('isFourOfAKind', () => {
  const createHand = (
    values: (string | number | null | undefined)[],
    suitPrefix = 's'
  ): Card[] => {
    return values.map((value, index) => ({
      value: value as string | number,
      suit: `${suitPrefix}${index}`,
    }));
  };

  test('returns true for four of a kind (numeric, normalized to same string)', () => {
    const hand: Card[] = [
      { value: '7', suit: 'hearts' },
      { value: 7, suit: 'diamonds' },
      { value: '7', suit: 'clubs' },
      { value: '7', suit: 'spades' },
    ];
    expect(isFourOfAKind(hand)).toBe(true);
  });

  test('returns true for face cards that normalize IDENTICALLY (e.g., all to "k")', () => {
    expect(isFourOfAKind(createHand(['K', 'king', 'k', 'KING']))).toBe(true);
    expect(isFourOfAKind(createHand(['A', 'ace', 'a', 'ACE']))).toBe(true);
  });

  test('returns false for less than 4 cards', () => {
    const hand: Card[] = createHand(['A', 'A', 'A']);
    expect(isFourOfAKind(hand)).toBe(false);
  });

  test('returns false for not four of a kind', () => {
    const hand: Card[] = createHand(['ACE', 'King', 'Queen', 'Jack']);
    expect(isFourOfAKind(hand)).toBe(false);
  });

  test('returns false for an empty hand', () => {
    expect(isFourOfAKind([])).toBe(false);
  });

  test('returns false if any card value results in null/undefined after normalization', () => {
    const handWithInvalidValueForNorm: Card[] = [
      { value: null as any, suit: 's1' },
      { value: 'K', suit: 's2' },
      { value: 'K', suit: 's3' },
      { value: 'K', suit: 's4' },
    ];
    expect(isFourOfAKind(handWithInvalidValueForNorm)).toBe(false);

    const handWithOtherInvalid: Card[] = [
      { value: 'K', suit: 's1' },
      { value: undefined as any, suit: 's2' },
      { value: 'K', suit: 's3' },
      { value: 'K', suit: 's4' },
    ];
    expect(isFourOfAKind(handWithOtherInvalid)).toBe(false);
  });

  test('isFourOfAKind works for non-keyword numbers that normalize to same string', () => {
    const handThrees: Card[] = createHand([3, '3', 3, '3']);
    expect(isFourOfAKind(handThrees)).toBe(true);
  });

  test('isFourOfAKind for specific keywords like "two"', () => {
    const handTwos: Card[] = createHand(['2', 2, 'two', '2']);
    expect(isFourOfAKind(handTwos)).toBe(true);
  });
});
```typescript
// File: tests/lobbyForm.test.ts
// Change: import { JOIN_GAME } from '../src/shared/events';
// To: import { JOIN_GAME } from '../src/shared/events.js';

/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { fireEvent } from '@testing-library/dom';

const mockEmit = jest.fn();
const mockOn = jest.fn();

jest.mock('../public/scripts/state.js', () => {
  return {
    socket: { emit: jest.fn(), on: jest.fn() },
    loadSession: jest.fn(),
    $: jest.fn((selector: string) =>
      global.document ? global.document.querySelector(selector) : null
    ),
    getCopyLinkBtn: jest.fn(() =>
      global.document ? global.document.createElement('button') : null
    ),
    getRulesButton: jest.fn(() =>
      global.document ? global.document.createElement('button') : null
    ),
    getRulesModal: jest.fn(() => (global.document ? global.document.createElement('div') : null)),
    getBackToLobbyButton: jest.fn(() =>
      global.document ? global.document.createElement('button') : null
    ),
  };
});

jest.mock('../src/shared/events.js', () => ({ // Keep .js here as it's what would be resolved by NodeNext from a .js file if it were JS
  __esModule: true,
  JOIN_GAME: 'join-game',
  START_GAME: 'start-game',
}));

// Original line 47:
// import { JOIN_GAME } from '../src/shared/events'; // Import from the actual (now .ts) module
// Corrected line 47:
import { JOIN_GAME } from '../src/shared/events.js'; // Import from the actual (now .ts) module, with .js for NodeNext resolution

import '../public/scripts/events.js';

import * as state from '../public/scripts/state.js';

describe('Lobby Form Submission', () => {
  let lobbyForm: HTMLFormElement;
  let nameInput: HTMLInputElement;
  let numHumansInput: HTMLInputElement;
  let numCPUsInput: HTMLInputElement;
  let submitButton: HTMLButtonElement;
  let nameInputError: HTMLElement;
  let playerCountError: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="lobby-form">
        <input type="text" id="name-input" />
        <div id="name-input-error" class="error-message hidden"></div>
        <input type="number" id="total-players-input" value="1" data-testid="total-players-input" />
        <input type="number" id="cpu-players-input" value="0" data-testid="cpu-players-input" />
        <button id="join-game-button" type="submit">Play Game</button>
        <div id="player-count-error" class="error-message hidden"></div>
      </form>
    `;
    lobbyForm = document.getElementById('lobby-form') as HTMLFormElement;
    nameInput = document.getElementById('name-input') as HTMLInputElement;
    numHumansInput = document.getElementById('total-players-input') as HTMLInputElement;
    numCPUsInput = document.getElementById('cpu-players-input') as HTMLInputElement;
    submitButton = document.getElementById('join-game-button') as HTMLButtonElement;
    nameInputError = document.getElementById('name-input-error') as HTMLElement;
    playerCountError = document.getElementById('player-count-error') as HTMLElement;

    if (state.socket) {
      (state.socket.emit as jest.Mock) = mockEmit;
      (state.socket.on as jest.Mock) = mockOn;
    }
    mockEmit.mockClear();
    mockOn.mockClear();

    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  it('shows error if name is empty', () => {
    nameInput.value = '';
    fireEvent.submit(lobbyForm);
    expect(nameInputError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if name is too short (assuming min length 2 in client script)', () => {
    nameInput.value = 'A';
    fireEvent.submit(lobbyForm);
    expect(nameInputError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if total players (humans in this form) < 1', () => {
    nameInput.value = 'Chris';
    numHumansInput.value = '0';
    fireEvent.submit(lobbyForm);
    expect(playerCountError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if total players (humans + CPUs) < 2', () => {
    nameInput.value = 'Chris';
    numHumansInput.value = '1';
    numCPUsInput.value = '0';
    fireEvent.submit(lobbyForm);
    expect(playerCountError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if total players (humans + CPUs) > 4', () => {
    nameInput.value = 'Chris';
    numHumansInput.value = '3';
    numCPUsInput.value = '2'; // Total 5
    fireEvent.submit(lobbyForm);
    expect(playerCountError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('emits JOIN_GAME with correct data and disables button on valid input', () => {
    nameInput.value = 'ChrisP';
    numHumansInput.value = '1';
    numCPUsInput.value = '1';

    fireEvent.submit(lobbyForm);

    expect(nameInputError).toHaveClass('hidden');
    expect(playerCountError).toHaveClass('hidden');
    expect(mockEmit).toHaveBeenCalledWith(JOIN_GAME, {
      name: 'ChrisP',
      numHumans: 1,
      numCPUs: 1,
    });
    expect(submitButton.disabled).toBe(true);
  });
});
```typescript
// File: tests/player.test.ts
// Change: import Player from '../models/Player';
// To: import Player from '../models/Player.js';
// Change: import { Card } from '../src/types';
// To: import { Card } from '../src/types.js';

// Original lines 3-4:
// import Player from '../models/Player'; // CORRECTED IMPORT (no .js)
// import { Card } from '../src/types'; // Import Card type
// Corrected lines 3-4:
import Player from '../models/Player.js';
import { Card } from '../src/types.js';


describe('Player model', () => {
  let p: Player;

  beforeEach(() => {
    p = new Player('test-id-1');
  });

  test('initializes with an id and empty card arrays', () => {
    expect(p.id).toBe('test-id-1');
    expect(p.hand).toEqual([]);
    expect(p.upCards).toEqual([]);
    expect(p.downCards).toEqual([]);
    expect(p.name).toBe('');
    expect(p.isComputer).toBe(false);
    expect(p.disconnected).toBe(false);
  });

  test('setHand replaces hand and sorts it', () => {
    const cards: Card[] = [
      { value: 'K', suit: 'hearts' },
      { value: '2', suit: 'spades' },
    ];
    p.setHand(cards);
    const expectedHand: Card[] = [
      { value: '2', suit: 'spades' },
      { value: 'K', suit: 'hearts' },
    ];
    expect(p.hand).toEqual(expectedHand);
  });

  test('setUpCards replaces upCards', () => {
    const cards: Card[] = [{ value: 'A', suit: 'clubs' }];
    p.setUpCards(cards);
    expect(p.upCards).toEqual(cards);
  });

  test('setDownCards replaces downCards', () => {
    const cards: Card[] = [{ value: '5', suit: 'diamonds' }];
    p.setDownCards(cards);
    expect(p.downCards).toEqual(cards);
  });

  describe('playing cards', () => {
    const handCard: Card = { value: '10', suit: 'hearts' };
    const upCard: Card = { value: 'J', suit: 'clubs' };
    const downCard: Card = { value: '3', suit: 'spades' };

    beforeEach(() => {
      p.setHand([handCard]);
      p.setUpCards([upCard]);
      p.setDownCards([downCard]);
    });

    test('playFromHand removes and returns card from hand', () => {
      const played = p.playFromHand(0);
      expect(played).toEqual(handCard);
      expect(p.hand).toEqual([]);
    });

    test('playUpCard removes and returns card from upCards', () => {
      const played = p.playUpCard(0);
      expect(played).toEqual(upCard);
      expect(p.upCards).toEqual([]);
    });

    test('playDownCard removes and returns a random card from downCards', () => {
      const played = p.playDownCard();
      expect(played).toEqual(downCard);
      expect(p.downCards).toEqual([]);
    });
  });

  test('pickUpPile adds cards to hand and re-sorts', () => {
    p.setHand([{ value: 'Q', suit: 'hearts' }]);
    const pile: Card[] = [
      { value: '3', suit: 'diamonds' },
      { value: 'A', suit: 'spades' },
    ];
    p.pickUpPile(pile);
    const expectedHand: Card[] = [
      { value: '3', suit: 'diamonds' },
      { value: 'Q', suit: 'hearts' },
      { value: 'A', suit: 'spades' },
    ];
    expect(p.hand).toEqual(expectedHand);
  });

  describe('empty checks', () => {
    const testCard: Card = { value: '2', suit: 'hearts' };
    test('hasEmptyHand', () => {
      expect(p.hasEmptyHand()).toBe(true);
      p.setHand([testCard]);
      expect(p.hasEmptyHand()).toBe(false);
    });

    test('hasEmptyUp', () => {
      expect(p.hasEmptyUp()).toBe(true);
      p.setUpCards([testCard]);
      expect(p.hasEmptyUp()).toBe(false);
    });

    test('hasEmptyDown', () => {
      expect(p.hasEmptyDown()).toBe(true);
      p.setDownCards([testCard]);
      expect(p.hasEmptyDown()).toBe(false);
    });
  });
});
```typescript
// File: public/scripts/main.test.ts
// No changes to imports needed here, as they are for mock setup or dynamic import()
// The error TS7017 is about globalThis. We'll address this in jest-globals.d.ts

/**
 * @jest-environment jsdom
 */

// Mock socket.io-client before any imports from main.ts occur
jest.mock('socket.io-client', () => {
  const mSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    id: 'mockSocketIdTest123',
  };
  const mockIo = jest.fn(() => {
    // console.log('[MOCK] socket.io-client default export called');
    return mSocket;
  });
  (globalThis as any).__mockedIo__ = mockIo; // Use 'as any' to bypass TS7017 for now, will fix in .d.ts
  return {
    __esModule: true,
    default: mockIo, 
  };
});

declare global {
  // eslint-disable-next-line no-var
  var __mockedIo__: any; // Allow this global for the test
}


describe('Client Main Script (main.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = ''; // Clear body for each test
  });

  it('should load and execute without throwing an error', async () => {
    let errorThrown = false;
    try {
      // Dynamically import to ensure mocks are applied
      await import('./main.js'); // Assuming main.ts compiles to main.js for runtime
    } catch (e) {
      errorThrown = true;
      console.error('Error loading main.ts in test:', e);
    }
    expect(errorThrown).toBe(false);
  });

  it('should attempt to connect with Socket.IO when loaded', async () => {
    await import('./main.js'); // Assuming main.ts compiles to main.js
    // Access the actual mock used by main.ts
    const actualMockIo = (globalThis as any).__mockedIo__; // Use 'as any'
    expect(actualMockIo).toBeDefined();
    expect(typeof actualMockIo).toBe('function');
    // Check if the mockIo function itself was called (which it should be by `io()`)
    expect(actualMockIo.mock.calls.length).toBeGreaterThan(0);
  });
});
```typescript
// File: jest-globals.d.ts
// This file tells TypeScript about Jest's global functions and other globals

declare global {
  // Socket.IO client (if you use io() globally in tests directly, otherwise not needed here)
  // function io(url?: string | object, options?: object): any;

  // For public/scripts/main.test.ts to declare __mockedIo__ on globalThis
  // eslint-disable-next-line no-var
  var __mockedIo__: jest.Mock | any; // Make it a Jest mock or any
}

export {}; // This ensures this file is treated as a module
