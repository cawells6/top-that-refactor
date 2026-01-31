import type { JoinGamePayload } from './types.js';

export const VALIDATION_RULES = {
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 20,
  MIN_TOTAL_PLAYERS: 2,
} as const;

/**
 * Validates player join requests.
 * Rule: Minimum 2 players enforced ONLY during room creation (no roomId).
 */
export function validateJoinPayload(
  data: JoinGamePayload
): { isValid: boolean; error?: string } {
  if (
    typeof data.playerName !== 'string' ||
    data.playerName.trim().length < VALIDATION_RULES.MIN_NAME_LENGTH
  ) {
    return { isValid: false, error: 'Name is required.' };
  }
  if (data.playerName.length > VALIDATION_RULES.MAX_NAME_LENGTH) {
    return {
      isValid: false,
      error: `Name must be under ${VALIDATION_RULES.MAX_NAME_LENGTH} characters.`,
    };
  }

  const isCreatingRoom = !data.roomId;
  if (isCreatingRoom) {
    const total = data.numHumans + data.numCPUs;
    if (total < VALIDATION_RULES.MIN_TOTAL_PLAYERS) {
      return {
        isValid: false,
        error: `At least ${VALIDATION_RULES.MIN_TOTAL_PLAYERS} players are required to start a game.`,
      };
    }
  }

  return { isValid: true };
}
