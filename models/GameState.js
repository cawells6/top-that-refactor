// models/GameState.js

import Player from './Player.js';
import {
  isSpecialCard,
  isFourOfAKind,
  normalizeCardValue,
  rank
} from '../utils/cardUtils.js';

// Define the class WITHOUT export default here
class GameState {
  constructor() {
    this.players = [];
    this.deck = [];
    this.playPile = [];
    this.discard = [];
    this.turn = null;
    this.started = false;
    this.lastRealCard = null;
    this.MAX_PLAYERS = 4;
  }

  reset() {
    this.players = [];
    this.deck = [];
    this.playPile = [];
    this.discard = [];
    this.turn = null;
    this.started = false;
    this.lastRealCard = null;
  }

  addPlayer(sock, name = 'Player') {
    if (this.started) return { success: false, reason: 'Game already started' };
    if (this.players.length >= this.MAX_PLAYERS)
      return { success: false, reason: 'Game room is full' };

    const newPlayer = new Player(sock.id, name, false, sock);
    this.players.push(newPlayer);
    return { success: true, player: newPlayer };
  }

  addComputerPlayer() {
    if (this.started || this.players.length >= this.MAX_PLAYERS) return false;
    const count = this.players.filter(p => p.isComputer).length;
    const id = `cpu_${count + 1}`;
    const name = `CPU ${count + 1}`;
    const cpu = new Player(id, name, true);
    this.players.push(cpu);
    return true;
  }

  markPlayerDisconnected(playerId) {
    const p = this.findPlayer(playerId);
    if (p) p.markDisconnected();
  }

  findPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  activePlayers() {
    return this.players.filter(p => !p.disconnected);
  }

  buildDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const vals = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
    this.deck = [];

    const addDeck = () => suits.forEach(s => vals.forEach(v => this.deck.push({ value: v, suit: s })));
    addDeck();
    if (this.players.length >= 4) addDeck();

    this.shuffle(this.deck);
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  draw() {
    return this.deck.pop();
  }

  dealCards() {
    for (let i = 0; i < 3; i++) {
      this.players.forEach(p => p.down.push(this.draw()));
      this.players.forEach(p => p.up.push(this.draw()));
      this.players.forEach(p => p.hand.push(this.draw()));
    }
    this.players.forEach(p => p.sortHand(rank));
  }

  advanceTurn() {
    if (!this.started || this.players.length < 2) return;
    const currentIndex = this.players.findIndex(p => p.id === this.turn);
    let nextIndex = (currentIndex + 1) % this.players.length;
    let attempts = 0;
    while (this.players[nextIndex].disconnected && attempts < this.players.length) {
      nextIndex = (nextIndex + 1) % this.players.length;
      attempts++;
    }
    if (attempts >= this.players.length) {
      this.turn = null;
    } else {
      this.turn = this.players[nextIndex].id;
    }
  }

  getCurrentPlayer() {
    return this.players.find(p => p.id === this.turn);
  }

  checkWinCondition(player) {
    return (
      player.hand.length === 0 &&
      player.up.length === 0 &&
      player.down.length === 0
    );
  }

  sortHand(player) {
    player.sortHand(rank);
  }

  topCard() {
    return this.playPile.at(-1);
  }

  effectiveTop() {
    const t = this.topCard();
    if (!t) return null;
    if (normalizeCardValue(t.value) === 'five' && t.copied && this.lastRealCard) {
      return { ...this.lastRealCard, copied: true };
    }
    return t;
  }

  valid(cards) {
    if (isFourOfAKind(cards)) return true;
    if (!cards.length || !cards.every(c => c.value === cards[0].value)) return false;
    if (isSpecialCard(cards[0].value)) return true;

    const t = this.effectiveTop();
    if (!t) return true;

    const cardRank = rank(cards[0]);
    const topRank = rank(t);
    return cardRank > topRank;
  }

  refillPlayer(player) {
    player.refillHand(() => this.draw(), 3);
  }

  givePileToPlayer(player, includeDraw = true) {
    const pile = this.playPile.splice(0).map(c => {
      const clean = { ...c };
      delete clean.copied;
      return clean;
    });
    player.hand.push(...pile);
    player.sortHand(rank);
    if (includeDraw && this.deck.length > 0) {
      const top = this.draw();
      this.playPile.push(top);
      if (!isSpecialCard(top.value)) {
        this.lastRealCard = top;
      } else {
        this.lastRealCard = null;
      }
    }
  }
} // This is where the class definition ends

// >>> Add these two lines here <<<
console.log('Value being exported from GameState.js:', GameState);
console.log('Type being exported from GameState.js:', typeof GameState);
// >>> End of added lines <<<


// Correct default export - make sure this is the only default export
export default GameState;