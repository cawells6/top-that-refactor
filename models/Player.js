// models/Player.js

export default class Player {
  constructor(id, name, isComputer = false, sock = null) {
    this.id = id;
    this.name = name;
    this.hand = [];
    this.up = [];
    this.down = [];
    this.isComputer = isComputer;
    this.disconnected = false;
    this.sock = sock;
  }

  markDisconnected() {
    this.disconnected = true;
    this.sock = null;
  }

  drawCard(card) {
    if (card) this.hand.push(card);
  }

  refillHand(drawFn, maxHandSize = 3) {
    while (this.hand.length < maxHandSize) {
      const card = drawFn();
      if (!card) break;
      this.hand.push(card);
    }
    this.sortHand();
  }

  sortHand(rankFn) {
    if (!rankFn) return;
    this.hand.sort((a, b) => rankFn(a) - rankFn(b));
  }

  hasPlayableCard(validFn) {
    return (
      this.hand.some(card => validFn([card])) ||
      this.up.some(card => validFn([card])) ||
      this.down.length > 0
    );
  }

  removeFromHand(indexes) {
    this.hand = this.hand.filter((_, i) => !indexes.includes(i));
  }

  removeFromUp(indexes) {
    this.up = this.up.filter((_, i) => !indexes.includes(i));
  }

  removeFromDown() {
    return this.down.shift();
  }
}
