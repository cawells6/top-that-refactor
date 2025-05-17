// utils/cardUtils.ts

import { Card } from '../src/types'; // Ensures we use the central Card definition

/**
 * Normalizes card values to consistent strings.
 * Examples: '2', 2 -> 'two'; 'J', 'jack' -> 'j'
 * @param cardValue The value from a card object, or a raw string/number.
 * @returns Normalized string value, or null/undefined if input was such.
 */
export function normalizeCardValue(cardValue: string | number | null | undefined): string | null | undefined {
  if (cardValue === null || cardValue === undefined) {
    return cardValue;
  }

  const lowerVal = String(cardValue).toLowerCase();

  switch (lowerVal) {
    case '2':
    case 'two':
      return 'two';
    case '5':
    case 'five':
      return 'five';
    case '10':
    case 'ten':
      return 'ten';
    case 'j':
    case 'jack':
      return 'j';
    case 'q':
    case 'queen':
      return 'q';
    case 'k':
    case 'king':
      return 'k';
    case 'a':
    case 'ace':
      return 'a';
    default:
      return lowerVal;
  }
}

/**
 * Returns the numeric rank of a card.
 * @param card The card object.
 * @returns Numeric rank.
 */
export function rank(card: Card): number {
  const val = normalizeCardValue(card.value);

  if (val === null || val === undefined) {
    console.warn(`[cardUtils] rank: Normalized card value is null/undefined for card:`, card);
    return 0;
  }

  switch (val) {
    case 'two': return 2;
    case 'five': return 5;
    case 'ten': return 10;
    case 'j': return 11;
    case 'q': return 12;
    case 'k': return 13;
    case 'a': return 14;
    default:
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) {
        console.warn(`[cardUtils] rank: Could not parse card value "${val}" to a number from card:`, card);
        return 0;
      }
      return parsed;
  }
}

export function isTwoCard(cardValue: string | number | null | undefined): boolean {
  return normalizeCardValue(cardValue) === 'two';
}

export function isFiveCard(cardValue: string | number | null | undefined): boolean {
  return normalizeCardValue(cardValue) === 'five';
}

export function isTenCard(cardValue: string | number | null | undefined): boolean {
  return normalizeCardValue(cardValue) === 'ten';
}

export function isSpecialCard(cardValue: string | number | null | undefined): boolean {
  const normalized = normalizeCardValue(cardValue);
  return normalized === 'two' || normalized === 'five' || normalized === 'ten';
}

export function isFourOfAKind(hand: Card[]): boolean {
  if (!hand || hand.length < 4) {
    return false;
  }
  const cardsToCompare = hand.slice(0, 4);
  const firstCardValue = cardsToCompare[0]?.value;
  if (firstCardValue === undefined || firstCardValue === null) {
    return false;
  }
  const normalizedFirstValue = normalizeCardValue(firstCardValue);

  if (normalizedFirstValue === null || normalizedFirstValue === undefined) {
    return false;
  }

  return cardsToCompare.every(card => {
    if (!card || card.value === undefined || card.value === null) {
      return false;
    }
    return normalizeCardValue(card.value) === normalizedFirstValue;
  });
}

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
