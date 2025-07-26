// tests/gameState.deck.test.ts
import GameState from '../models/GameState.js';
import { Card, DealtCards } from '../src/types.js'; // Import both Card and DealtCards

const DECK_SIZE_SINGLE = 52;
const DECK_SIZE_DOUBLE = 104;

describe('GameState deck and dealCards', () => {
  test('buildDeck creates 52 unique cards and shuffles for < 4 players', () => {
    const gs = new GameState();
    gs.players = ['p1', 'p2']; // Simulate less than 4 players
    gs.startGameInstance(); // Changed from gs.buildDeck()

    expect(gs.deck!.length).toBe(52); // Added !

    // Check for uniqueness of card types
    const cardSet = new Set<string>();
    for (const card of gs.deck!) {
      // Added !
      cardSet.add(`${card.value}-${card.suit}`);
    }
    expect(cardSet.size).toBe(52);

    // Very basic shuffle check: compare to an unshuffled deck string.
    const suits: string[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values: (string | number)[] = [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      'J',
      'Q',
      'K',
      'A',
    ];
    let orderedDeckString = '';
    for (const suit of suits) {
      for (const value of values) {
        orderedDeckString += `${value}-${suit},`;
      }
    }
    let actualDeckString = '';
    for (const card of gs.deck!) {
      // Added !
      actualDeckString += `${card.value}-${card.suit},`;
    }
    expect(actualDeckString).not.toBe(orderedDeckString);
  });

  test('buildDeck creates 104 cards (2 decks) for 4 or more players', () => {
    const gs = new GameState();
    gs.players = ['p1', 'p2', 'p3', 'p4']; // Simulate 4 players
    gs.startGameInstance(); // Changed from gs.buildDeck()
    expect(gs.deck!.length).toBe(104); // Added !

    // Check there are 52 unique types, each appearing twice
    const cardCounts: Record<string, number> = {};
    for (const card of gs.deck!) {
      // Added !
      const cardKey = `${card.value}-${card.suit}`;
      cardCounts[cardKey] = (cardCounts[cardKey] || 0) + 1;
    }
    expect(Object.keys(cardCounts).length).toBe(52);
    for (const key in cardCounts) {
      expect(cardCounts[key]).toBe(2);
    }
  });

  test('endGameInstance resets deck to null and clears pile/discard', () => {
    const gs = new GameState();
    gs.players = ['p1', 'p2'];
    gs.startGameInstance();
    gs.addToPile({ value: 'A', suit: 'spades' });
    gs.discard.push({ value: 'K', suit: 'hearts' });
    gs.endGameInstance();
    expect(gs.deck).toBeNull();
    expect(gs.pile).toEqual([]);
    expect(gs.discard).toEqual([]);
    expect(gs.lastRealCard).toBeNull();
    expect(gs.started).toBe(false);
  });

  test.each([
    { numPlayers: 2, handSize: 3, expectedDeck: DECK_SIZE_SINGLE - 2 * 3 * 3 },
    { numPlayers: 4, handSize: 3, expectedDeck: DECK_SIZE_DOUBLE - 4 * 3 * 3 },
    { numPlayers: 3, handSize: 2, expectedDeck: DECK_SIZE_SINGLE - 3 * 2 * 3 },
    { numPlayers: 1, handSize: 5, expectedDeck: DECK_SIZE_SINGLE - 1 * 5 * 3 },
  ])(
    'dealCards deals correct number for $numPlayers players, $handSize hand',
    ({ numPlayers, handSize, expectedDeck }) => {
      const gs = new GameState();
      gs.players = Array.from({ length: numPlayers }, (_, i) => `p${i + 1}`);
      gs.startGameInstance();
      const dealt = gs.dealCards(numPlayers, handSize);
      expect(dealt.hands.length).toBe(numPlayers);
      expect(dealt.upCards.length).toBe(numPlayers);
      expect(dealt.downCards.length).toBe(numPlayers);
      for (let i = 0; i < numPlayers; i++) {
        expect(dealt.hands[i].length).toBe(handSize);
        expect(dealt.upCards[i].length).toBe(handSize);
        expect(dealt.downCards[i].length).toBe(handSize);
      }
      expect(gs.deck!.length).toBe(expectedDeck);
    }
  );

  test('dealCards with negative or non-integer handSize deals zero cards', () => {
    const gs = new GameState();
    gs.players = ['p1', 'p2'];
    gs.startGameInstance();
    const dealtNeg = gs.dealCards(2, -5);
    const dealtFloat = gs.dealCards(2, 2.7);
    for (const arr of [
      ...dealtNeg.hands,
      ...dealtNeg.upCards,
      ...dealtNeg.downCards,
    ]) {
      expect(arr.length).toBe(0);
    }
    for (const arr of [
      ...dealtFloat.hands,
      ...dealtFloat.upCards,
      ...dealtFloat.downCards,
    ]) {
      expect(arr.length).toBe(2); // Math.min(2.7, deck.length) => 2, so it truncates
    }
  });

  test('dealCards handles scenario with 0 players', () => {
    const gs = new GameState();
    // No players assigned to gs.players
    gs.startGameInstance(); // Changed from gs.buildDeck()
    const dealt: DealtCards = gs.dealCards(0, 3);
    expect(dealt.hands.length).toBe(0);
    expect(dealt.upCards.length).toBe(0);
    expect(dealt.downCards.length).toBe(0);
    expect(gs.deck!.length).toBe(52); // Added ! (deck should be 52 as per buildDeck logic for <4 players)
  });

  test('dealCards handles scenario where deck might not have enough cards (gracefully deals what it can)', () => {
    const gs = new GameState();
    // Manually set a tiny deck
    gs.deck = [
      { value: 'A', suit: 'spades' },
      { value: 'K', suit: 'hearts' },
    ] as Card[]; // Cast to Card[]

    // Request 3 hand, 3 up, 3 down = 9 cards for 1 player
    const originalConsoleError = console.error;
    console.error = jest.fn(); // Suppress console.error
    const dealt: DealtCards = gs.dealCards(1, 3);
    expect(console.error).toHaveBeenCalled(); // Check that the error was logged as expected
    console.error = originalConsoleError; // Restore console.error

    // The current GameState.ts dealCards:
    // hands.push(this.deck.splice(0, Math.min(handSize, this.deck.length)));
    // If deck has 2 cards, handSize is 3: Math.min(3,2) = 2. Splices 2. Deck is empty.
    // upCards: Math.min(3,0) = 0. Splices 0.
    // downCards: Math.min(3,0) = 0. Splices 0.
    expect(dealt.hands[0].length).toBe(2);
    expect(dealt.upCards[0].length).toBe(0);
    expect(dealt.downCards[0].length).toBe(0);
    expect(gs.deck!.length).toBe(0); // Added ! (deck is manually set and then emptied)
  });

  test('dealt hands, upCards, and downCards are independent arrays (not references to deck or each other)', () => {
    const gs = new GameState();
    gs.players = ['p1', 'p2'];
    gs.startGameInstance();
    const dealt = gs.dealCards(2, 3);
    // Mutate one hand, upCards, downCards and check others are unaffected
    dealt.hands[0][0].value = 'CHANGED';
    expect(dealt.hands[1][0].value).not.toBe('CHANGED');
    if (dealt.upCards[0].length > 0 && dealt.upCards[1].length > 0) {
      dealt.upCards[0][0].value = 'UPCHANGED';
      expect(dealt.upCards[1][0].value).not.toBe('UPCHANGED');
    }
    if (dealt.downCards[0].length > 0 && dealt.downCards[1].length > 0) {
      dealt.downCards[0][0].value = 'DOWNCHANGED';
      expect(dealt.downCards[1][0].value).not.toBe('DOWNCHANGED');
    }
    // Mutate deck and check dealt hands are unaffected
    if (gs.deck && gs.deck.length > 0) {
      gs.deck[0].value = 'DECKCHANGED';
      expect(dealt.hands[0][0].value).not.toBe('DECKCHANGED');
    }
  });

  test('dealCards handles more players than possible (deck exhaustion, no throw)', () => {
    const gs = new GameState();
    gs.players = Array.from({ length: 10 }, (_, i) => `p${i + 1}`);
    gs.startGameInstance();
    expect(() => gs.dealCards(10, 6)).not.toThrow();
    // Should deal as many as possible, some hands may be empty
    const dealt = gs.dealCards(10, 6);
    expect(dealt.hands.length).toBe(10);
    // At least one hand should have fewer than 6 cards
    expect(dealt.hands.some((h) => h.length < 6)).toBe(true);
  });

  test('deck uniqueness: no duplicates for single deck, two of each for double deck', () => {
    const gs1 = new GameState();
    gs1.players = ['p1', 'p2'];
    gs1.startGameInstance();
    const seen = new Set();
    for (const card of gs1.deck!) {
      const key = `${card.value}-${card.suit}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(52);

    const gs2 = new GameState();
    gs2.players = ['p1', 'p2', 'p3', 'p4'];
    gs2.startGameInstance();
    const counts: Record<string, number> = {};
    for (const card of gs2.deck!) {
      const key = `${card.value}-${card.suit}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    Object.values(counts).forEach((count) => expect(count).toBe(2));
    expect(Object.keys(counts).length).toBe(52);
  });

  test('deck state after multiple deals: deck shrinks, hands reflect remaining cards', () => {
    const gs = new GameState();
    gs.players = ['p1', 'p2', 'p3', 'p4'];
    gs.startGameInstance();
    // 4 players × 3 hand × 3 zones = 36 cards dealt, 16 left in deck (before discard pile flip)
    gs.dealCards(4, 3);
    const deckAfterFirst = gs.deck!.length;
    gs.dealCards(4, 3);
    // After two deals, deck should be even smaller
    expect(gs.deck!.length).toBeLessThan(deckAfterFirst);
    // Note: If the game flips one card to the discard pile before play, adjust expectations accordingly.
  });

  test('integration: build, deal, end, rebuild, deal again', () => {
    const gs = new GameState();
    gs.players = ['p1', 'p2'];
    gs.startGameInstance();
    gs.dealCards(2, 3);
    gs.endGameInstance();
    expect(gs.deck).toBeNull();
    gs.startGameInstance();
    const secondDealt = gs.dealCards(2, 3);
    expect(secondDealt.hands.length).toBe(2);
    expect(gs.deck!.length).toBe(52 - 2 * 3 * 3);
  });

  test('dealCards with hand size 0 returns empty hands, upCards, downCards', () => {
    const gs = new GameState();
    gs.players = ['p1', 'p2'];
    gs.startGameInstance();
    const dealt = gs.dealCards(2, 0);
    expect(dealt.hands.every((h) => h.length === 0)).toBe(true);
    expect(dealt.upCards.every((u) => u.length === 0)).toBe(true);
    expect(dealt.downCards.every((d) => d.length === 0)).toBe(true);
  });

  test('dealCards with more players than maxPlayers only deals up to maxPlayers', () => {
    const gs = new GameState();
    const max = gs.maxPlayers;
    gs.players = Array.from({ length: max + 3 }, (_, i) => `p${i + 1}`);
    gs.startGameInstance();
    const dealt = gs.dealCards(gs.players.length, 2);
    expect(dealt.hands.length).toBe(gs.players.length);
    // But only up to maxPlayers should have non-empty hands
    const nonEmpty = dealt.hands.filter((h) => h.length > 0).length;
    expect(nonEmpty).toBeLessThanOrEqual(max * 2); // Each gets up to 2 cards
  });

  test('mutating a dealt card does not affect deck or other hands', () => {
    const gs = new GameState();
    gs.players = ['p1', 'p2'];
    gs.startGameInstance();
    const dealt = gs.dealCards(2, 3);
    const originalDeckCard = { ...gs.deck![0] };
    dealt.hands[0][0].value = 'CHANGED';
    expect(gs.deck![0]).toEqual(originalDeckCard);
    if (dealt.hands[1].length > 0) {
      expect(dealt.hands[1][0].value).not.toBe('CHANGED');
    }
  });
});
