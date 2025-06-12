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

/**
 * Basic information about a player in a lobby.
 *
 * The {@link ready} flag indicates whether the player has clicked the
 * "Let's Play" button.  The host will generally be treated as ready by
 * default on the server side.
 */
export interface LobbyPlayer {
  id: string;
  name: string;
  /**
   * True when the player has indicated they are ready to start.
   * Undefined means the ready state hasn't been set yet.
   */
  ready?: boolean;
}

/**
 * Payload sent with the {@link LOBBY_STATE_UPDATE} event.  It represents the
 * current state of the game lobby and is shared by both the client and server.
 */
export interface LobbyState {
  roomId: string;
  hostId: string | null;
  players: LobbyPlayer[];
  /** When true the game has already started and the lobby should close. */
  started?: boolean;
}
