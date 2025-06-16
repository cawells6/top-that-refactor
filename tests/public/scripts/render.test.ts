// tests/public/scripts/render.test.ts
import { code } from '../../../public/scripts/render.js';

describe('render.ts', () => {
  it('returns correct code for numbered cards', () => {
    expect(code({ value: 2, suit: 'hearts' })).toBe('2H');
    expect(code({ value: 10, suit: 'spades' })).toBe('0S');
    expect(code({ value: 'A', suit: 'clubs' })).toBe('AC');
  });

  it('returns ERR for missing value or suit', () => {
    expect(code({ value: null, suit: 'hearts' })).toBe('ERR');
    expect(code({ value: 5, suit: null })).toBe('ERR');
    expect(code({ value: undefined, suit: 'spades' })).toBe('ERR');
    expect(code({ value: 7, suit: undefined })).toBe('ERR');
  });

  it('returns ERR for missing value or suit (robustness test)', () => {
    // @ts-expect-error
    expect(code({ value: null, suit: 'hearts' })).toBe('ERR');
    // @ts-expect-error
    expect(code({ value: 5, suit: null })).toBe('ERR');
    // @ts-expect-error
    expect(code({ value: undefined, suit: 'spades' })).toBe('ERR');
    // @ts-expect-error
    expect(code({ value: 7, suit: undefined })).toBe('ERR');
  });

  it('returns ERR for unknown suit', () => {
    expect(code({ value: 3, suit: 'stars' })).toBe('ERR');
  });
});
