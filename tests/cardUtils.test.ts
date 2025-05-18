// tests/cardUtils.test.ts

import {
  normalizeCardValue,
  rank,
  isTwoCard,
  isFiveCard,
  isTenCard,
  isSpecialCard,
  isFourOfAKind,
} from '../utils/cardUtils'; // *** CORRECTED: No .js extension ***
import { Card } from '../src/types'; // Import the Card type

describe('normalizeCardValue', () => {
  test('normalizes string numbers to keywords where applicable', () => {
    expect(normalizeCardValue('2')).toBe('two');
    expect(normalizeCardValue('5')).toBe('five');
    expect(normalizeCardValue('10')).toBe('ten');
    expect(normalizeCardValue('3')).toBe('3'); // Stays as "3"
  });

  test('normalizes actual numbers to keywords or stringified numbers', () => {
    expect(normalizeCardValue(2)).toBe('two');
    expect(normalizeCardValue(5)).toBe('five');
    expect(normalizeCardValue(10)).toBe('ten');
    expect(normalizeCardValue(7)).toBe('7'); // Number 7 becomes string "7"
  });

  test('normalizes mixed case face cards to single lowercase letter', () => {
    expect(normalizeCardValue('J')).toBe('j');
    expect(normalizeCardValue('q')).toBe('q'); // Assuming 'q' from input
    expect(normalizeCardValue('King')).toBe('k'); // EXPECTS 'k'
    expect(normalizeCardValue('ACE')).toBe('a'); // EXPECTS 'a'
    expect(normalizeCardValue('jack')).toBe('j'); // Full name to single letter
    expect(normalizeCardValue('queen')).toBe('q'); // Full name to single letter
    expect(normalizeCardValue('king')).toBe('k'); // Full name to single letter
    expect(normalizeCardValue('ace')).toBe('a'); // Full name to single letter
  });

  test('handles null and undefined', () => {
    expect(normalizeCardValue(null)).toBeNull();
    expect(normalizeCardValue(undefined)).toBeUndefined();
  });

  test('handles empty string', () => {
    // Based on the utils/cardUtils.ts normalizeCardValue, empty string returns itself
    expect(normalizeCardValue('')).toBe('');
  });
});

describe('rank', () => {
  const createCard = (value: string | number, suit: string = 'hearts'): Card => {
    return { value, suit };
  };

  test('correctly ranks numeric cards', () => {
    expect(rank(createCard('3'))).toBe(3);
    expect(rank(createCard(8, 'spades'))).toBe(8);
  });

  test('correctly ranks special cards', () => {
    expect(rank(createCard('2'))).toBe(2);
    expect(rank(createCard('5', 'diamonds'))).toBe(5);
    expect(rank(createCard('10', 'clubs'))).toBe(10);
  });

  test('correctly ranks face cards (after normalization to single letter)', () => {
    expect(rank(createCard('J'))).toBe(11); // normalize('J') -> 'j', rank('j') -> 11
    expect(rank(createCard('Queen'))).toBe(12); // normalize('Queen') -> 'q', rank('q') -> 12
    expect(rank(createCard('king', 'clubs'))).toBe(13); // normalize('king') -> 'k', rank('k') -> 13
    expect(rank(createCard('ACE', 'spades'))).toBe(14); // normalize('ACE') -> 'a', rank('a') -> 14
  });

  test('rank returns 0 for unrankable or invalid card values', () => {
    // Test with values that normalizeCardValue would return as null, undefined, or unparseable strings
    expect(rank(createCard(null as any))).toBe(0);
    expect(rank(createCard(undefined as any))).toBe(0);
    expect(rank(createCard('xyz'))).toBe(0); // normalizeCardValue('xyz') -> 'xyz', rank('xyz') -> 0
    expect(rank({ value: {}, suit: 'hearts' } as any)).toBe(0); // normalizeCardValue({}) -> '[object object]', rank -> 0
  });
});

describe('isSpecialCard type checks', () => {
  test('isTwoCard', () => {
    expect(isTwoCard('2')).toBe(true);
    expect(isTwoCard(2)).toBe(true);
    expect(isTwoCard('two')).toBe(true);
    expect(isTwoCard('3')).toBe(false);
    expect(isTwoCard(null)).toBe(false);
  });
  test('isFiveCard', () => {
    expect(isFiveCard('5')).toBe(true);
    expect(isFiveCard(5)).toBe(true);
    expect(isFiveCard('five')).toBe(true);
    expect(isFiveCard('6')).toBe(false);
    expect(isFiveCard(undefined)).toBe(false);
  });
  test('isTenCard', () => {
    expect(isTenCard('10')).toBe(true);
    expect(isTenCard(10)).toBe(true);
    expect(isTenCard('ten')).toBe(true);
    expect(isTenCard('J')).toBe(false); // 'J' normalizes to 'j', not 'ten'
  });
  test('isSpecialCard', () => {
    expect(isSpecialCard('2')).toBe(true);
    expect(isSpecialCard(5)).toBe(true);
    expect(isSpecialCard('ten')).toBe(true);
    expect(isSpecialCard('ace')).toBe(false); // 'ace' normalizes to 'a'
    expect(isSpecialCard('king')).toBe(false); // 'king' normalizes to 'k'
  });
});

