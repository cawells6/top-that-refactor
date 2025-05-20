import { Card } from '../src/types.js';
export declare function normalizeCardValue(
  cardValue: string | number | null | undefined
): string | null | undefined;
export declare function rank(card: Card): number;
export declare function isTwoCard(cardValue: string | number | null | undefined): boolean;
export declare function isFiveCard(cardValue: string | number | null | undefined): boolean;
export declare function isTenCard(cardValue: string | number | null | undefined): boolean;
export declare function isSpecialCard(cardValue: string | number | null | undefined): boolean;
export declare function isFourOfAKind(hand: Card[]): boolean;
declare const cardUtils: {
  normalizeCardValue: typeof normalizeCardValue;
  rank: typeof rank;
  isTwoCard: typeof isTwoCard;
  isFiveCard: typeof isFiveCard;
  isTenCard: typeof isTenCard;
  isSpecialCard: typeof isSpecialCard;
  isFourOfAKind: typeof isFourOfAKind;
};
export default cardUtils;
//# sourceMappingURL=cardUtils.d.ts.map
