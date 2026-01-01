// Client-side validation utilities
import { JoinGamePayload, RejoinData } from '../../src/shared/types.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates JOIN_GAME payload on the client side before emitting
 */
export function validateJoinGamePayload(
  payload: Partial<JoinGamePayload>
): ValidationResult {
  const errors: string[] = [];
  const maxPlayers = 4;

  // Validate player name
  if (!payload.playerName || typeof payload.playerName !== 'string') {
    errors.push('Player name is required');
  } else if (payload.playerName.trim().length === 0) {
    errors.push('Player name cannot be empty');
  } else if (payload.playerName.trim().length > 20) {
    errors.push('Player name must be 20 characters or less');
  } else if (!/^[a-zA-Z0-9\s._-]+$/.test(payload.playerName.trim())) {
    errors.push(
      'Player name can only contain letters, numbers, spaces, dots, underscores, and hyphens'
    );
  }

  // Validate numHumans
  const minHumans = payload.spectator ? 0 : 1;
  if (typeof payload.numHumans !== 'number') {
    errors.push('Number of human players must be specified');
  } else if (!Number.isInteger(payload.numHumans)) {
    errors.push('Number of human players must be a whole number');
  } else if (payload.numHumans < minHumans) {
    errors.push('At least 1 human player is required');
  } else if (payload.numHumans > maxPlayers) {
    errors.push('Maximum 4 human players allowed');
  }

  // Validate numCPUs
  if (typeof payload.numCPUs !== 'number') {
    errors.push('Number of CPU players must be specified');
  } else if (!Number.isInteger(payload.numCPUs)) {
    errors.push('Number of CPU players must be a whole number');
  } else if (payload.numCPUs < 0) {
    errors.push('Number of CPU players cannot be negative');
  } else if (payload.numCPUs > maxPlayers) {
    errors.push('Maximum 4 CPU players allowed');
  }

  // Validate total players (only for new game creation, not for joining existing games)
  if (
    typeof payload.numHumans === 'number' &&
    typeof payload.numCPUs === 'number' &&
    !payload.roomId // Skip player count validation when joining existing rooms
  ) {
    const totalPlayers = payload.numHumans + payload.numCPUs;
    if (totalPlayers < 2) {
      errors.push('At least 2 total players (humans + CPUs) are required');
    } else if (totalPlayers > maxPlayers) {
      errors.push('Maximum 4 total players allowed');
    }
  }

  // Validate roomId if provided (for joining existing rooms)
  if (payload.roomId !== undefined) {
    if (typeof payload.roomId !== 'string') {
      errors.push('Room ID must be a string');
    } else if (payload.roomId.trim().length === 0) {
      errors.push('Room ID cannot be empty');
    } else if (!/^[a-zA-Z0-9-]+$/.test(payload.roomId)) {
      errors.push('Room ID can only contain letters, numbers, and hyphens');
    } else if (payload.roomId.length > 10) {
      errors.push('Room ID must be 10 characters or less');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates REJOIN payload on the client side before emitting
 */
export function validateRejoinData(
  payload: Partial<RejoinData>
): ValidationResult {
  const errors: string[] = [];

  // Validate roomId
  if (!payload.roomId || typeof payload.roomId !== 'string') {
    errors.push('Room ID is required for rejoin');
  } else if (payload.roomId.trim().length === 0) {
    errors.push('Room ID cannot be empty');
  } else if (!/^[a-zA-Z0-9-]+$/.test(payload.roomId)) {
    errors.push('Invalid room ID format');
  }

  // Validate playerId
  if (!payload.playerId || typeof payload.playerId !== 'string') {
    errors.push('Player ID is required for rejoin');
  } else if (payload.playerId.trim().length === 0) {
    errors.push('Player ID cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates general form inputs
 */
export function validateFormField(
  value: string,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternErrorMessage?: string;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  const trimmedValue = value.trim();

  if (options.required && trimmedValue.length === 0) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }

  if (trimmedValue.length > 0) {
    if (options.minLength && trimmedValue.length < options.minLength) {
      errors.push(
        `${fieldName} must be at least ${options.minLength} characters`
      );
    }

    if (options.maxLength && trimmedValue.length > options.maxLength) {
      errors.push(
        `${fieldName} must be ${options.maxLength} characters or less`
      );
    }

    if (options.pattern && !options.pattern.test(trimmedValue)) {
      errors.push(
        options.patternErrorMessage || `${fieldName} has invalid format`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Display validation errors to the user
 */
export function displayValidationErrors(
  errors: string[],
  containerId = 'error-container'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Error container with ID '${containerId}' not found`);
    // Fallback: show first error in alert
    if (errors.length > 0) {
      alert(`Validation Error: ${errors[0]}`);
    }
    return;
  }

  if (errors.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const errorList = errors.map((error) => `<li>${error}</li>`).join('');
  container.innerHTML = `
    <div class="error-message">
      <h4>Please fix the following errors:</h4>
      <ul>${errorList}</ul>
    </div>
  `;
  container.style.display = 'block';
}

/**
 * Clear validation errors display
 */
export function clearValidationErrors(containerId = 'error-container'): void {
  displayValidationErrors([], containerId);
}
