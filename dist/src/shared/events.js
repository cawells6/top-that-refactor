// src/shared/events.js
// Game setup and flow
export const JOIN_GAME = 'join-game';
export const JOINED = 'joined';
export const PLAYER_JOINED = 'player-joined'; // Sent to all clients when a new player joins the lobby
export const LOBBY = 'lobby'; // Sent when lobby details change (e.g. new player, game starting)
export const START_GAME = 'start-game';
export const GAME_STARTED = 'game-started'; // Confirms game has started, includes initial full state
export const NEXT_TURN = 'next-turn';
export const GAME_OVER = 'game-over';
export const REJOIN = 'rejoin'; // Player attempts to rejoin a game in progress
// New events
export const PLAY_CARD_VALIDATED = 'playCardValidated'; // Server to client (optional)
export const GAME_LOG_ENTRY = 'gameLogEntry'; // Server to clients, payload: { message: string }
export const PLAYER_ACTION_ERROR = 'playerActionError'; // Server to client, payload: { message: string }
// Player actions
export const PLAY_CARD = 'play-card';
export const PICK_UP_PILE = 'pick-up-pile'; // Player chooses to pick up the pile
export const CARD_PLAYED = 'card-played'; // A card was successfully played
export const PILE_PICKED_UP = 'pile-picked-up'; // The pile was picked up by a player
// Game state and updates
export const STATE_UPDATE = 'state-update'; // Generic state update from server
export const SPECIAL_CARD_EFFECT = 'specialCardEffect'; // Renamed from SPECIAL_CARD, Indicates a special card effect (e.g., 2, 5, 10 played)
// Errors and generic messages
export const ERROR = 'err'; // Generic error message from server
export const MESSAGE = 'message'; // Generic message from server
// Optional: You could also define these as an enum if you prefer,
// though string constants are very common for event names.
/*
export enum GameEvents {
  JoinGame = 'join-game',
  Joined = 'joined',
  // ... etc.
}
*/
