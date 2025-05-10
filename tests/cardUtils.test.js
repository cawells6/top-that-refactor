// tests/cardUtils.test.js

const {
  normalizeCardValue,
  rank,
  isTwoCard,
  isFiveCard,
  isTenCard,
  isSpecialCard,
  isFourOfAKind
} = require('../utils/cardUtils');

describe('cardUtils', () => {
  describe('normalizeCardValue', () => {
    it('maps 2 variants to "two"', () => {
      expect(normalizeCardValue(2)).toBe('two');
      expect(normalizeCardValue('2')).toBe('two');
      expect(normalizeCardValue('two')).toBe('two');
    });
    it('maps 5 variants to "five"', () => {
      expect(normalizeCardValue(5)).toBe('five');
      expect(normalizeCardValue('Five')).toBe('five');
    });
    it('maps 10 variants to "ten"', () => {
      expect(normalizeCardValue(10)).toBe('ten');
      expect(normalizeCardValue('TEN')).toBe('ten');
    });
    it('lowercases other strings', () => {
      expect(normalizeCardValue('Jack')).toBe('jack');
      expect(normalizeCardValue('Q')).toBe('q');
    });
    it('returns falsy as-is', () => {
      expect(normalizeCardValue(null)).toBeNull();
      expect(normalizeCardValue(undefined)).toBeUndefined();
    });
  });

  describe('rank', () => {
    it('returns numeric rank for special cards', () => {
      expect(rank({ value: 'two' })).toBe(2);
      expect(rank({ value: 5 })).toBe(5);
      expect(rank({ value: 'TEN' })).toBe(10);
    });
    it('returns face-card ranks', () => {
      expect(rank({ value: 'J' })).toBe(11);
      expect(rank({ value: 'q' })).toBe(12);
      expect(rank({ value: 'K' })).toBe(13);
      expect(rank({ value: 'a' })).toBe(14);
    });
    it('parses numeric strings', () => {
      expect(rank({ value: '3' })).toBe(3);
      expect(rank({ value: 7 })).toBe(7);
    });
  });

  describe('isTwoCard/isFiveCard/isTenCard', () => {
    it('correctly identifies each special card type', () => {
      expect(isTwoCard('2')).toBe(true);
      expect(isFiveCard(5)).toBe(true);
      expect(isTenCard('Ten')).toBe(true);
      expect(isTwoCard('five')).toBe(false);
    });
  });

  describe('isSpecialCard', () => {
    it('is true for any special card', () => {
      ['2','5','10','two','five','TEN'].forEach(v => {
        expect(isSpecialCard(v)).toBe(true);
      });
      expect(isSpecialCard('3')).toBe(false);
    });
  });

  describe('isFourOfAKind', () => {
    it('returns true for 4 of the same value', () => {
      const hand = [
        { value: 'Q' },
        { value: 'q' },
        { value: 'Q' },
        { value: 'Q' }
      ];
      expect(isFourOfAKind(hand)).toBe(true);
    });
    it('returns false for mixed values or wrong length', () => {
      expect(isFourOfAKind([{ value: '5' }, { value: '5' }, { value: '5' }])).toBe(false);
      expect(isFourOfAKind([{ value: '5' },{ value: '5' },{ value: 'two' },{ value: '5' }])).toBe(false);
    });
  });
});
