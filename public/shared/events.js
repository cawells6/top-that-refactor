// public/shared/events.js
// Shared Socket.IO event constants (served to browser)

/** Client requests to join a game (short form, legacy) */
export const JOIN = 'join';

/** Client requests to join a game (preferred long form) */
export const JOIN_GAME = 'join-game';

/** Server confirms a client has joined and provides their ID/room */
export const JOINED = 'joined';

/** Server notifies all clients that a player has joined */
export const PLAYER_JOINED = 'player-joined';

/** Server emits lobby state (room, players, maxPlayers) */
export const LOBBY = 'lobby';

/** Server emits the current game state (preferred long form) */
export const STATE_UPDATE = 'state-update';

/** Client requests to rejoin a game after disconnect */
export const REJOIN = 'rejoin';

/** Server notifies client of a special card played (e.g., two, five, ten) */
export const SPECIAL_CARD = 'special-card';

/** Server notifies clients of the next player's turn */
export const NEXT_TURN = 'next-turn';

/** Client requests to start the game */
export const START_GAME = 'start-game';
