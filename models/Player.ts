// models/Player.ts
import { Card } from '../src/types.js';
import { rank } from '../utils/cardUtils.js';

export default class Player {
  public id: string;
  public socketId?: string;
  public hand: Card[];
  public upCards: Card[];
  public downCards: Card[];
  public name: string;
  public isComputer: boolean;
  public disconnected: boolean;
  public disconnectedAt?: Date;

  // Track the player's status in the lobby. A player can be:
  // 'host' (the room creator), 'invited' (before joining), 'joined' (connected but not ready), or 'ready' (clicked the "Let's Play" button).
  public status: 'host' | 'invited' | 'joined' | 'ready';

  // Indicates if the player is ready (for convenience in lobby logic)
  public ready: boolean;

  constructor(id: string) {
    this.id = id;
    this.hand = [];
    this.upCards = [];
    this.downCards = [];
    this.name = '';
    this.isComputer = false;
    this.disconnected = false;
    this.status = 'invited'; // Default status
    this.ready = false;      // Default ready state
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
    return this.downCards.shift();
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
