// models/GameState.ts

import { Card, DealtCards } from '../src/types'; // Import both Card and DealtCards

// No local DealtCards interface definition needed here anymore

/**
 * GAME STATE
 * Manages the core game data: players, turn order, pile, and discard.
 */
export default class GameState {
  public players: string[];
  public currentPlayerIndex: number;
  public pile: Card[];
  public discard: Card[];
  public maxPlayers: number;
  public lastRealCard: Card | null;
  public deck: Card[];

  constructor() {
    this.players = [];
    this.currentPlayerIndex = 0;
    this.pile = [];
    this.discard = [];
    this.maxPlayers = 4; // Default max players
    this.lastRealCard = null;
    this.deck = [];
  }

  /**
   * Add a player to the game.
   * @param playerId
   */
  addPlayer(playerId: string): void {
    if (this.players.length < this.maxPlayers) {
      this.players.push(playerId);
    } else {
      console.warn("Max players reached. Cannot add more players.");
      // Potentially throw an error or handle this case as per game rules
    }
  }

  /**
   * Advance currentPlayerIndex to the next player in the queue,
   * wrapping back to 0 at the end.
   */
  advancePlayer(): void {
    if (this.players.length === 0) {
        // console.warn("Cannot advance player, no players in game.");
        return;
    }
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
  }

  /**
   * Add a card to the current pile. Handles special logic for '5' (copy card).
   * @param card
   * @param options
   */
  addToPile(card: Card, options: { isCopy?: boolean } = {}): void {
    if (options.isCopy) {
      this.pile.push({ ...card, copied: true });
    } else {
      this.pile.push(card);
    }
  }

  /**
   * Clear the current pile:
   * - Move all pile cards into `discard`
   * - Reset `pile` to an empty array
   * - Reset lastRealCard
   */
  clearPile(): void {
    this.discard.push(...this.pile);
    this.pile = [];
    this.lastRealCard = null;
  }

  /**
   * Helper to check if the top 4 cards of the pile have the same value property.
   * Note: This compares raw `value` properties, not normalized values.
   * @returns
   */
  isFourOfAKindOnPile(): boolean {
    if (this.pile.length < 4) return false;
    const topFourCards = this.pile.slice(-4);
    const firstValue = topFourCards[0]?.value; // Use optional chaining
    if (firstValue === undefined || firstValue === null) return false; // Ensure first card has a value

    return topFourCards.every(card => card?.value === firstValue);
  }

  /**
   * Build a standard 52-card deck (or two for 4+ players) and shuffle it (Fisher–Yates).
   */
  buildDeck(): void {
    const suits: string[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values: (string | number)[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
    this.deck = [];
    
    // Determine number of decks based on current number of players
    // This assumes `this.players` is populated before `buildDeck` is called,
    // which GameController's logic should ensure.
    const numDecks = this.players.length >= 4 ? 2 : 1;

    for (let i = 0; i < numDecks; i++) {
      for (const suit of suits) {
        for (const value of values) {
          this.deck.push({ value, suit });
        }
      }
    }

    // Fisher-Yates Shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
    // console.log(`Built deck with ${this.deck.length} cards for ${this.players.length} players (${numDecks} deck(s))`);
  }

  /**
   * Deal cards to players: hand, upCards, downCards for each.
   * @param numPlayers The number of players to deal to (should match this.players.length ideally)
   * @param handSize The number of cards for each category (hand, up, down)
   * @returns DealtCards object
   */
  dealCards(numPlayers: number, handSize: number = 3): DealtCards {
    const hands: Card[][] = [];
    const upCards: Card[][] = [];
    const downCards: Card[][] = [];

    if (!this.deck || this.deck.length === 0) {
        // console.warn("[GameState.dealCards] Deck is not initialized or is empty. Attempting to build deck.");
        this.buildDeck(); // Attempt to build if not already built or empty
    }
    
    // After attempting to build, check if deck is sufficient
    const requiredCards = numPlayers * handSize * 3;
    if (this.deck.length < requiredCards) {
        console.error(`[GameState.dealCards] CRITICAL: Insufficient cards (${this.deck.length}) to deal ${requiredCards} cards for ${numPlayers} players with handsize ${handSize}. Dealing what's available.`);
        // Deal what's possible, players might get fewer cards.
    }

    for (let p = 0; p < numPlayers; p++) {
      hands.push(this.deck.splice(0, Math.min(handSize, this.deck.length)));
      upCards.push(this.deck.splice(0, Math.min(handSize, this.deck.length)));
      downCards.push(this.deck.splice(0, Math.min(handSize, this.deck.length)));
    }
    return { hands, upCards, downCards };
  }
}