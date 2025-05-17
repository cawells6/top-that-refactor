/**
 * @constant {string} JOIN
 * @description Client requests to join a game (short form, legacy).
 */
export const JOIN = 'join';

/**
 * @constant {string} JOIN_GAME
 * @description Client requests to join a game (preferred long form).
 */
export const JOIN_GAME = 'join-game';

/**
 * @constant {string} JOINED
 * @description Server confirms a client has joined and provides their ID/room.
 */
export const JOINED = 'joined';

/**
 * @constant {string} PLAYER_JOINED
 * @description Server notifies all clients that a player has joined.
 */
export const PLAYER_JOINED = 'player-joined';

/**
 * @constant {string} LOBBY
 * @description Server emits lobby state (room, players, maxPlayers).
 */
export const LOBBY = 'lobby';

/**
 * @constant {string} STATE
 * @description Server emits the current game state (short form, legacy).
 */
export const STATE = 'state';

/**
 * @constant {string} STATE_UPDATE
 * @description Server emits the current game state (preferred long form).
 */
export const STATE_UPDATE = 'state-update';

/**
 * @constant {string} SPECIAL_CARD
 * @description Server notifies client of a special card played (e.g., two, five, ten).
 */
export const SPECIAL_CARD = 'special-card';

/**
 * @constant {string} REJOIN
 * @description Client requests to rejoin a game after disconnect.
 */
export const REJOIN = 'rejoin';

/**
 * @constant {string} START_GAME
 * @description Client requests to start the game.
 */
export const START_GAME = 'start-game';

/**
 * @constant {string} NEXT_TURN
 * @description Server notifies clients of the next player's turn.
 */
export const NEXT_TURN = 'next-turn';
