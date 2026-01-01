// models/Player.ts
import { Card } from '../src/shared/types.js';
import { rank } from '../utils/cardUtils.js';

export default class Player {
  public id: string;
  public socketId?: string;
  public hand: Card[];
  public upCards: Array<Card | null>;
  public downCards: Card[];
  public name: string;
  public isComputer: boolean;
  public isSpectator: boolean;
  public disconnected: boolean;

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
    this.isSpectator = false;
    this.disconnected = false;
    this.status = 'invited'; // Default status
    this.ready = false; // Default ready state
  }

  setHand(cards: Card[]): void {
    this.hand = [...cards];
    this.sortHand();
  }

  setUpCards(cards: Array<Card | null>): void {
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
    const card = this.upCards[index];
    if (!card) return undefined;
    this.upCards[index] = null;
    return card;
  }

  playDownCard(index: number): Card | undefined {
    if (index < 0 || index >= this.downCards.length) return undefined;
    return this.downCards.splice(index, 1)[0];
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
    return this.getUpCardCount() === 0;
  }

  hasEmptyDown(): boolean {
    return this.downCards.length === 0;
  }

  getUpCardCount(): number {
    let count = 0;
    for (const card of this.upCards) {
      if (card) {
        count++;
      }
    }
    return count;
  }
}
