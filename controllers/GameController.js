// controllers/GameController.js (ESM)

import GameState from '../models/GameState.js';
import {
  isTwoCard,
  isFiveCard,
  isTenCard,
  isSpecialCard
} from '../utils/cardUtils.js';

export default class GameController {
  constructor(io) {
    console.log('typeof GameState:', typeof GameState);
    console.log('GameState content:', GameState);

    this.io = io;
    this.game = new GameState(); // Will throw if GameState fails
    this.roomId = null;
  }

  setupRoom(roomId) {
    this.roomId = roomId;
  }

  handleJoin(sock, name) {
    const { success, player, reason } = this.game.addPlayer(sock, name);
    if (!success) {
      sock.emit('err', reason);
      return;
    }
    sock.emit('joined', { id: player.id });
    this.pushState();
  }

  startGame() {
    if (this.game.players.length < 2) return;
    this.game.started = true;
    this.game.buildDeck();
    this.game.dealCards();
    this.game.turn = this.game.players[0].id;
    this.pushState();
  }

  handleDisconnect(sock) {
    this.game.markPlayerDisconnected(sock.id);
    this.pushState();
  }

  handlePlay(sock, indexes) {
    // Leave stubbed for now — add full logic once you're stable
  }

  pushState() {
    // Leave stubbed for now — add full logic once you're stable
  }
}
