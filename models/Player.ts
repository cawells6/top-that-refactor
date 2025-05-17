// models/Player.ts
import { Card } from '../src/types'; // Path to your types.ts file
import { rank } from '../utils/cardUtils';

export default class Player {
  public id: string;
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
    return this.hand.splice(index, 1)[0];
  }

  playUpCard(index: number): Card | undefined {
    return this.upCards.splice(index, 1)[0];
  }

  playDownCard(): Card | undefined {
    const idx = Math.floor(Math.random() * this.downCards.length);
    return this.downCards.splice(idx, 1)[0];
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