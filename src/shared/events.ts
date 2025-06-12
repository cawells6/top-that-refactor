// src/shared/events.ts

// Game setup and flow
export const JOIN_GAME: string = 'join-game';
export const JOINED: string = 'joined';
export const PLAYER_JOINED: string = 'player-joined'; // Sent to all clients when a new player joins the lobby
export const LOBBY: string = 'lobby'; // Sent when lobby details change (e.g. new player, game starting)
export const CREATE_LOBBY: string = 'create-lobby';
export const LOBBY_CREATED: string = 'lobby-created';
export const JOIN_LOBBY: string = 'join-lobby';
export const START_GAME: string = 'start-game';
export const GAME_STARTED: string = 'game-started'; // Confirms game has started, includes initial full state
export const NEXT_TURN: string = 'next-turn';
export const GAME_OVER: string = 'game-over';
export const REJOIN: string = 'rejoin'; // Player attempts to rejoin a game in progress

// New events
export const PLAY_CARD_VALIDATED: string = 'playCardValidated'; // Server to client (optional)
export const GAME_LOG_ENTRY: string = 'gameLogEntry'; // Server to clients, payload: { message: string }
export const PLAYER_ACTION_ERROR: string = 'playerActionError'; // Server to client, payload: { message: string }

// Player actions
export const PLAY_CARD: string = 'play-card';
export const PICK_UP_PILE: string = 'pick-up-pile'; // Player chooses to pick up the pile
export const CARD_PLAYED: string = 'card-played'; // A card was successfully played
export const PILE_PICKED_UP: string = 'pile-picked-up'; // The pile was picked up by a player

// Game state and updates
export const STATE_UPDATE: string = 'state-update'; // Generic state update from server
export const SPECIAL_CARD_EFFECT: string = 'specialCardEffect'; // Renamed from SPECIAL_CARD, Indicates a special card effect (e.g., 2, 5, 10 played)

// Errors and generic messages
export const ERROR: string = 'err'; // Generic error message from server
export const MESSAGE: string = 'message'; // Generic message from server

// Lobby events
export const LOBBY_STATE_UPDATE: string = 'lobby-state-update';
export const PLAYER_READY: string = 'player-ready';
export const SEND_INVITE: string = 'send-invite';

// Optional: You could also define these as an enum if you prefer,
// though string constants are very common for event names.
/*
export enum GameEvents {
  JoinGame = 'join-game',
  Joined = 'joined',
  // ... etc.
}
*/
