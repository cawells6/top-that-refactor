// tests/gameState.deck.test.ts
import GameState from '../models/GameState.js';
import { Card, DealtCards } from '../src/types.js'; // Import both Card and DealtCards

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
    const values: (string | number)[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
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

  test('dealCards deals correct number of cards to players', () => {
    const gs = new GameState();
    gs.players = ['p1', 'p2', 'p3', 'p4']; // 4 players, so 2 decks (104 cards)
    gs.startGameInstance(); // Changed from gs.buildDeck()

    const numPlayers = 4;
    const handSize = 3; // Each player gets 3 for hand, 3 for up, 3 for down
    const cardsPerPlayerTotal = handSize * 3; // 9 cards per player

    const dealt: DealtCards = gs.dealCards(numPlayers, handSize);

    expect(dealt.hands.length).toBe(numPlayers);
    expect(dealt.upCards.length).toBe(numPlayers);
    expect(dealt.downCards.length).toBe(numPlayers);

    for (let i = 0; i < numPlayers; i++) {
      expect(dealt.hands[i].length).toBe(handSize);
      expect(dealt.upCards[i].length).toBe(handSize);
      expect(dealt.downCards[i].length).toBe(handSize);
    }

    const expectedDeckSize = 104 - numPlayers * cardsPerPlayerTotal;
    expect(gs.deck!.length).toBe(expectedDeckSize); // Added !
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
});
