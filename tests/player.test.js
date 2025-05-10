// tests/player.test.js

import Player from '../models/Player.js';

describe('Player model', () => {
  let p;
  beforeEach(() => {
    p = new Player('p1');
  });

  test('initial state', () => {
    expect(p.id).toBe('p1');
    expect(p.hand).toEqual([]);
    expect(p.upCards).toEqual([]);
    expect(p.downCards).toEqual([]);
  });

  test('setHand & sortHand', () => {
    const c3 = { value: '3' };
    const c2 = { value: '2' };
    const c5 = { value: '5' };
    p.setHand([c3, c5, c2]);
    expect(p.hand).toEqual([c2, c3, c5]);
  });

  test('playFromHand removes and returns the card', () => {
    const card = { value: '7' };
    p.setHand([card]);
    const played = p.playFromHand(0);
    expect(played).toBe(card);
    expect(p.hand).toEqual([]);
  });

  test('setUpCards & playUpCard', () => {
    const u = [{ value: '4' }, { value: 'J' }];
    p.setUpCards(u);
    const played = p.playUpCard(1);
    expect(played).toEqual(u[1]);
    expect(p.upCards).toEqual([u[0]]);
  });

  test('setDownCards & playDownCard', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.7);
    const d = [{ value: '8' }, { value: '9' }, { value: '10' }];
    p.setDownCards(d);
    const played = p.playDownCard();
    expect(played).toEqual(d[2]);
    expect(p.downCards).toEqual([d[0], d[1]]);
    Math.random.mockRestore();
  });

  test('pickUpPile adds and sorts', () => {
    const pile = [{ value: 'K' }, { value: '2' }];
    p.pickUpPile(pile);
    expect(p.hand[0].value).toBe('2');
    expect(p.hand[1].value).toBe('K');
  });

  test('hasEmpty... helpers', () => {
    expect(p.hasEmptyHand()).toBe(true);
    expect(p.hasEmptyUp()).toBe(true);
    expect(p.hasEmptyDown()).toBe(true);
    p.setHand([{ value: '3' }]);
    p.setUpCards([{ value: '4' }]);
    p.setDownCards([{ value: '5' }]);
    expect(p.hasEmptyHand()).toBe(false);
    expect(p.hasEmptyUp()).toBe(false);
    expect(p.hasEmptyDown()).toBe(false);
  });
});
