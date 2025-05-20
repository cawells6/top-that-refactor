import { Card as CardType } from '@srcTypes/types.js';
import GameStateType from '@models/GameState.js';
export declare function cardImg(card: CardType, selectable?: boolean, onLoad?: (img: HTMLImageElement) => void): HTMLDivElement;
/**
 * Renders the center piles (deck and discard)
 * @param {GameStateType} gameState - Current game state
 */
export declare function createCenterPiles(gameState: GameStateType): void;
/**
 * Main render function to update the entire game view
 * @param {GameStateType} gameState - Full game state
 */
export declare function renderGameState(gameState: GameStateType): void;
/**
 * Overlay special card symbol on top of discard pile card
 */
export declare function showCardEvent(cardValue: number | string, type: string): void;
//# sourceMappingURL=render.d.ts.map