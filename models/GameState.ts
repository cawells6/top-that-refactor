// models/GameState.ts

import { Card } from '../src/types'; // Assuming Card interface is in src/types.ts

interface AddToPileOptions {
  isCopy?: boolean;
}

interface DealtCards {
  hands: Card[][];
  upCards: Card[][];
  downCards: Card[][];
}

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
    this.maxPlayers = 4;
    this.lastRealCard = null;
    this.deck = [];
  }

  /**
   * Add a player to the game.
   * @param playerId
   */
  addPlayer(playerId: string): void {
    this.players.push(playerId);
    // this.playersCount is no longer used/updated
  }

  /**
   * Advance currentPlayerIndex to the next player in the queue,
   * wrapping back to 0 at the end.
   */
  advancePlayer(): void {
    if (this.players.length === 0) return;
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
  }

  /**
   * Add a card to the current pile. Handles special logic for '5' (copy card).
   * @param card
   * @param options
   */
  addToPile(card: Card, options: AddToPileOptions = {}): void {
    if (options.isCopy) {
      this.pile.push({ ...card, copied: true }); // 'copied' is an optional prop in Card interface
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
   * Helper to check if the top 4 cards of the pile are four-of-a-kind
   * @returns
   */
  isFourOfAKindOnPile(): boolean {
    if (this.pile.length < 4) return false;
    // Ensure values exist before comparing
    const vals = this.pile.slice(-4).map(c => c?.value); // Use optional chaining for safety
    if (vals.some(v => v === undefined || v === null)) return false;
    return vals.every(v => v === vals[0]);
  }

  /**
   * Build a standard 52-card deck (or two for 4+ players) and shuffle it (Fisher–Yates).
   */
  buildDeck(): void {
    const suits: string[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values: (string | number)[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
    this.deck = [];
    
    const numDecks = this.players.length >= 4 ? 2 : 1; // // TODO: Confirm if this.players is populated before buildDeck
                                                      // If not, this.players.length might be 0 here.
                                                      // GameController calls addPlayer then buildDeck, so it should be fine.

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
    console.log(`Built deck with ${this.deck.length} cards for ${this.players.length} players (${numDecks} deck(s))`);
  }

  /**
   * Deal cards to players: hand, upCards, downCards for each.
   * @param numPlayers
   * @param handSize
   * @returns
   */
  dealCards(numPlayers: number, handSize: number = 3): DealtCards {
    const hands: Card[][] = [];
    const upCards: Card[][] = [];
    const downCards: Card[][] = [];

    if (!this.deck || this.deck.length < numPlayers * handSize * 3) {
        console.warn("[GameState.dealCards] Deck is not initialized or insufficient cards. Rebuilding deck.");
        // This is a fallback. Ideally, buildDeck is always called appropriately before dealCards.
        this.buildDeck();
        // If after rebuilding, there are still not enough cards (e.g., too many players for standard decks),
        // this indicates a more fundamental logic issue or need for more decks.
        if (this.deck.length < numPlayers * handSize * 3) {
            console.error("[GameState.dealCards] CRITICAL: Insufficient cards even after rebuilding deck.");
            // Return empty arrays to prevent further errors, but this state is problematic.
            return { hands: [], upCards: [], downCards: [] };
        }
    }

    for (let p = 0; p < numPlayers; p++) {
      hands.push(this.deck.splice(0, Math.min(handSize, this.deck.length)));
      upCards.push(this.deck.splice(0, Math.min(handSize, this.deck.length)));
      downCards.push(this.deck.splice(0, Math.min(handSize, this.deck.length)));
    }
    return { hands, upCards, downCards };
  }
}