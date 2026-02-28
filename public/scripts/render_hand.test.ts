/** @jest-environment jsdom */

import { renderGameState } from './render.js';
import { GameStateData, Card } from '../../src/shared/types.js';

// Mock assets
jest.mock('../../src/shared/4ofakind-icon.png', () => 'icon.png');
jest.mock('../../src/shared/Burn-icon.png', () => 'icon.png');
jest.mock('../../src/shared/Copy-icon.png', () => 'icon.png');
jest.mock('../../src/shared/crownv2.svg', () => 'icon.png');
jest.mock('../../src/shared/invalid play-icon.png', () => 'icon.png');
jest.mock('../../src/shared/logov2.svg', () => 'icon.png');
jest.mock('../../src/shared/Reset-icon.png', () => 'icon.png');

// Helper to create a card
const createCard = (value: string | number, suit: string): Card => ({
  value,
  suit,
  back: false
});

describe('Hand Rendering', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="game-table">
        <div class="table">
            <div id="opponent-area-top"></div>
            <div id="player-area-bottom"></div>
        </div>
      </div>
      <div id="center-area"></div>
    `;
  });

  it('applies data-zone="hand" to replacement cards', () => {
    const player1 = {
      id: 'p1',
      name: 'Player 1',
      hand: [createCard(2, 'hearts')],
      upCards: [],
      downCards: [],
      handCount: 1,
      isComputer: false
    };

    const state1: GameStateData = {
      started: true,
      isStarting: false,
      players: [player1],
      currentPlayerId: 'p1',
      pile: { topCard: null, belowTopCard: null, count: 0 },
      deckSize: 10,
      discardCount: 0,
      lastRealCard: null
    };

    // First render
    renderGameState(state1, 'p1');

    const handRow = document.querySelector('.hand-row--local');
    expect(handRow).not.toBeNull();
    const cardImg1 = handRow!.querySelector('.card-img') as HTMLElement;
    expect(cardImg1.dataset.zone).toBe('hand');
    // Value 2 is normalized to 'two' in render.ts
    expect(cardImg1.dataset.value).toBe('two');

    // Second render - Change card value (Replacement)
    // We keep the hand size same (1) but change the card, forcing replacement logic.
    const player1Modified = {
        ...player1,
        hand: [createCard(3, 'hearts')]
    };
    const state2: GameStateData = {
        ...state1,
        players: [player1Modified]
    };

    renderGameState(state2, 'p1');

    const cardImg2 = handRow!.querySelector('.card-img') as HTMLElement;

    // Verify it is a replacement
    // If we want to be sure it replaced, we could have checked element identity,
    // but here we care about the end state being correct.

    expect(cardImg2.dataset.zone).toBe('hand'); // The fix validation
    expect(cardImg2.dataset.value).toBe('three');
  });
});
