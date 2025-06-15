// utils/cardUtils.ts
import { Card } from '@srcTypes/types';

export function normalizeCardValue(
  cardValue: string | number | null | undefined
): string | null | undefined {
  if (cardValue === null || cardValue === undefined) {
    return cardValue;
  }
  if (typeof cardValue === 'bigint') {
    return null;
  }
  let strVal = String(cardValue);
  strVal = strVal.trim();
  const lowerVal = strVal.toLowerCase();
  switch (lowerVal) {
    case '2':
    case 'two':
      return 'two';
    case '3':
    case 'three':
      return 'three';
    case '4':
    case 'four':
      return 'four';
    case '5':
    case 'five':
      return 'five';
    case '6':
    case 'six':
      return 'six';
    case '7':
    case 'seven':
      return 'seven';
    case '8':
    case 'eight':
      return 'eight';
    case '9':
    case 'nine':
      return 'nine';
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

export function rank(card: Card): number {
  const val = normalizeCardValue(card.value);
  if (val === null || val === undefined) {
    return 0;
  }
  switch (val) {
    case 'two':
      return 2;
    case 'three':
      return 3;
    case 'four':
      return 4;
    case 'five':
      return 5;
    case 'six':
      return 6;
    case 'seven':
      return 7;
    case 'eight':
      return 8;
    case 'nine':
      return 9;
    case 'ten':
      return 10;
    case 'j':
      return 11;
    case 'q':
      return 12;
    case 'k':
      return 13;
    case 'a':
      return 14;
    default: {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) {
        return 0;
      }
      return parsed;
    }
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
  if (cardsToCompare.length < 4) return false;

  const firstCardValue = cardsToCompare[0]?.value;
  if (firstCardValue === undefined || firstCardValue === null) {
    return false;
  }
  const normalizedFirstValue = normalizeCardValue(firstCardValue);

  if (normalizedFirstValue === null || normalizedFirstValue === undefined) {
    return false;
  }

  return cardsToCompare.every((card) => {
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
  isFourOfAKind,
};
export default cardUtils;
