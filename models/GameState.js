import { normalizeCardValue, isSpecialCard, rank } from '../utils/cardUtils.js';

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
    /** @type {object|null} Last real (non-special) card played */
    this.lastRealCard = null;
    /** @type {number} Max players for this game room */
    this.maxPlayers = 4;
    /** @type {string[]} Player order for this room */
    this.playerOrder = [];
    /** @type {number} Number of players in this room */
    this.playersCount = 0;
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
   * Add a card to the current pile and update lastRealCard if not special.
   * @param {object} card
   */
  addToPile(card) {
    this.pile.push(card);
    if (!isSpecialCard(card.value)) {
      this.lastRealCard = card;
    }
  }

  /**
   * Get the value that must be beaten (null if pile empty or reset).
   */
  getTopValue() {
    if (this.pile.length === 0) return null;
    const top = this.pile[this.pile.length - 1].value;
    if (top === 'two') return null;
    if (top === 'five') {
      for (let i = this.pile.length - 2; i >= 0; i--) {
        const val = this.pile[i].value;
        if (val !== 'five' && val !== 'two') return val;
      }
      return null;
    }
    return top;
  }

  /**
   * Validate if a card can be played on the current pile.
   * @param {object} card
   * @returns {boolean}
   */
  isValidPlay(card) {
    const topVal = this.getTopValue();
    const val = normalizeCardValue(card.value);
    if (isSpecialCard(val)) return true;
    if (topVal === null) return true;
    return rank({ value: val }) >= rank({ value: normalizeCardValue(topVal) });
  }

  /**
   * Check if the top 4 cards of the pile are four of a kind (not special).
   * @returns {boolean}
   */
  checkFourOfKind() {
    if (this.pile.length < 4) return false;
    const len = this.pile.length;
    const v1 = normalizeCardValue(this.pile[len - 1].value);
    return (
      v1 !== 'two' && v1 !== 'five' &&
      normalizeCardValue(this.pile[len - 2].value) === v1 &&
      normalizeCardValue(this.pile[len - 3].value) === v1 &&
      normalizeCardValue(this.pile[len - 4].value) === v1
    );
  }

  /**
   * Get the last real (non-special) card played.
   */
  getLastRealCard() {
    return this.lastRealCard || null;
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
