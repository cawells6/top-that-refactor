// src/shared/constants.ts
/**
 * Centralized timing and configuration constants for Top That!
 * All time values are in milliseconds unless otherwise noted.
 */

// ========================================
// SERVER-SIDE CONSTANTS (GameController)
// ========================================

/**
 * How often the GameRoomManager checks for stale/empty rooms
 * Currently: Every 5 minutes
 */
export const ROOM_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Inactive rooms (started games with no connected clients) are cleaned up after this time
 * Currently: 30 minutes
 */
export const STALE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Empty rooms (never started, no connected clients) are cleaned up after this time
 * Currently: 10 minutes
 */
export const EMPTY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Grace period after last human disconnects before game auto-ends
 * Mentioned in ROADMAP as "30s timer"
 * Currently: 30 seconds
 */
export const SHUTDOWN_GRACE_PERIOD_MS = 30 * 1000; // 30 seconds

/**
 * Fallback duration for the startup lock if not overridden via env or test mode.
 * Covers opening deal animation + overlay dismiss.
 * Currently: 12000ms (12 seconds)
 */
export const STARTUP_LOCK_FALLBACK_MS = 12000;

/**
 * Short delay before scheduling a CPU turn after a player rejoins.
 * Keeps the game moving without an instant bot play.
 * Currently: 250ms
 */
export const POST_REJOIN_BOT_DELAY_MS = 250;

/**
 * Delay between turns to allow for animation transitions
 * Used in GameController for turn sequencing
 * Currently: 400ms
 */
export const TURN_TRANSITION_DELAY_MS = 400;

/**
 * Standard delay for CPU player turns (normal moves)
 * Currently: 2000ms (2 seconds)
 */
export const CPU_TURN_DELAY_MS = 2000;

/**
 * Extended delay for CPU player special card plays (for dramatic effect)
 * Currently: 3000ms (3 seconds)
 */
export const CPU_SPECIAL_DELAY_MS = 3000;

// ========================================
// CLIENT-SIDE ANIMATION CONSTANTS
// ========================================

/**
 * Duration the play pile blanks out when player picks it up
 * Synchronized between client and server for animation timing
 * Currently: 1000ms
 */
export const TAKE_PILE_BLANK_MS = 1000;

/**
 * Duration of card animation from deck to play pile
 * Currently: 550ms
 */
export const DECK_TO_PILE_ANIMATION_MS = 550;

/**
 * Buffer time after flip animation completes before rendering next state
 * Currently: 50ms
 */
export const POST_FLIP_RENDER_BUFFER_MS = 50;

/**
 * General animation delay between sequential card plays
 * Currently: 450ms
 */
export const ANIMATION_DELAY_MS = 450;

/**
 * Duration the UI pauses after a burn (invalid play) before continuing
 * Currently: 1000ms
 */
export const BURN_TURN_HOLD_MS = 1000;

/**
 * Simulated "thinking time" for bot players during animations
 * Currently: 450ms
 */
export const BOT_THINKING_TIME = 450;

/**
 * Failsafe timeout to unlock animation queue if it gets stuck
 * Currently: 10000ms (10 seconds)
 */
export const SAFETY_UNLOCK_MS = 10000;

/**
 * Number of queued plays that triggers jitter reduction (faster bot thinking)
 * Currently: 3 plays
 */
export const JITTER_BATCH_THRESHOLD = 3;

// ========================================
// DEALING ANIMATION CONSTANTS
// ========================================

/**
 * Interval between dealing individual cards during opening deal
 * Currently: 100ms
 */
export const DEAL_INTERVAL_MS = 100;

/**
 * Duration of card flight animation during opening deal
 * Currently: 600ms
 */
export const FLIGHT_DURATION_MS = 600;

/**
 * Pause between phases during opening deal (up cards, down cards, hand)
 * Currently: 400ms
 */
export const PHASE_PAUSE_MS = 400;

/**
 * Time before "Let's Play!" overlay auto-dismisses
 * Currently: 2500ms
 */
export const START_OVERLAY_AUTO_DISMISS_MS = 2500;

/**
 * Duration of fade-out animation for start overlay
 * Currently: 180ms
 */
export const START_OVERLAY_FADE_MS = 180;
