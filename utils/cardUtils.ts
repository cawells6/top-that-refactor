// utils/cardUtils.ts

import { Card } from '../src/types'; // Ensures we use the central Card definition

/**
 * Normalizes card values to consistent strings.
 * Examples: '2', 2 -> 'two'; 'J', 'jack', 'King', 'K' -> 'j', 'k' etc.
 * @param cardValue The value from a card object, or a raw string/number.
 * @returns Normalized string value, or null/undefined if input was such.
 */
export function normalizeCardValue(cardValue: string | number | null | undefined): string | null | undefined {
  if (cardValue === null || cardValue === undefined) {
    return cardValue;
  }

  const lowerVal = String(cardValue).toLowerCase();

  switch (lowerVal) {
    case '2': case 'two': return 'two';
    case '5': case 'five': return 'five';
    case '10': case 'ten': return 'ten';
    case 'j': case 'jack': return 'j';     // Normalize to single letter
    case 'q': case 'queen': return 'q';   // Normalize to single letter
    case 'k': case 'king': return 'k';     // Normalize to single letter
    case 'a': case 'ace': return 'a';       // Normalize to single letter
    default:
      // For numeric strings like "3", "4" or other unmapped strings
      return lowerVal;
  }
}

/**
 * Returns the numeric rank of a card.
 * @param card The card object.
 * @returns Numeric rank.
 */
export function rank(card: Card): number {
  const val = normalizeCardValue(card.value); // val is string | null | undefined

  if (val === null || val === undefined) {
    // console.warn for debugging if needed:
    // console.warn(`[cardUtils] rank: Normalized card value is null/undefined for card:`, card);
    return 0; // Default rank for unrankable cards
  }

  // Now, val is definitely a string because normalizeCardValue (with the switch)
  // will return a string if the input wasn't null/undefined.
  switch (val) {
    case 'two': return 2;
    case 'five': return 5;
    case 'ten': return 10;
    case 'j': return 11; // Now only needs to check for 'j' due to normalization
    case 'q': return 12; // Now only needs to check for 'q'
    case 'k': return 13; // Now only needs to check for 'k'
    case 'a': return 14; // Now only needs to check for 'a'
    default:
      // For numeric cards like "3", "4", "6", "7", "8", "9"
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) {
        // console.warn for debugging if needed:
        // console.warn(`[cardUtils] rank: Could not parse card value "${val}" to a number from card:`, card);
        return 0; // Default rank for unknown/unparseable cards
      }
      return parsed;
  }
}

/**
 * Checks if a card's normalized value is 'two'.
 * @param cardValue The value from a card or a raw value.
 * @returns True if it's a Two.
 */
export function isTwoCard(cardValue: string | number | null | undefined): boolean {
  return normalizeCardValue(cardValue) === 'two';
}

/**
 * Checks if a card's normalized value is 'five'.
 * @param cardValue The value from a card or a raw value.
 * @returns True if it's a Five.
 */
export function isFiveCard(cardValue: string | number | null | undefined): boolean {
  return normalizeCardValue(cardValue) === 'five';
}

/**
 * Checks if a card's normalized value is 'ten'.
 * @param cardValue The value from a card or a raw value.
 * @returns True if it's a Ten.
 */
export function isTenCard(cardValue: string | number | null | undefined): boolean {
  return normalizeCardValue(cardValue) === 'ten';
}

/**
 * Checks if a card value corresponds to any special card (Two, Five, or Ten).
 * @param cardValue The value from a card or a raw value.
 * @returns True if it's any of the special cards.
 */
export function isSpecialCard(cardValue: string | number | null | undefined): boolean {
  const normalized = normalizeCardValue(cardValue);
  return normalized === 'two' || normalized === 'five' || normalized === 'ten';
}

/**
 * Checks if a hand (array of cards) represents four of a kind based on normalized values.
 * Assumes "four of a kind" means the first four cards if more are provided,
 * or exactly four cards in the hand.
 * @param hand An array of Card objects.
 * @returns True if it's four of a kind.
 */
export function isFourOfAKind(hand: Card[]): boolean {
  if (!hand || hand.length < 4) {
    return false;
  }
  // Consider the first 4 cards for the check
  const cardsToCompare = hand.slice(0, 4);
  // This check is redundant if hand.length < 4 is already handled, but safe.
  if (cardsToCompare.length < 4) return false;

  const firstCardValue = cardsToCompare[0]?.value;
  // Check if firstCardValue is actually present and not null/undefined
  if (firstCardValue === undefined || firstCardValue === null) {
    return false;
  }
  const normalizedFirstValue = normalizeCardValue(firstCardValue);

  // Check if normalization resulted in null/undefined (e.g., if input was bad)
  if (normalizedFirstValue === null || normalizedFirstValue === undefined) {
      return false;
  }

  return cardsToCompare.every(card => {
    // Ensure each card and its value are valid before normalizing
    if (!card || card.value === undefined || card.value === null) {
        return false;
    }
    return normalizeCardValue(card.value) === normalizedFirstValue;
  });
}

// Maintaining the default export pattern as in the original JS file.
// For pure TypeScript projects, often only named exports are preferred (remove default).
const cardUtils = {
  normalizeCardValue,
  rank,
  isTwoCard,
  isFiveCard,
  isTenCard,
  isSpecialCard,
  isFourOfAKind
};
export default cardUtils;