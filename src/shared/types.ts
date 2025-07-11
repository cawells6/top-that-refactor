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
  downCards?: Card[]; // Added for server compatibility
  downCardsHidden?: number; // Number of down cards (hidden)
  disconnected?: boolean;
  isComputer?: boolean;
  error?: string; // Added for server compatibility
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

// Represents a player in the lobby. `status` shows whether the
// player is the host, just joined, or has clicked the ready button.
export interface LobbyPlayer {
  id: string;
  name: string;
  status: 'host' | 'invited' | 'joined' | 'ready';
}

export interface InSessionLobbyState {
  roomId: string;
  hostId: string | null;
  players: LobbyPlayer[];
  started?: boolean; // Added to communicate game start state
}

// Payload for joining a game (used by both client and server)
export interface JoinGamePayload {
  id?: string;
  playerName: string;
  numHumans: number;
  numCPUs: number;
  roomId?: string;
}
