// Server-side validation utilities
import { ERROR_MESSAGES, createErrorResponse } from './errorCodes.js';

export interface ServerValidationResult {
  isValid: boolean;
  errorResponse?: {
    error: string;
    code: string;
  };
}

/**
 * Validates JOIN_GAME payload on the server side
 */
export function validateJoinGamePayloadServer(
  payload: any
): ServerValidationResult {
  // Check if payload exists
  if (!payload || typeof payload !== 'object') {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_PAYLOAD',
        ERROR_MESSAGES.INVALID_PAYLOAD
      ),
    };
  }

  // Validate player name
  if (
    !payload.playerName ||
    typeof payload.playerName !== 'string' ||
    !payload.playerName.trim()
  ) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_PLAYER_NAME',
        ERROR_MESSAGES.INVALID_PLAYER_NAME
      ),
    };
  }

  const trimmedName = payload.playerName.trim();
  if (trimmedName.length > 20) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_PLAYER_NAME',
        'Player name must be 20 characters or less'
      ),
    };
  }

  if (!/^[a-zA-Z0-9\s._-]+$/.test(trimmedName)) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_PLAYER_NAME',
        'Player name contains invalid characters'
      ),
    };
  }

  // Validate numHumans
  if (
    typeof payload.numHumans !== 'number' ||
    !Number.isInteger(payload.numHumans) ||
    payload.numHumans < 1 ||
    payload.numHumans > 6
  ) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_PAYLOAD',
        'Number of human players must be between 1 and 6'
      ),
    };
  }

  // Validate numCPUs
  if (
    typeof payload.numCPUs !== 'number' ||
    !Number.isInteger(payload.numCPUs) ||
    payload.numCPUs < 0 ||
    payload.numCPUs > 5
  ) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_PAYLOAD',
        'Number of CPU players must be between 0 and 5'
      ),
    };
  }

  // Validate total players
  const totalPlayers = payload.numHumans + payload.numCPUs;
  if (totalPlayers < 2) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_PAYLOAD',
        'At least 2 total players are required'
      ),
    };
  }

  if (totalPlayers > 6) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_PAYLOAD',
        'Maximum 6 total players allowed'
      ),
    };
  }

  // Validate roomId if provided
  if (payload.roomId !== undefined) {
    if (
      typeof payload.roomId !== 'string' ||
      !payload.roomId.trim() ||
      !/^[a-zA-Z0-9-]+$/.test(payload.roomId) ||
      payload.roomId.length > 10
    ) {
      return {
        isValid: false,
        errorResponse: createErrorResponse(
          'INVALID_PAYLOAD',
          'Invalid room ID format'
        ),
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates REJOIN payload on the server side
 */
export function validateRejoinDataServer(payload: any): ServerValidationResult {
  // Check if payload exists
  if (!payload || typeof payload !== 'object') {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_REJOIN_DATA',
        ERROR_MESSAGES.INVALID_REJOIN_DATA
      ),
    };
  }

  // Validate roomId
  if (
    !payload.roomId ||
    typeof payload.roomId !== 'string' ||
    !payload.roomId.trim()
  ) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_REJOIN_DATA',
        'Room ID is required for rejoin'
      ),
    };
  }

  if (!/^[a-zA-Z0-9-]+$/.test(payload.roomId)) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_REJOIN_DATA',
        'Invalid room ID format'
      ),
    };
  }

  // Validate playerId
  if (
    !payload.playerId ||
    typeof payload.playerId !== 'string' ||
    !payload.playerId.trim()
  ) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_REJOIN_DATA',
        'Player ID is required for rejoin'
      ),
    };
  }

  return { isValid: true };
}

/**
 * Validates play card data on the server side
 */
export function validatePlayCardData(payload: any): ServerValidationResult {
  if (!payload || typeof payload !== 'object') {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_PAYLOAD',
        'Invalid play card data'
      ),
    };
  }

  // Validate cardIndices
  if (!Array.isArray(payload.cardIndices) || payload.cardIndices.length === 0) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_PAYLOAD',
        'Card indices must be a non-empty array'
      ),
    };
  }

  // Validate each card index
  for (const index of payload.cardIndices) {
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
      return {
        isValid: false,
        errorResponse: createErrorResponse(
          'INVALID_PAYLOAD',
          'Card indices must be non-negative integers'
        ),
      };
    }
  }

  // Validate zone
  if (
    !payload.zone ||
    typeof payload.zone !== 'string' ||
    !['hand', 'upCards', 'downCards'].includes(payload.zone)
  ) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_PAYLOAD',
        'Invalid card zone specified'
      ),
    };
  }

  return { isValid: true };
}

/**
 * Validates start game options on the server side
 */
export function validateStartGameOptions(payload: any): ServerValidationResult {
  if (!payload || typeof payload !== 'object') {
    // Allow empty payload for start game
    return { isValid: true };
  }

  // Validate computerCount if provided
  if (payload.computerCount !== undefined) {
    if (
      typeof payload.computerCount !== 'number' ||
      !Number.isInteger(payload.computerCount) ||
      payload.computerCount < 0 ||
      payload.computerCount > 5
    ) {
      return {
        isValid: false,
        errorResponse: createErrorResponse(
          'INVALID_PAYLOAD',
          'Computer count must be between 0 and 5'
        ),
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates general string input on server side
 */
export function validateStringInput(
  value: any,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  } = {}
): ServerValidationResult {
  if (options.required && (value === undefined || value === null)) {
    return {
      isValid: false,
      errorResponse: createErrorResponse(
        'INVALID_PAYLOAD',
        `${fieldName} is required`
      ),
    };
  }

  if (value !== undefined && value !== null) {
    if (typeof value !== 'string') {
      return {
        isValid: false,
        errorResponse: createErrorResponse(
          'INVALID_PAYLOAD',
          `${fieldName} must be a string`
        ),
      };
    }

    const trimmedValue = value.trim();

    if (options.required && trimmedValue.length === 0) {
      return {
        isValid: false,
        errorResponse: createErrorResponse(
          'INVALID_PAYLOAD',
          `${fieldName} cannot be empty`
        ),
      };
    }

    if (options.minLength && trimmedValue.length < options.minLength) {
      return {
        isValid: false,
        errorResponse: createErrorResponse(
          'INVALID_PAYLOAD',
          `${fieldName} must be at least ${options.minLength} characters`
        ),
      };
    }

    if (options.maxLength && trimmedValue.length > options.maxLength) {
      return {
        isValid: false,
        errorResponse: createErrorResponse(
          'INVALID_PAYLOAD',
          `${fieldName} must be ${options.maxLength} characters or less`
        ),
      };
    }

    if (options.pattern && !options.pattern.test(trimmedValue)) {
      return {
        isValid: false,
        errorResponse: createErrorResponse(
          'INVALID_PAYLOAD',
          `${fieldName} has invalid format`
        ),
      };
    }
  }

  return { isValid: true };
}
