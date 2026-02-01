// public/scripts/coordinators/OpeningDealCoordinator.ts
import type { GameStateData } from '../../../src/shared/types.js';
import { performOpeningDeal } from '../dealing-animation.js';
import { renderGameState } from '../render.js';

/**
 * Coordinates opening deal animation and prevents re-triggering.
 * Extracted from socketService.ts to reduce god file anti-pattern.
 * 
 * This class encapsulates:
 * - Fresh game detection logic (checking if all players have their initial cards)
 * - Opening deal animation sequencing (skeleton -> animation -> normal render)
 * - State flags to prevent duplicate animations across reconnections
 */
export class OpeningDealCoordinator {
  private hasDealtOpeningHand = false;
  private hasPlayedOpeningDeal = false;

  /**
   * Checks if game state indicates a fresh deal and triggers animation if needed.
   * @param gameState - Current game state from server
   * @param myPlayerId - Current player's ID
   * @returns true if opening deal was triggered, false otherwise
   */
  async handleStateUpdate(
    gameState: GameStateData,
    myPlayerId: string | null
  ): Promise<boolean> {
    const players = gameState.players ?? [];
    
    if (!gameState.started || this.hasDealtOpeningHand || players.length === 0) {
      return false;
    }

    // Check if this looks like a fresh deal (all players have cards)
    const looksLikeFreshDeal = players.every(
      (p) =>
        (p.handCount || 0) > 0 &&
        (p.downCount || 0) === 3 &&
        (p.upCards?.length || 0) === 3
    );

    if (!looksLikeFreshDeal) {
      return false;
    }

    this.hasDealtOpeningHand = true;
    await this.performOpeningDealSequence(gameState, myPlayerId);
    this.hasPlayedOpeningDeal = true;
    
    return true;
  }

  /**
   * Performs the full opening deal animation sequence.
   * This is a multi-stage process:
   * 1. Clear existing cards from DOM
   * 2. Render skeleton mode (shows player slots but no cards)
   * 3. Play dealing animation
   * 4. Render normal mode with all cards visible
   */
  private async performOpeningDealSequence(
    gameState: GameStateData,
    myPlayerId: string | null
  ): Promise<void> {
    // 1. Clear any existing cards from the table
    const gameTable = document.getElementById('game-table');
    if (gameTable) {
      const playerAreas = gameTable.querySelectorAll('.player-area');
      playerAreas.forEach((area) => {
        const handRow = area.querySelector('.hand-row');
        const stackRow = area.querySelector('.stack-row');
        if (handRow) handRow.innerHTML = '';
        if (stackRow) {
          stackRow.querySelectorAll('.stack-col').forEach((col) => {
            col.innerHTML = '';
          });
        }
      });
    }

    // 2. Render skeleton (shows slots/names, hides cards and icons)
    renderGameState(gameState, myPlayerId, null, { skeletonMode: true });

    // Hide special card icons in skeleton mode to prevent flickering
    document.querySelectorAll('.card-ability-icon').forEach((icon) => {
      (icon as HTMLElement).style.visibility = 'hidden';
    });

    // 3. Play the dealing animation
    await performOpeningDeal(gameState, myPlayerId || '');

    // 4. Render normal (shows everything and restore icon visibility)
    document.querySelectorAll('.card-ability-icon').forEach((icon) => {
      (icon as HTMLElement).style.visibility = 'visible';
    });
    renderGameState(gameState, myPlayerId);
  }

  /**
   * Returns true if we should skip the deck-to-play animation after opening deal.
   * The opening deal includes the first deck-to-pile animation in Phase D,
   * so we don't want to duplicate it on the first PILE_PICKED_UP event.
   */
  shouldSkipDeckAnimation(): boolean {
    if (this.hasPlayedOpeningDeal) {
      this.hasPlayedOpeningDeal = false; // Reset flag for future games
      return true;
    }
    return false;
  }

  /**
   * Reset state when disconnecting (e.g., dev restart, reconnection).
   * This allows the opening deal to play again in a new session.
   */
  reset(): void {
    this.hasDealtOpeningHand = false;
    this.hasPlayedOpeningDeal = false;
  }
}
