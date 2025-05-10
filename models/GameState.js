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
}
