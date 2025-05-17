// models/GameState.ts

// Define CardValue based on its usage in buildDeck and elsewhere
// cardUtils.normalizeCardValue returns string | null | undefined, so allow string here for normalized values.
// Original deck values can be number or string.
export type CardValue = string | number;

export interface Card {
  value: CardValue;
  suit: string; // Assuming suit is always a string, e.g., 'hearts', 'diamonds', etc.
  copied?: boolean; // For '5' card special logic
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
  /** @deprecated Use players.length directly */
  public playersCount: number; 
  public deck: Card[]; 
  public lastRealCard: Card | null;

  constructor() {
    this.players = [];
    this.currentPlayerIndex = -1; 
    this.pile = [];
    this.discard = [];
    this.maxPlayers = 4;
    this.playersCount = 0;
    this.deck = [];
    this.lastRealCard = null;
  }

  public addPlayer(playerId: string): void {
    if (!this.players.includes(playerId)) {
        this.players.push(playerId);
        this.playersCount = this.players.length; 
        if (this.currentPlayerIndex === -1 && this.players.length > 0) {
            this.currentPlayerIndex = 0; 
        }
    }
  }

  public removePlayer(playerId: string): void {
    const playerIndex = this.players.indexOf(playerId);
    if (playerIndex > -1) {
        this.players.splice(playerIndex, 1);
        this.playersCount = this.players.length;
        if (this.players.length === 0) {
            this.currentPlayerIndex = -1;
        } else if (this.currentPlayerIndex >= playerIndex) {
            this.currentPlayerIndex = Math.max(0, this.currentPlayerIndex -1);
            if (this.currentPlayerIndex >= this.players.length && this.players.length > 0) { // check this.players.length > 0 before modulo
                this.currentPlayerIndex = 0;
            }
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
    const firstValue = topFourCards[0].value;
    return topFourCards.every(card => card.value === firstValue);
  }

  public buildDeck(): void {
    const suits: string[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values: CardValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
    this.deck = [];
    for (const suit of suits) {
      for (const value of values) {
        // Ensure the created card matches the Card interface
        this.deck.push({ value, suit }); 
      }
    }
    // Fisher–Yates shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  public dealCards(numPlayers: number, handSize: number = 3): { hands: Card[][]; upCards: Card[][]; downCards: Card[][] } {
    const hands: Card[][] = [];
    const upCards: Card[][] = [];
    const downCards: Card[][] = [];

    if (!this.deck || this.deck.length < numPlayers * handSize * 3) {
        console.error("Not enough cards in deck to deal.");
        for (let p = 0; p < numPlayers; p++) {
            hands.push([]);
            upCards.push([]);
            downCards.push([]);
        }
        return { hands, upCards, downCards };
    }

    for (let p = 0; p < numPlayers; p++) {
      hands.push(this.deck.splice(0, handSize));
      upCards.push(this.deck.splice(0, handSize));
      downCards.push(this.deck.splice(0, handSize));
    }
    return { hands, upCards, downCards };
  }
}
