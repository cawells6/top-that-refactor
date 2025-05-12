// models/GameState.js

/**
 * GAME STATE
 * Manages the core game data: players, turn order, pile, and discard.
 */
export default class GameState {
  constructor() {
    /** @type {string[]} List of player IDs in turn order */
    this.players = [];
    /** @type {number} Index of the current player in `players` */
    this.currentPlayerIndex = 0;
    /** @type {object[]} Cards played into the current pile */
    this.pile = [];
    /** @type {object[]} All cards that have been cleared from the pile */
    this.discard = [];
  }

  /**
   * Add a player to the game.
   * @param {string} playerId
   */
  addPlayer(playerId) {
    this.players.push(playerId);
  }

  /**
   * Advance currentPlayerIndex to the next player in the queue,
   * wrapping back to 0 at the end.
   */
  advancePlayer() {
    if (this.players.length === 0) return;
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
  }

  /**
   * Add a card to the current pile.
   * @param {object} card
   */
  addToPile(card) {
    this.pile.push(card);
  }

  /**
   * Clear the current pile:
   * - Move all pile cards into `discard`
   * - Reset `pile` to an empty array
   */
  clearPile() {
    this.discard.push(...this.pile);
    this.pile = [];
  }

  /**
   * Build a standard 52-card deck and shuffle it (Fisher–Yates).
   */
  buildDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
    this.deck = [];
    for (const suit of suits) {
      for (const value of values) {
        this.deck.push({ value, suit });
      }
    }
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  /**
   * Deal cards to players: hand, upCards, downCards for each.
   * @param {number} numPlayers
   * @param {number} handSize
   * @returns {{ hands: object[][], upCards: object[][], downCards: object[][] }}
   */
  dealCards(numPlayers, handSize = 3) {
    const hands = [];
    const upCards = [];
    const downCards = [];
    for (let p = 0; p < numPlayers; p++) {
      hands.push(this.deck.splice(0, handSize));
      upCards.push(this.deck.splice(0, handSize));
      downCards.push(this.deck.splice(0, handSize));
    }
    return { hands, upCards, downCards };
  }
}
