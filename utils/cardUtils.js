// utils/cardUtils.js

function normalizeCardValue(value) {
  if (!value) return value;
  const str = value.toString().toLowerCase();
  if (str === '2') return 'two';
  if (str === '5') return 'five';
  if (str === '10') return 'ten';
  return str;
}

function rank(card) {
  const v = normalizeCardValue(card.value).toUpperCase();
  if (v === 'TWO') return 2;
  if (v === 'FIVE') return 5;
  if (v === 'TEN') return 10;
  return { 'J': 11, 'Q': 12, 'K': 13, 'A': 14 }[v] ?? parseInt(v);
}

function isTwoCard(value) {
  return normalizeCardValue(value) === 'two';
}

function isFiveCard(value) {
  return normalizeCardValue(value) === 'five';
}

function isTenCard(value) {
  return normalizeCardValue(value) === 'ten';
}

function isSpecialCard(value) {
  return isTwoCard(value) || isFiveCard(value) || isTenCard(value);
}

function isFourOfAKind(cards) {
  if (cards.length !== 4) return false;
  const firstVal = normalizeCardValue(cards[0].value);
  return cards.every(c => normalizeCardValue(c.value) === firstVal);
}

module.exports = {
  normalizeCardValue,
  rank,
  isTwoCard,
  isFiveCard,
  isTenCard,
  isSpecialCard,
  isFourOfAKind
};
