// tests/gameState.test.js

import GameState from '../models/GameState.js';

describe('GameState', () => {
  let gs;
  beforeEach(() => {
    gs = new GameState();
  });

  test('initializes with empty players, pile, discard and index 0', () => {
    expect(gs.players).toEqual([]);
    expect(gs.currentPlayerIndex).toBe(0);
    expect(gs.pile).toEqual([]);
    expect(gs.discard).toEqual([]);
  });

  test('addPlayer adds to players array', () => {
    gs.addPlayer('alice');
    gs.addPlayer('bob');
    expect(gs.players).toEqual(['alice', 'bob']);
  });

  test('advancePlayer cycles through players', () => {
    gs.addPlayer('p1');
    gs.addPlayer('p2');
    expect(gs.currentPlayerIndex).toBe(0);

    gs.advancePlayer();
    expect(gs.currentPlayerIndex).toBe(1);

    gs.advancePlayer();
    expect(gs.currentPlayerIndex).toBe(0);
  });

  test('addToPile pushes cards onto pile', () => {
    const cardA = { value: '3' };
    const cardB = { value: '5' };
    gs.addToPile(cardA);
    gs.addToPile(cardB);
    expect(gs.pile).toEqual([cardA, cardB]);
  });

  test('clearPile moves pile into discard and empties pile', () => {
    const c1 = { value: '7' };
    const c2 = { value: '8' };
    gs.addToPile(c1);
    gs.addToPile(c2);

    gs.clearPile();
    expect(gs.pile).toEqual([]);
    expect(gs.discard).toEqual([c1, c2]);
  });
});
