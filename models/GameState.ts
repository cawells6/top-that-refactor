// models/GameState.ts

export type CardValue = string | number;

export interface Card {
  value: CardValue;
  suit: string;
  copied?: boolean;
}

interface AddToPileOptions {
  isCopy?: boolean;
}

export default class GameState {
  public players: string[];
  public currentPlayerIndex: number;
  public pile: Card[];
  public discard: Card[];
  public readonly maxPlayers: number;
  public deck: Card[] | null; // Changed: Initialized to null
  public lastRealCard: Card | null;
  public started: boolean; // Added: Game started flag

  constructor() {
    this.players = [];
    this.currentPlayerIndex = -1; // Default to -1, set to 0 when first player joins
    this.pile = [];
    this.discard = [];
    this.maxPlayers = 4;
    this.deck = null; // Changed: Initialized to null
    this.lastRealCard = null;
    this.started = false; // Added: Initialized to false
  }

  public startGameInstance(): void {
    // Added method
    this.buildDeck();
    this.started = true;
    if (this.players.length > 0 && this.currentPlayerIndex === -1) {
      this.currentPlayerIndex = 0; // Ensure a current player is set if game starts
    }
  }

  public endGameInstance(): void {
    // Added method
    this.started = false;
    this.deck = null; // Reset deck
    this.pile = [];
    this.discard = [];
    this.lastRealCard = null;
    // Optionally reset players and currentPlayerIndex if it's a full game reset
    // this.players = [];
    // this.currentPlayerIndex = -1;
  }

  public addPlayer(playerId: string): void {
    if (this.players.length >= this.maxPlayers) {
      console.warn('Max players reached. Cannot add more players.');
      return;
    }
    if (!this.players.includes(playerId)) {
      this.players.push(playerId);
      if (this.currentPlayerIndex === -1 && this.players.length > 0 && !this.started) {
        // Set the first player to join as the current player if game hasn't started
        this.currentPlayerIndex = 0;
      }
    }
  }

  public removePlayer(playerId: string): void {
    const playerIndex = this.players.indexOf(playerId);
    if (playerIndex > -1) {
      const isCurrentPlayer = this.currentPlayerIndex === playerIndex;
      this.players.splice(playerIndex, 1);

      if (this.players.length === 0) {
        this.currentPlayerIndex = -1;
        this.endGameInstance(); // Consider ending game if all players leave
        return;
      }

      // Adjust currentPlayerIndex if the removed player was before or was the current player
      if (playerIndex < this.currentPlayerIndex) {
        this.currentPlayerIndex--;
      } else if (isCurrentPlayer) {
        // If the current player was removed, the next player (or wrapped around) becomes current.
        // The modulo operator will handle this correctly if index is now out of bounds.
        this.currentPlayerIndex = playerIndex % this.players.length;
      }
      // Ensure currentPlayerIndex is valid
      if (this.currentPlayerIndex >= this.players.length) {
        this.currentPlayerIndex = 0;
      }
      if (this.currentPlayerIndex < 0 && this.players.length > 0) {
        this.currentPlayerIndex = 0;
      }
    }
  }

  public advancePlayer(): void {
    if (this.players.length === 0) {
      this.currentPlayerIndex = -1;
      return;
    }
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  public addToPile(card: Card, options: AddToPileOptions = {}): void {
    if (options.isCopy) {
      this.pile.push({ ...card, copied: true });
    } else {
      this.pile.push(card);
    }
  }

  public clearPile(): void {
    this.discard.push(...this.pile);
    this.pile = [];
    this.lastRealCard = null;
  }

  public isFourOfAKindOnPile(): boolean {
    if (this.pile.length < 4) return false;
    const topFourCards = this.pile.slice(-4);
    const firstValue = topFourCards[0].value; // Directly compare values
    return topFourCards.every((card) => card.value === firstValue);
  }

  private buildDeck(): void {
    // Changed to private as it's an internal part of startGameInstance
    const suits: string[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values: CardValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
    this.deck = []; // Initialize deck
    let numDecks = 1;
    if (this.players.length >= 4) {
      // Standard rule: 2 decks for 4+ players
      numDecks = 2;
    }
    for (let i = 0; i < numDecks; i++) {
      for (const suit of suits) {
        for (const value of values) {
          this.deck.push({ value, suit });
        }
      }
    }

    // Fisher–Yates shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  public dealCards(
    numPlayers: number,
    handSize: number = 3
  ): { hands: Card[][]; upCards: Card[][]; downCards: Card[][] } {
    const hands: Card[][] = [];
    const upCards: Card[][] = [];
    const downCards: Card[][] = [];

    const requiredCards = numPlayers * handSize * 3;
    if (!this.deck || this.deck.length < requiredCards) {
      console.error(
        `[GameState.dealCards] CRITICAL: Insufficient cards (${this.deck?.length || 0}) to deal ${requiredCards} cards for ${numPlayers} players with handsize ${handSize}. Dealing what's available.`
      );
    }

    for (let p = 0; p < numPlayers; p++) {
      // Ensure we don't try to splice more cards than available
      hands.push(this.deck ? this.deck.splice(0, Math.min(handSize, this.deck.length)) : []);
      upCards.push(this.deck ? this.deck.splice(0, Math.min(handSize, this.deck.length)) : []);
      downCards.push(this.deck ? this.deck.splice(0, Math.min(handSize, this.deck.length)) : []);
    }
    return { hands, upCards, downCards };
  }

  public isValidPlay(cards: Card[]): boolean {
    // Implementation for isValidPlay
    // This is a placeholder, you'll need to define the actual logic
    if (!cards || cards.length === 0) {
      return false;
    }
    // Example: Check if all cards have the same value
    // const firstValue = cards[0].value;
    // return cards.every(card => card.value === firstValue);
    return true; // Placeholder
  }
}
