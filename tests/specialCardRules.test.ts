import { createMockIO } from './testUtils.js';
import GameState from '../models/GameState.js';
import Player from '../models/Player.js';
import { SPECIAL_CARD_EFFECT } from '../src/shared/events.ts';
import { handleSpecialCard } from '../utils/CardLogic.js';

const makeCard = (value: number | string, suit = 'hearts') => ({
  value,
  suit,
});

describe('Special Card Rules', () => {
  let gameState: GameState;
  let player: Player;
  let topLevelEmitMock: jest.Mock;
  let mockIo: ReturnType<typeof createMockIO>;

  beforeEach(() => {
    gameState = new GameState();
    player = new Player('PLAYER_1');
    topLevelEmitMock = jest.fn();
    mockIo = createMockIO(topLevelEmitMock);
  });

  test('2 resets the pile without clearing it', () => {
    gameState.pile = [makeCard(9, 'clubs')];

    const result = handleSpecialCard(
      mockIo as any,
      gameState,
      player,
      [makeCard(2, 'spades')],
      'room-1'
    );

    const effectCall = topLevelEmitMock.mock.calls.find(
      (call) => call[0] === SPECIAL_CARD_EFFECT
    );

    expect(result.pileClearedBySpecial).toBe(false);
    expect(gameState.pile.length).toBe(1);
    expect(effectCall?.[1]).toEqual(expect.objectContaining({ type: 'two' }));
  });

  test('5 copies the last real card onto the pile', () => {
    const lastRealCard = makeCard(2, 'diamonds');
    gameState.pile = [makeCard(7, 'hearts'), makeCard(5, 'clubs')];
    gameState.lastRealCard = lastRealCard as any;

    const result = handleSpecialCard(
      mockIo as any,
      gameState,
      player,
      [makeCard(5, 'clubs')],
      'room-1'
    );

    const effectTypes = topLevelEmitMock.mock.calls
      .filter((call) => call[0] === SPECIAL_CARD_EFFECT)
      .map((call) => call[1]?.type);
    const copiedCard = gameState.pile[gameState.pile.length - 1];

    expect(result.pileClearedBySpecial).toBe(false);
    expect(gameState.pile.length).toBe(3);
    expect(copiedCard).toEqual(
      expect.objectContaining({ value: lastRealCard.value, copied: true })
    );
    expect(effectTypes).toEqual(expect.arrayContaining(['five', 'two']));
  });

  test('5 copies a 10 and burns the pile', () => {
    gameState.pile = [makeCard(6, 'hearts'), makeCard(5, 'clubs')];
    gameState.lastRealCard = makeCard(10, 'spades') as any;

    const result = handleSpecialCard(
      mockIo as any,
      gameState,
      player,
      [makeCard(5, 'clubs')],
      'room-1'
    );

    const effectTypes = topLevelEmitMock.mock.calls
      .filter((call) => call[0] === SPECIAL_CARD_EFFECT)
      .map((call) => call[1]?.type);

    expect(result.pileClearedBySpecial).toBe(true);
    expect(gameState.pile.length).toBe(0);
    expect(gameState.discard.length).toBe(0);
    expect(effectTypes).toEqual(expect.arrayContaining(['five', 'ten']));
  });

  test('10 burns the pile and removes it from the game', () => {
    gameState.pile = [makeCard(6, 'hearts'), makeCard('Q', 'spades')];
    gameState.lastRealCard = makeCard(4, 'clubs') as any;

    const result = handleSpecialCard(
      mockIo as any,
      gameState,
      player,
      [makeCard(10, 'clubs')],
      'room-1'
    );

    const effectCall = topLevelEmitMock.mock.calls.find(
      (call) => call[0] === SPECIAL_CARD_EFFECT
    );

    expect(result.pileClearedBySpecial).toBe(true);
    expect(gameState.pile.length).toBe(0);
    expect(gameState.discard.length).toBe(0);
    expect(effectCall?.[1]).toEqual(expect.objectContaining({ type: 'ten' }));
    expect(gameState.lastRealCard).toBeNull();
  });

  test('four of a kind burns even when lower than the pile', () => {
    const fourOfKind = [
      makeCard(3, 'hearts'),
      makeCard(3, 'clubs'),
      makeCard(3, 'diamonds'),
      makeCard(3, 'spades'),
    ];
    gameState.pile = [makeCard('K', 'hearts'), ...fourOfKind];

    const result = handleSpecialCard(
      mockIo as any,
      gameState,
      player,
      fourOfKind,
      'room-1',
      { fourOfKindPlayed: true }
    );

    const effectCall = topLevelEmitMock.mock.calls.find(
      (call) => call[0] === SPECIAL_CARD_EFFECT
    );

    expect(result.pileClearedBySpecial).toBe(true);
    expect(gameState.pile.length).toBe(0);
    expect(gameState.discard.length).toBe(0);
    expect(effectCall?.[1]).toEqual(expect.objectContaining({ type: 'four' }));
  });
});
