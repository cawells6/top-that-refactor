// tests/gameState.test.ts

import GameState from '../models/GameState.js'; // Ensure this points to GameState.ts
import { Card } from '../src/types.js'; // Import Card type

// Initial conditions: GameState starts with empty players, pile, discard, deck=null, currentPlayerIndex=-1, lastRealCard=null, maxPlayers=4, started=false.

describe('GameState', () => {
  let gs: GameState;

  beforeEach(() => {
    gs = new GameState();
  });

  test('initializes with default values', () => {
    expect(gs.players).toEqual([]);
    expect(gs.currentPlayerIndex).toBe(-1); // Changed from 0 to -1
    expect(gs.pile).toEqual([]);
    expect(gs.discard).toEqual([]);
    expect(gs.maxPlayers).toBe(4);
    // gs.playersCount was removed
    expect(gs.lastRealCard).toBeNull();
    expect(gs.deck).toBeNull(); // Changed from expect(gs.deck).toEqual([])
  });

  test('addPlayer adds a player ID and does not exceed maxPlayers', () => {
    gs.addPlayer('player1');
    expect(gs.players).toContain('player1');
    expect(gs.players.length).toBe(1);

    gs.addPlayer('player2');
    gs.addPlayer('player3');
    gs.addPlayer('player4');
    expect(gs.players.length).toBe(4);

    // Try to add a 5th player
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    gs.addPlayer('player5');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Max players reached. Cannot add more players.'
    );
    consoleWarnSpy.mockRestore();
    expect(gs.players.length).toBe(4); // Should still be 4 if maxPlayers is enforced
    expect(gs.players).not.toContain('player5');
  });

  describe('addPlayer edge cases', () => {
    test('does not add duplicate player IDs', () => {
      gs.addPlayer('p1');
      gs.addPlayer('p1');
      expect(gs.players).toEqual(['p1']);
    });
    test('does not add empty string as player ID', () => {
      gs.addPlayer('');
      expect(gs.players).not.toContain('');
    });
    test('does not add null or undefined as player ID', () => {
      // @ts-expect-error
      gs.addPlayer(null);
      // @ts-expect-error
      gs.addPlayer(undefined);
      expect(gs.players).not.toContain(null);
      expect(gs.players).not.toContain(undefined);
    });
  });

  describe('removePlayer edge cases', () => {
    test('removing a non-existent player does nothing', () => {
      gs.addPlayer('p1');
      gs.removePlayer('not-there');
      expect(gs.players).toEqual(['p1']);
    });
    test('removing from empty list does not throw', () => {
      expect(() => gs.removePlayer('nobody')).not.toThrow();
    });
    test('removing empty string does not throw', () => {
      expect(() => gs.removePlayer('')).not.toThrow();
    });
  });

  describe('advancePlayer', () => {
    beforeEach(() => {
      gs.addPlayer('p1');
      gs.addPlayer('p2');
      gs.addPlayer('p3');
    });

    test('advances to the next player', () => {
      gs.advancePlayer();
      expect(gs.currentPlayerIndex).toBe(1);
    });

    test('wraps around to the first player', () => {
      gs.currentPlayerIndex = 2; // Last player (index for 3 players)
      gs.advancePlayer();
      expect(gs.currentPlayerIndex).toBe(0);
    });

    test('does nothing if no players', () => {
      const emptyGs = new GameState(); // New instance for this test
      emptyGs.advancePlayer();
      expect(emptyGs.currentPlayerIndex).toBe(-1); // Changed from 0 to -1
    });
  });

  describe('advancePlayer edge cases', () => {
    test('with one player, always stays at index 0', () => {
      gs.addPlayer('p1');
      gs.currentPlayerIndex = 0;
      gs.advancePlayer();
      expect(gs.currentPlayerIndex).toBe(0);
    });
    test('after removing current player, advances correctly', () => {
      gs.addPlayer('p1');
      gs.addPlayer('p2');
      gs.currentPlayerIndex = 1;
      gs.removePlayer('p2');
      expect(gs.currentPlayerIndex).toBe(0);
    });
  });

  describe('addToPile', () => {
    const card1: Card = { value: '7', suit: 'hearts' };
    const card2: Card = { value: 'K', suit: 'spades' };

    test('adds a card to the pile', () => {
      gs.addToPile(card1);
      expect(gs.pile).toContainEqual(card1);
    });

    test('adds a card as a copy if options.isCopy is true', () => {
      gs.addToPile(card2, { isCopy: true });
      expect(gs.pile).toContainEqual({ ...card2, copied: true });
    });

    test('addToPile does not mutate the original card object', () => {
      const card = { value: '9', suit: 'hearts' };
      const original = { ...card };
      gs.addToPile(card);
      gs.pile[0].value = 'CHANGED';
      expect(card).toEqual(original); // original card object should not be mutated
    });
  });

  describe('addToPile edge cases', () => {
    test('does not throw if card is null or undefined', () => {
      expect(() => gs.addToPile(null as any)).not.toThrow();
      expect(() => gs.addToPile(undefined as any)).not.toThrow();
    });
  });

  test('clearPile moves pile to discard and resets pile and lastRealCard', () => {
    const card1: Card = { value: 'A', suit: 'diamonds' };
    gs.addToPile(card1);
    gs.lastRealCard = card1;

    gs.clearPile();

    expect(gs.pile).toEqual([]);
    expect(gs.discard).toContainEqual(card1);
    expect(gs.lastRealCard).toBeNull();
  });

  test('clearPile on empty pile does not throw and does not affect discard', () => {
    expect(() => gs.clearPile()).not.toThrow();
    expect(gs.discard).toEqual([]);
  });

  test('clearPile does not mutate the original pile array', () => {
    const card = { value: '8', suit: 'spades' };
    const pile = [card];
    gs.pile = [...pile];
    const original = [...pile.map((c) => ({ ...c }))];
    gs.clearPile();
    expect(pile).toEqual(original); // original pile array should not be mutated
  });

  describe('isFourOfAKindOnPile', () => {
    const createCard = (
      value: string | number,
      suit: string = 'hearts'
    ): Card => {
      return { value, suit };
    };

    test('returns true if top 4 cards have the same value property', () => {
      gs.addToPile(createCard('J'));
      gs.addToPile(createCard('7'));
      gs.addToPile(createCard('7'));
      gs.addToPile(createCard('7'));
      gs.addToPile(createCard('7'));
      expect(gs.isFourOfAKindOnPile()).toBe(true);
    });

    test('returns false if less than 4 cards on pile', () => {
      gs.addToPile(createCard('7'));
      gs.addToPile(createCard('7'));
      gs.addToPile(createCard('7'));
      expect(gs.isFourOfAKindOnPile()).toBe(false);
    });

    test('returns false if top 4 are not four of a kind by value', () => {
      gs.addToPile(createCard('J'));
      gs.addToPile(createCard('7'));
      gs.addToPile(createCard('K'));
      gs.addToPile(createCard('7'));
      gs.addToPile(createCard('7'));
      expect(gs.isFourOfAKindOnPile()).toBe(false);
    });

    test('isFourOfAKindOnPile directly compares values, not normalized values', () => {
      gs.addToPile(createCard('2', 'hearts'));
      gs.addToPile(createCard(2, 'diamonds')); // number 2
      gs.addToPile(createCard('2', 'clubs'));
      gs.addToPile(createCard('2', 'spades'));
      expect(gs.isFourOfAKindOnPile()).toBe(false); // '2' !== 2

      gs.clearPile();
      gs.addToPile(createCard('A', 'hearts'));
      gs.addToPile(createCard('A', 'diamonds'));
      gs.addToPile(createCard('A', 'clubs'));
      gs.addToPile(createCard('A', 'spades'));
      expect(gs.isFourOfAKindOnPile()).toBe(true); // All are string 'A'
    });
  });

  describe('isFourOfAKindOnPile parameterized', () => {
    const make = (v: any) => ({ value: v, suit: 'h' });
    test.each([
      [[make('2'), make('2'), make('2'), make('2')], true],
      [[make(2), make(2), make(2), make(2)], true],
      [[make('2'), make(2), make('2'), make(2)], false],
      [[make('A'), make('A'), make('A'), make('K')], false],
      [[make('Q'), make('Q'), make('Q')], false],
    ])('returns %s for %j', (cards, expected) => {
      gs.pile = [...cards];
      expect(gs.isFourOfAKindOnPile()).toBe(expected);
    });
  });

  describe('isValidPlay parameterized', () => {
    const make = (v: any) => ({ value: v, suit: 'h' });
    test.each([
      [[], false],
      [null, false],
      [[make('2')], true],
      [[make('2'), make('2')], true],
      [[make('2'), make('3')], false], // invalid - multiple different cards
    ])('returns %s for %j', (cards, expected) => {
      expect(gs.isValidPlay(cards as any)).toBe(expected);
    });
  });

  test('isValidPlay allows four of a kind to burn any pile', () => {
    const make = (v: any) => ({ value: v, suit: 'h' });
    gs.pile = [make('K')];
    expect(
      gs.isValidPlay([make('3'), make('3'), make('3'), make('3')])
    ).toBe(true);
  });

  test('isValidPlay rejects lower pairs against higher pile', () => {
    const make = (v: any) => ({ value: v, suit: 'h' });
    gs.pile = [make('K')];
    expect(gs.isValidPlay([make('3'), make('3')])).toBe(false);
  });

  test('lastRealCard updates after addToPile and resets after clearPile', () => {
    const cardA = { value: 'A', suit: 'hearts' };
    const cardB = { value: 'K', suit: 'spades' };
    gs.addToPile(cardA);
    gs.lastRealCard = cardA;
    expect(gs.lastRealCard).toEqual(cardA);
    gs.addToPile(cardB);
    gs.lastRealCard = cardB;
    expect(gs.lastRealCard).toEqual(cardB);
    gs.clearPile();
    expect(gs.lastRealCard).toBeNull();
  });

  test('state after sequence: add, clear, add, check pile/discard/lastRealCard', () => {
    const card1 = { value: '2', suit: 'hearts' };
    const card2 = { value: '3', suit: 'spades' };
    const card3 = { value: '4', suit: 'clubs' };
    gs.addToPile(card1);
    gs.lastRealCard = card1;
    gs.addToPile(card2);
    gs.lastRealCard = card2;
    gs.clearPile();
    expect(gs.pile).toEqual([]);
    expect(gs.discard).toEqual([{ ...card1 }, { ...card2 }]);
    expect(gs.lastRealCard).toBeNull();
    gs.addToPile(card3);
    gs.lastRealCard = card3;
    expect(gs.pile).toEqual([{ ...card3 }]);
    expect(gs.discard).toEqual([{ ...card1 }, { ...card2 }]);
    expect(gs.lastRealCard).toEqual(card3);
  });

  // buildDeck and dealCards are tested separately in gameState.deck.test.js
});
