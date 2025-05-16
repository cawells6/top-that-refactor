import GameState from '../models/GameState.js';

describe('GameState deck and dealCards', () => {
  test('buildDeck creates 52 unique cards and shuffles', () => {
    const gs = new GameState();
    gs.buildDeck();
    expect(gs.deck).toHaveLength(52);
    // Check for uniqueness
    const cardSet = new Set(gs.deck.map(c => `${c.value}-${c.suit}`));
    expect(cardSet.size).toBe(52);
    // Check that deck is shuffled (not in order)
    const ordered = [];
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = [2,3,4,5,6,7,8,9,10,'J','Q','K','A'];
    for (const suit of suits) for (const value of values) ordered.push(`${value}-${suit}`);
    const deckStr = gs.deck.map(c => `${c.value}-${c.suit}`).join(',');
    expect(deckStr).not.toBe(ordered.join(','));
  });

  test('dealCards deals correct hand/up/down sizes and leaves leftovers', () => {
    const gs = new GameState();
    gs.buildDeck();
    const { hands, upCards, downCards } = gs.dealCards(3, 3);
    expect(hands).toHaveLength(3);
    expect(upCards).toHaveLength(3);
    expect(downCards).toHaveLength(3);
    hands.forEach(h => expect(h).toHaveLength(3));
    upCards.forEach(u => expect(u).toHaveLength(3));
    downCards.forEach(d => expect(d).toHaveLength(3));
    // 3 players * 3 * 3 = 27 cards dealt, 25 left
    expect(gs.deck.length).toBe(52 - 27);
  });
});
