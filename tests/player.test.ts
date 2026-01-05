// tests/player.test.ts

import Player from '../models/Player.js'; // CORRECTED IMPORT with .js extension
import { Card } from '../src/types.js'; // Import Card type
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

  test('setHand does not mutate the original array', () => {
    const original = [
      { value: 'A', suit: 'spades' },
      { value: '2', suit: 'hearts' },
    ];
    const copy = [...original.map((card) => ({ ...card }))];
    p.setHand(original);
    p.hand.pop(); // mutate Player's hand
    expect(original).toEqual(copy); // original should be unchanged
  });

  test('setUpCards does not mutate the original array', () => {
    const original = [{ value: '5', suit: 'clubs' }];
    const copy = [...original.map((card) => ({ ...card }))];
    p.setUpCards(original);
    p.upCards.pop();
    expect(original).toEqual(copy);
  });

  test('setDownCards does not mutate the original array', () => {
    const original = [{ value: '7', suit: 'diamonds' }];
    const copy = [...original.map((card) => ({ ...card }))];
    p.setDownCards(original);
    p.downCards.pop();
    expect(original).toEqual(copy);
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
      expect(p.upCards).toEqual([null]);
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

  test('pickUpPile with empty pile does not change hand', () => {
    p.setHand([{ value: '4', suit: 'hearts' }]);
    p.pickUpPile([]);
    expect(p.hand).toEqual([{ value: '4', suit: 'hearts' }]);
  });

  test('pickUpPile with duplicate cards adds and sorts correctly', () => {
    p.setHand([{ value: '7', suit: 'hearts' }]);
    const pile: Card[] = [
      { value: '3', suit: 'diamonds' },
      { value: '3', suit: 'spades' },
      { value: '7', suit: 'clubs' },
    ];
    p.pickUpPile(pile);
    const expectedHand: Card[] = [
      { value: '3', suit: 'diamonds' },
      { value: '3', suit: 'spades' },
      { value: '7', suit: 'hearts' },
      { value: '7', suit: 'clubs' },
    ];
    expect(p.hand).toEqual(expectedHand);
  });

  test('pickUpPile with special cards (2, 10, 5) sorts them by rank', () => {
    p.setHand([{ value: 'Q', suit: 'hearts' }]);
    const pile: Card[] = [
      { value: '2', suit: 'diamonds' },
      { value: '10', suit: 'spades' },
      { value: '5', suit: 'clubs' },
    ];
    p.pickUpPile(pile);
    // rank('2')=2, rank('5')=5, rank('10')=10, rank('Q')=12
    const expectedHand: Card[] = [
      { value: '2', suit: 'diamonds' },
      { value: '5', suit: 'clubs' },
      { value: '10', suit: 'spades' },
      { value: 'Q', suit: 'hearts' },
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

  test('can set and get socketId', () => {
    expect(p.socketId).toBeUndefined();
    p.socketId = 'socket-123';
    expect(p.socketId).toBe('socket-123');
  });

  test('can set and get status and ready properties', () => {
    expect(p.status).toBe('invited');
    expect(p.ready).toBe(false);
    p.status = 'ready';
    p.ready = true;
    expect(p.status).toBe('ready');
    expect(p.ready).toBe(true);
    p.status = 'host';
    expect(p.status).toBe('host');
    p.ready = false;
    expect(p.ready).toBe(false);
  });

  // Helper to create a player with a specific hand, upCards, and downCards
  function buildTestPlayerId(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'test-id';
    }
    const sanitized = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return sanitized ? `test-id-${sanitized}` : 'test-id';
  }

  function makePlayer({
    id,
    hand = [],
    upCards = [],
    downCards = [],
    name = '',
    isComputer = false,
    disconnected = false,
    status = 'invited' as 'invited' | 'ready' | 'host' | 'joined',
    ready = false,
  }: Partial<{
    id: string;
    hand: Card[];
    upCards: Card[];
    downCards: Card[];
    name: string;
    isComputer: boolean;
    disconnected: boolean;
    status: 'invited' | 'ready' | 'host' | 'joined';
    ready: boolean;
  }> = {}) {
    const resolvedId = id ?? buildTestPlayerId(name);
    const player = new Player(resolvedId);
    player.setHand(hand);
    player.setUpCards(upCards);
    player.setDownCards(downCards);
    player.name = name;
    player.isComputer = isComputer;
    player.disconnected = disconnected;
    player.status = status;
    player.ready = ready;
    return player;
  }

  // Edge case tests for invalid indices

  describe('Player card play edge cases', () => {
    test('playFromHand returns undefined for invalid index', () => {
      const player = makePlayer({ hand: [{ value: 'A', suit: 'spades' }] });
      expect(player.playFromHand(-1)).toBeUndefined();
      expect(player.playFromHand(1)).toBeUndefined();
    });

    test('playUpCard returns undefined for invalid index', () => {
      const player = makePlayer({ upCards: [{ value: '2', suit: 'hearts' }] });
      expect(player.playUpCard(-1)).toBeUndefined();
      expect(player.playUpCard(1)).toBeUndefined();
    });

    test('playDownCard returns undefined if downCards is empty', () => {
      const player = makePlayer({ downCards: [] });
      expect(player.playDownCard()).toBeUndefined();
    });
  });
});