describe('isFourOfAKind', () => {
  const createHand = (
    values: (string | number | null | undefined)[],
    suitPrefix: string = 's'
  ): Card[] => {
    // Filter out null/undefined for values to ensure card.value is string|number
    // or ensure that your Card type allows value to be null/undefined if that's valid
    return values.map((value, index) => ({
      value: value as string | number, // Cast needed if null/undefined are possible in input array for test
      suit: `${suitPrefix}${index}`,
    }));
  };

  test('returns true for four of a kind (numeric, normalized to same string)', () => {
    const hand: Card[] = [
      { value: '7', suit: 'hearts' },
      { value: 7, suit: 'diamonds' }, // normalize(7) -> "7"
      { value: '7', suit: 'clubs' },
      { value: '7', suit: 'spades' },
    ];
    expect(isFourOfAKind(hand)).toBe(true);
  });

  test('returns true for face cards that normalize IDENTICALLY (e.g., all to "k")', () => {
    // Assuming normalizeCardValue turns 'K', 'King', 'k', 'KING' all into 'k'
    expect(isFourOfAKind(createHand(['K', 'king', 'k', 'KING']))).toBe(true);
    expect(isFourOfAKind(createHand(['A', 'ace', 'a', 'ACE']))).toBe(true);
  });

  // This test confirms the above: if they all normalize to the same, it's four of a kind.
  // The previous "returns false for face cards that normalize DIFFERENTLY" was based on an
  // older understanding of normalizeCardValue. If 'K' and 'king' BOTH become 'k',
  // then a hand of ['K', 'king', 'K', 'king'] IS four of a kind.
  // The previous failure `Expected: false, Received: true` confirms this.
  // So the test logic `expect(isFourOfAKind(mixedKings)).toBe(false);` was correct to be false,
  // if your normalizeCardValue was actually returning different things for K vs king.
  // If normalizeCardValue has been updated so 'K' and 'king' both return 'k',
  // then `isFourOfAKind(['K', 'king', 'K', 'king'])` should be true.
  // The test `returns true for face cards that normalize IDENTICALLY` now covers this.

  test('returns false for less than 4 cards', () => {
    const hand: Card[] = createHand(['A', 'A', 'A']);
    expect(isFourOfAKind(hand)).toBe(false);
  });

  test('returns false for not four of a kind', () => {
    // These will normalize to 'a', 'k', 'q', 'j' respectively
    const hand: Card[] = createHand(['ACE', 'King', 'Queen', 'Jack']);
    expect(isFourOfAKind(hand)).toBe(false);
  });

  test('returns false for an empty hand', () => {
    expect(isFourOfAKind([])).toBe(false);
  });

  test('returns false if any card value results in null/undefined after normalization', () => {
    // Create a hand where one card's value will normalize to null or undefined
    const handWithInvalidValueForNorm: Card[] = [
      { value: null as any, suit: 's1' }, // normalizeCardValue(null) -> null
      { value: 'K', suit: 's2' },
      { value: 'K', suit: 's3' },
      { value: 'K', suit: 's4' },
    ];
    expect(isFourOfAKind(handWithInvalidValueForNorm)).toBe(false);

    const handWithOtherInvalid: Card[] = [
      { value: 'K', suit: 's1' },
      { value: undefined as any, suit: 's2' }, // normalizeCardValue(undefined) -> undefined
      { value: 'K', suit: 's3' },
      { value: 'K', suit: 's4' },
    ];
    expect(isFourOfAKind(handWithOtherInvalid)).toBe(false);
  });

  test('isFourOfAKind works for non-keyword numbers that normalize to same string', () => {
    const handThrees: Card[] = createHand([3, '3', 3, '3']); // All normalize to "3"
    expect(isFourOfAKind(handThrees)).toBe(true);
  });

  test('isFourOfAKind for specific keywords like "two"', () => {
    const handTwos: Card[] = createHand(['2', 2, 'two', '2']); // All normalize to "two"
    expect(isFourOfAKind(handTwos)).toBe(true);
  });
});
