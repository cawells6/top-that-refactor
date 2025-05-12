// utils/cardUtils.js - ES Module version

/**
 * Normalizes card values to consistent strings.
 * '2', 2 -> 'two'
 * '5', 5 -> 'five'
 * '10', 10 -> 'ten'
 * Other numeric strings/numbers are returned as strings.
 * Other strings are lowercased.
 * Falsy values are returned as-is.
 * @param {string | number | null | undefined} cardValue
 * @returns {string | null | undefined}
 */
export function normalizeCardValue(cardValue) {
  if (!cardValue && cardValue !== 0) {
    // Handle null and undefined explicitly for TypeScript satisfaction
    // @ts-ignore - This will be either null or undefined
    return cardValue;
  }
  const lowerVal = String(cardValue).toLowerCase();
  if (lowerVal === '2' || lowerVal === 'two') return 'two';
  if (lowerVal === '5' || lowerVal === 'five') return 'five';
  if (lowerVal === '10' || lowerVal === 'ten') return 'ten';
  return lowerVal;
}

/**
 * Returns the numeric rank of a card.
 * Special cards 'two', 'five', 'ten' have their respective numeric values.
 * Face cards J, Q, K, A are 11, 12, 13, 14.
 * Other numeric cards are parsed.
 * @param {{ value: string | number }} card
 * @returns {number}
 */
export function rank(card) {
  const val = normalizeCardValue(card.value);
  switch (val) {
    case 'two': return 2;
    case 'five': return 5;
    case 'ten': return 10;
    case 'j': case 'jack': return 11;
    case 'q': case 'queen': return 12;
    case 'k': case 'king': return 13;
    case 'a': case 'ace': return 14;
    default: return parseInt(val, 10);
  }
}

/**
 * Checks if a card is a 'Two'.
 * @param {string|number} cardValue
 * @returns {boolean}
 */
export function isTwoCard(cardValue) {
  return normalizeCardValue(cardValue) === 'two';
}

/**
 * Checks if a card is a 'Five'.
 * @param {string|number} cardValue
 * @returns {boolean}
 */
export function isFiveCard(cardValue) {
  return normalizeCardValue(cardValue) === 'five';
}

/**
 * Checks if a card is a 'Ten'.
 * @param {string|number} cardValue
 * @returns {boolean}
 */
export function isTenCard(cardValue) {
  return normalizeCardValue(cardValue) === 'ten';
}

/**
 * Checks if a card value corresponds to a special card (Two, Five, or Ten).
 * @param {string|number} cardValue
 * @returns {boolean}
 */
export function isSpecialCard(cardValue) {
  const normalized = normalizeCardValue(cardValue);
  return normalized === 'two' || normalized === 'five' || normalized === 'ten';
}

/**
 * Checks if a hand (array of cards) represents four of a kind.
 * @param {Array<{ value: string|number }>} hand
 * @returns {boolean}
 */
export function isFourOfAKind(hand) {
  if (!hand || hand.length !== 4) {
    return false;
  }
  const firstValue = normalizeCardValue(hand[0].value);
  return hand.every(card => normalizeCardValue(card.value) === firstValue);
}

// Default export with named exports
export default { normalizeCardValue, rank };
