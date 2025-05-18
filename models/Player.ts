// models/Player.ts
import { Card } from '../src/types.js'; // Path to your types.ts file
import { rank } from '../utils/cardUtils.js';

export default class Player {
  public id: string;
  public socketId?: string; // Added: To associate with active socket
  public hand: Card[];
  public upCards: Card[];
  public downCards: Card[];
  public name: string;
  public isComputer: boolean;
  public disconnected: boolean;

  constructor(id: string) {
    this.id = id;
    this.hand = [];
    this.upCards = [];
    this.downCards = [];
    this.name = '';
    this.isComputer = false;
    this.disconnected = false;
    // socketId will be set when the player connects/reconnects
  }

  setHand(cards: Card[]): void {
    this.hand = [...cards];
    this.sortHand();
  }

  setUpCards(cards: Card[]): void {
    this.upCards = [...cards];
  }

  setDownCards(cards: Card[]): void {
    this.downCards = [...cards];
  }

  playFromHand(index: number): Card | undefined {
    if (index < 0 || index >= this.hand.length) return undefined;
    return this.hand.splice(index, 1)[0];
  }

  playUpCard(index: number): Card | undefined {
    if (index < 0 || index >= this.upCards.length) return undefined;
    return this.upCards.splice(index, 1)[0];
  }

  playDownCard(): Card | undefined {
    if (this.downCards.length === 0) return undefined;
    // Original logic played a random down card, but games often require playing them in order or a specific one.
    // For now, let's assume playing the first one if not specified otherwise.
    // const idx = Math.floor(Math.random() * this.downCards.length);
    return this.downCards.shift(); // Plays the first down card
  }

  pickUpPile(pile: Card[]): void {
    this.hand.push(...pile);
    this.sortHand();
  }

  sortHand(): void {
    this.hand.sort((a, b) => rank(a) - rank(b));
  }

  hasEmptyHand(): boolean {
    return this.hand.length === 0;
  }

  hasEmptyUp(): boolean {
    return this.upCards.length === 0;
  }

  hasEmptyDown(): boolean {
    return this.downCards.length === 0;
  }
}