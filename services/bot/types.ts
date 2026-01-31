import { Card } from '../../src/shared/types';

export type BotPlayCardsAction = {
  action: 'PLAY';
  cards: Card[];
  indices: number[];
  zone: 'hand' | 'upCards' | 'downCards';
};

export type BotPickupAction = {
  action: 'PICKUP';
};

export type BotAction = BotPlayCardsAction | BotPickupAction;
