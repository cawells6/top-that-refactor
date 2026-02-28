// models/GameState.ts

import Player from './Player.js';
import {
  AddToPileOptions,
  Card,
  CardValue,
  ClientStatePlayer,
  SanitizedClientState,
} from '../src/shared/types.js';
import { isValidPlay } from '../utils/cardUtils.js';
import { getRandom } from '../utils/rng.js';

export default class GameState {
  public players: string[];
  public currentPlayerIndex: number;
  public pile: Card[];
  public discard: Card[];
  public readonly maxPlayers: number;
  public deck: Card[] | null; // Changed: Initialized to null
  public lastRealCard: Card | null;
  public started: boolean; // Added: Game started flag
  public isStarting: boolean; // Transition lock for start sequence

  constructor() {
    this.players = [];
    this.currentPlayerIndex = -1; // Default to -1, set to 0 when first player joins
    this.pile = [];
    this.discard = [];
    this.maxPlayers = 4;
    this.deck = null; // Changed: Initialized to null
    this.lastRealCard = null;
    this.started = false; // Added: Initialized to false
    this.isStarting = false;
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
    this.isStarting = false;
    this.deck = null; // Reset deck
    this.pile = [];
    this.discard = [];
    this.lastRealCard = null;
    // Optionally reset players and currentPlayerIndex if it's a full game reset
    // this.players = [];
    // this.currentPlayerIndex = -1;
  }

  public addPlayer(playerId: string): void {
    if (!playerId) return; // Prevent empty, null, or undefined IDs
    if (this.players.length >= this.maxPlayers) {
      console.warn('Max players reached. Cannot add more players.');
      return;
    }
    if (!this.players.includes(playerId)) {
      this.players.push(playerId);
      if (
        this.currentPlayerIndex === -1 &&
        this.players.length > 0 &&
        !this.started
      ) {
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
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
  }

  public addToPile(card: Card, options: AddToPileOptions = {}): void {
    if (options.isCopy) {
      this.pile.push({ ...card, copied: true });
    } else {
      this.pile.push({ ...card }); // Always push a shallow copy
    }
  }

  public clearPile(options: { toDiscard?: boolean } = {}): void {
    const shouldDiscard = options.toDiscard !== false;
    if (shouldDiscard) {
      this.discard.push(...this.pile);
    }
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
    const values: CardValue[] = [
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
    this.deck = []; // Initialize deck

    // Use a 2-deck shoe for 5+ players.
    const deckCount = this.players.length >= 5 ? 2 : 1;
    for (let d = 0; d < deckCount; d++) {
      for (const suit of suits) {
        for (const value of values) {
          this.deck.push({ value, suit });
        }
      }
    }

    // Fisher–Yates shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(getRandom() * (i + 1));
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
      hands.push(
        this.deck
          ? this.deck.splice(0, Math.min(handSize, this.deck.length))
          : []
      );
      upCards.push(
        this.deck
          ? this.deck.splice(0, Math.min(handSize, this.deck.length))
          : []
      );
      downCards.push(
        this.deck
          ? this.deck.splice(0, Math.min(handSize, this.deck.length))
          : []
      );
    }
    return { hands, upCards, downCards };
  }

  public isValidPlay(cards: Card[]): boolean {
    return isValidPlay(cards, this.pile);
  }

  public getPublicView(
    targetPlayerId: string,
    players: Player[]
  ): SanitizedClientState {
    const currentPlayerId =
      this.started &&
      this.players.length > 0 &&
      this.currentPlayerIndex >= 0 &&
      this.currentPlayerIndex < this.players.length
        ? this.players[this.currentPlayerIndex]
        : undefined;

    const publicPlayers: ClientStatePlayer[] = players.map(
      (p): ClientStatePlayer => {
        const isSelf = p.id === targetPlayerId;
        const canSeeHand = isSelf || p.isComputer;

        return {
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          handCount: p.hand.length,
          hand: canSeeHand ? p.hand.map((c) => ({ ...c })) : [],
          upCards: p.upCards.map((c) => (c ? { ...c } : null)),
          upCount: p.getUpCardCount(),
          downCards: p.downCards.map(() => ({ value: '?', suit: '?', back: true })),
          downCount: p.downCards.length,
          disconnected: p.disconnected,
          isComputer: p.isComputer,
        };
      }
    );

    const publicState: SanitizedClientState = {
      players: publicPlayers,
      pile: {
        topCard: this.pile.length > 0 ? { ...this.pile[this.pile.length - 1] } : null,
        belowTopCard: this.pile.length > 1 ? { ...this.pile[this.pile.length - 2] } : null,
        count: this.pile.length,
      },
      discardCount: this.discard.length,
      deckSize: this.deck?.length || 0,
      currentPlayerId,
      started: this.started,
      isStarting: this.isStarting,
      lastRealCard: this.lastRealCard ? { ...this.lastRealCard } : null,
    };

    const violatingPlayer = publicState.players.find(
      (p) =>
        p.id !== targetPlayerId &&
        !p.isComputer &&
        Array.isArray(p.hand) &&
        p.hand.length > 0
    );
    if (violatingPlayer) {
      console.error(
        `[PROTOCOL VIOLATION] getPublicView attempted to include hand for ${violatingPlayer.id} (target: ${targetPlayerId}). Scrubbing payload.`
      );
      publicState.players = publicState.players.map((p) => {
        if (p.id === targetPlayerId || p.isComputer) return p;
        return { ...p, hand: [] };
      });
    }

    return publicState;
  }
}
