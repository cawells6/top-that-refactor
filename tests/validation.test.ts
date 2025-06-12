import { describe, expect, test } from '@jest/globals';
import { isValidRoomId, isValidPlayerName } from '../utils/validation.js';

describe('isValidRoomId', () => {
  test('accepts 6 uppercase alphanumeric characters', () => {
    expect(isValidRoomId('ABC123')).toBe(true);
  });

  test('rejects invalid codes', () => {
    expect(isValidRoomId('abc123')).toBe(false);
    expect(isValidRoomId('AB12')).toBe(false);
    expect(isValidRoomId('ABCDEFG')).toBe(false);
  });
});

describe('isValidPlayerName', () => {
  test('accepts names between 2 and 20 chars', () => {
    expect(isValidPlayerName('Alice')).toBe(true);
  });

  test('rejects too short or long names', () => {
    expect(isValidPlayerName('A')).toBe(false);
    expect(isValidPlayerName('A'.repeat(21))).toBe(false);
  });
});
