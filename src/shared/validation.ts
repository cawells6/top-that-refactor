import { JoinGamePayload } from './types.js';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateJoinPayload(
  payload: JoinGamePayload,
  isHost: boolean,
  maxPlayers: number
): ValidationResult {
  if (!payload.playerName || !payload.playerName.trim()) {
    return { isValid: false, error: 'Name is required.' };
  }

  if (isHost) {
    const numHumans = payload.numHumans ?? 0;
    const numCPUs = payload.numCPUs ?? 0;
    const total = numHumans + numCPUs;

    if (!Number.isInteger(numHumans) || !Number.isInteger(numCPUs)) {
      return { isValid: false, error: 'Player counts must be whole numbers.' };
    }
    if (numHumans < (payload.spectator ? 0 : 1)) {
      return { isValid: false, error: 'At least 1 human required to play.' };
    }
    if (total < 2) {
      return { isValid: false, error: 'Minimum 2 players required.' };
    }
    if (total > maxPlayers) {
      return { isValid: false, error: `Room is full (Max: ${maxPlayers}).` };
    }
  }
  return { isValid: true };
}
