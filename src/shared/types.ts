// Shared types for Top That!

export type CardValue = string | number;

export interface Card {
  value: CardValue;
  suit: string;
  back?: boolean;
  copied?: boolean;
}

export interface ClientStatePlayer {
  id: string;
  name: string;
  handCount?: number;
  upCount?: number;
  downCount?: number;
  hand?: Card[];
  upCards?: Card[];
  downCardsHidden?: number; // Number of down cards (hidden)
  disconnected?: boolean;
  isComputer?: boolean;
}

export interface GameStateData {
  players: ClientStatePlayer[];
  pile: Card[];
  discardCount: number;
  deckSize: number;
  currentPlayerId?: string;
  started: boolean;
  lastRealCard: Card | null;
}
