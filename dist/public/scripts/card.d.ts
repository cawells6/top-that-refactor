import { Card } from '@srcTypes/types.js';
/**
 * Creates a card element with appropriate styling and behavior
 * @param {Card} card - Card data (value, suit, or {back: true})
 * @param {boolean} selectable - Whether the card can be selected
 * @param {(card: Card, selected: boolean) => void | null} onSelect - Optional callback when card is selected
 * @returns {HTMLDivElement} The card container element
 */
export declare function createCardElement(card: Card, selectable?: boolean, onSelect?: ((card: Card, selected: boolean) => void) | null): HTMLDivElement;
/**
 * Formats card value for file naming
 * @param {string | number} value - Card value (e.g., 2, 10, J, Q, K, A)
 * @returns {string} Formatted card value
 */
export declare function formatCardValue(value: string | number): string;
//# sourceMappingURL=card.d.ts.map