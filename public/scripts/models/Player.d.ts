import { Card } from '../src/types.js';
export default class Player {
  id: string;
  socketId?: string;
  hand: Card[];
  upCards: Card[];
  downCards: Card[];
  name: string;
  isComputer: boolean;
  disconnected: boolean;
  ready: boolean;
  constructor(id: string);
  setHand(cards: Card[]): void;
  setUpCards(cards: Card[]): void;
  setDownCards(cards: Card[]): void;
  playFromHand(index: number): Card | undefined;
  playUpCard(index: number): Card | undefined;
  playDownCard(): Card | undefined;
  pickUpPile(pile: Card[]): void;
  sortHand(): void;
  hasEmptyHand(): boolean;
  hasEmptyUp(): boolean;
  hasEmptyDown(): boolean;
}
//# sourceMappingURL=Player.d.ts.map
