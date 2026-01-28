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
  avatar?: string;
  handCount?: number;
  upCount?: number;
  downCount?: number;
  hand?: Card[];
  upCards?: Array<Card | null>;
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
  avatar?: string;
  status: 'host' | 'invited' | 'joined' | 'ready';
  isComputer?: boolean; // Whether this player is a bot/CPU
  isSpectator?: boolean;
}

export interface InSessionLobbyState {
  roomId: string;
  hostId: string | null;
  players: LobbyPlayer[];
  started?: boolean; // Added to communicate game start state
  expectedHumanCount?: number;
  expectedCpuCount?: number;
}

// Payload for joining a game (used by both client and server)
export interface JoinGamePayload {
  id?: string;
  playerName: string;
  avatar?: string;
  numHumans: number;
  numCPUs: number;
  roomId?: string;
  spectator?: boolean;
}

// Standardized ack/response for JOIN_GAME
export type JoinGameResponse =
  | { success: true; roomId: string; playerId: string }
  | { success: false; error: string };

export interface RejoinData {
  roomId: string;
  playerId: string;
}

export interface AddToPileOptions {
  isCopy?: boolean;
}

// --- NETWORK PAYLOADS ---

// (Keep JoinGamePayload/Response as is)

export interface PlayCardPayload {
  cardIndices: number[];
}

export interface PlayerReadyPayload {
  isReady: boolean;
}

export interface CardPlayedPayload {
  playerId: string;
  cards: Card[];
  newPileSize: number;
  pileTop: Card | null;
}

export interface PilePickedUpPayload {
  playerId: string;
  pileSize: number;
}

export interface NextTurnPayload {
  currentPlayerId: string;
}

export interface GameOverPayload {
  winnerId: string;
  winnerName: string;
}

export interface SpecialCardEffectPayload {
  type: 'ten' | 'two' | 'four-of-a-kind' | 'five' | 'regular';
  value?: string | number | null;
  playerId?: string;
  description?: string;
}
