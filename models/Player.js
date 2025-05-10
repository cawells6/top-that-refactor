// models/Player.js

import { rank } from '../utils/cardUtils.js';

/**
 * PLAYER
 * Manages a single player’s hand, up‑cards, down‑cards, and pick‑up logic.
 */
export default class Player {
  /**
   * @param {string} id Unique player identifier
   */
  constructor(id) {
    /** @type {string} */
    this.id = id;
    /** @type {object[]} Cards in hand (visible) */
    this.hand = [];
    /** @type {object[]} Face‑up cards (visible after hand is empty) */
    this.upCards = [];
    /** @type {object[]} Face‑down cards (hidden until both hand & up are empty) */
    this.downCards = [];
  }

  /**
   * Replace this.hand with new cards and sort.
   * @param {object[]} cards
   */
  setHand(cards) {
    this.hand = [...cards];
    this.sortHand();
  }

  /**
   * Replace this.upCards.
   * @param {object[]} cards
   */
  setUpCards(cards) {
    this.upCards = [...cards];
  }

  /**
   * Replace this.downCards.
   * @param {object[]} cards
   */
  setDownCards(cards) {
    this.downCards = [...cards];
  }

  /**
   * Play a card from hand at index.
   * @param {number} index
   * @returns {object} the played card
   */
  playFromHand(index) {
    return this.hand.splice(index, 1)[0];
  }

  /**
   * Play a face‑up card at index.
   * @param {number} index
   * @returns {object}
   */
  playUpCard(index) {
    return this.upCards.splice(index, 1)[0];
  }

  /**
   * Play a random face‑down card.
   * @returns {object}
   */
  playDownCard() {
    const idx = Math.floor(Math.random() * this.downCards.length);
    return this.downCards.splice(idx, 1)[0];
  }

  /**
   * When picking up the pile, add those cards into hand and re‑sort.
   * @param {object[]} pile
   */
  pickUpPile(pile) {
    this.hand.push(...pile);
    this.sortHand();
  }

  /** Sort hand lowest→highest by rank */
  sortHand() {
    this.hand.sort((a, b) => rank(a) - rank(b));
  }

  /** @returns {boolean} true if hand is empty */
  hasEmptyHand() {
    return this.hand.length === 0;
  }

  /** @returns {boolean} true if upCards is empty */
  hasEmptyUp() {
    return this.upCards.length === 0;
  }

  /** @returns {boolean} true if downCards is empty */
  hasEmptyDown() {
    return this.downCards.length === 0;
  }
}
