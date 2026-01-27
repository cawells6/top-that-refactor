import {
  JoinGamePayload,
  JoinGameResponse,
  GameStateData,
  InSessionLobbyState,
  Card,
  AddToPileOptions,
  RejoinData
} from './types';

// --- EVENT NAME CONSTANTS ---
// Game setup and flow
export const JOIN_GAME = 'join-game';
export const JOINED = 'joined';
export const START_GAME = 'start-game';
export const GAME_STARTED = 'game-started';
export const ANIMATIONS_COMPLETE = 'animations-complete';
export const NEXT_TURN = 'next-turn';
export const GAME_OVER = 'game-over';
export const REJOIN = 'rejoin';

// Player actions
export const PLAY_CARD = 'play-card';
export const PICK_UP_PILE = 'pick-up-pile';
export const CARD_PLAYED = 'card-played';
export const PILE_PICKED_UP = 'pile-picked-up';

// Lobby system events
export const LOBBY_CREATED = 'lobbyCreated';
export const PLAYER_READY = 'playerReady';
export const LOBBY_STATE_UPDATE = 'lobbyStateUpdate';

// Game state and updates
export const STATE_UPDATE = 'state-update';
export const SPECIAL_CARD_EFFECT = 'specialCardEffect';

// Errors
export const ERROR = 'err';
export const SESSION_ERROR = 'session-error';

// --- TYPED EVENT CONTRACTS ---

/**
 * Events sent FROM Client TO Server
 */
export interface ClientToServerEvents {
  // Lobby & Setup
  [JOIN_GAME]: (payload: JoinGamePayload, callback?: (response: JoinGameResponse) => void) => void;
  [PLAYER_READY]: (payload: { isReady: boolean }) => void;
  [START_GAME]: () => void;
  [REJOIN]: (payload: RejoinData, callback?: (response: JoinGameResponse) => void) => void;

  // In-Game Actions
  [PLAY_CARD]: (payload: { cardIndices: number[] }) => void;
  [PICK_UP_PILE]: () => void;
  [ANIMATIONS_COMPLETE]: () => void;

  // Debug / Misc
  'debug-reset-game': () => void;
}

/**
 * Events sent FROM Server TO Client
 */
export interface ServerToClientEvents {
  // Lobby Updates
  [LOBBY_STATE_UPDATE]: (state: InSessionLobbyState) => void;
  [JOINED]: (response: JoinGameResponse) => void;
  [LOBBY_CREATED]: (roomId: string) => void;

  // Game Lifecycle
  [GAME_STARTED]: (gameState: GameStateData) => void;
  [STATE_UPDATE]: (gameState: GameStateData) => void;
  [GAME_OVER]: (payload: { winnerId: string; winnerName: string }) => void;

  // Action Feedback
  [CARD_PLAYED]: (payload: {
    playerId: string;
    cards: Card[];
    newPileSize: number;
    pileTop: Card | null;
  }) => void;

  [PILE_PICKED_UP]: (payload: {
    playerId: string;
    pileSize: number;
  }) => void;

  [SPECIAL_CARD_EFFECT]: (payload: {
    type: 'ten' | 'two' | 'four-of-a-kind';
    playerId: string;
    description: string;
  }) => void;

  // Errors
  [ERROR]: (message: string) => void;
  [SESSION_ERROR]: (message: string) => void;
}

// Debug helper
export function logEventNames() {
  console.log('Event Names Loaded:', { JOIN_GAME, PLAY_CARD, GAME_STARTED });
}
