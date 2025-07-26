// Shared error codes for consistent error handling across client and server

export const ERROR_CODES = {
  // Join game errors
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  GAME_FULL: 'GAME_FULL',
  GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
  DUPLICATE_JOIN: 'DUPLICATE_JOIN',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  
  // Player errors
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  INVALID_PLAYER_NAME: 'INVALID_PLAYER_NAME',
  
  // Rejoin errors
  INVALID_REJOIN_DATA: 'INVALID_REJOIN_DATA',
  REJOIN_FAILED: 'REJOIN_FAILED',
  INVALID_ROOM_FOR_REJOIN: 'INVALID_ROOM_FOR_REJOIN',
  
  // Network errors
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // Validation errors
  INVALID_PLAYER_COUNT: 'INVALID_PLAYER_COUNT',
  INVALID_ROOM_CODE: 'INVALID_ROOM_CODE',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// Helper function to create standardized error responses
export function createErrorResponse(
  code: ErrorCode,
  message: string
): { success: false; error: string; code: string } {
  return {
    success: false,
    error: message,
    code: ERROR_CODES[code],
  };
}

// User-friendly error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_PAYLOAD]: 'Please check your input and try again.',
  [ERROR_CODES.GAME_FULL]:
    'This game is full. Please try joining another game.',
  [ERROR_CODES.GAME_ALREADY_STARTED]:
    'This game has already started. You cannot join now.',
  [ERROR_CODES.DUPLICATE_JOIN]: 'You are already in this game.',
  [ERROR_CODES.ROOM_NOT_FOUND]:
    'Game room not found. Please check the room code.',
  [ERROR_CODES.PLAYER_NOT_FOUND]: 'Player not found in this game.',
  [ERROR_CODES.INVALID_PLAYER_NAME]: 'Please enter a valid player name.',
  [ERROR_CODES.INVALID_REJOIN_DATA]:
    'Unable to reconnect. Please join a new game.',
  [ERROR_CODES.REJOIN_FAILED]: 'Failed to reconnect to the game.',
  [ERROR_CODES.INVALID_ROOM_FOR_REJOIN]: 'Cannot reconnect to this room.',
  [ERROR_CODES.CONNECTION_ERROR]:
    'Connection error. Please check your internet and try again.',
  [ERROR_CODES.TIMEOUT]: 'Request timed out. Please try again.',
  [ERROR_CODES.INVALID_PLAYER_COUNT]:
    'Invalid number of players. Please check your settings.',
  [ERROR_CODES.INVALID_ROOM_CODE]: 'Invalid room code format.',
};
