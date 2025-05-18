// tests/player.test.ts

import Player from '../models/Player'; // CORRECTED IMPORT (no .js)
import { Card } from '../src/types'; // Import Card type
// rank is used by Player.sortHand() internally, so no direct import needed here for these tests.

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
    expect(p.isComputer).toBe(false); // Assuming isComputer is a property in Player.ts
    expect(p.disconnected).toBe(false); // Assuming disconnected is a property
  });

  test('setHand replaces hand and sorts it', () => {
    // Explicitly type the cards array
    const cards: Card[] = [
      { value: 'K', suit: 'hearts' },
      { value: '2', suit: 'spades' },
    ];
    p.setHand(cards);
    // Expect sorted hand: 2 should come before K
    // rank('2') is 2, rank('K') is 13 (based on rank logic in cardUtils)
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
      // Ensure arrays passed to setters are correctly typed
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
      // Since it's random and only one card, it must be that one
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
    // Expected sorted hand based on rank: 3, Q, A
    // rank('3')=3, rank('Q')=12, rank('A')=14
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
