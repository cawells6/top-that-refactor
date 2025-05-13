// controllers/GameController.js

/**
 * GAME CONTROLLER
 * - Isolate game logic from Socket.IO networking.
 * - Normalize all card values via cardUtils.normalizeCardValue().
 * - Emit 'card-played' → optionally emit 'special-card' for ['two','five','ten'].
 * - Next turn only starts after client emits 'start-next-turn'.
 */
import GameState from '../models/GameState.js';
import Player from '../models/Player.js';
import { normalizeCardValue, isSpecialCard, rank } from '../utils/cardUtils.js';
import {
  JOIN_GAME,
  JOINED,
  PLAYER_JOINED,
  LOBBY,
  STATE_UPDATE,
  SPECIAL_CARD,
  REJOIN,
  START_GAME,
  NEXT_TURN
} from '../src/shared/events.js';
import { v4 as uuidv4 } from 'uuid';

export default class GameController {
  /**
   * @param {import('socket.io').Server} io
   */
  constructor(io) {
    this.io = io;
    this.games = new Map(); // Map<roomId, { state: GameState, players: Map<id,Player> }>
    // Wire up per-socket listeners
    this.io.on('connection', socket => this.setupListeners(socket));
  }

  /**
   * Register socket event handlers
   * @param {import('socket.io').Socket} socket
   */
  setupListeners(socket) {
    socket.on('join', (name, totalPlayers = 2, numComputers = 0, roomParam = '') => {
      totalPlayers = Math.min(Math.max(parseInt(totalPlayers, 10) || 2, 2), 4);
      numComputers = Math.min(Math.max(parseInt(numComputers, 10) || 0, 0), totalPlayers - 1);
      const roomId = roomParam && this.games.has(roomParam)
        ? roomParam
        : uuidv4().slice(0, 6).toUpperCase();
      if (!this.games.has(roomId)) {
        const state = new GameState();
        state.maxPlayers = totalPlayers;
        state.playerOrder = [];
        state.playersCount = 0;
        this.games.set(roomId, {
          state,
          players: new Map()
        });
      }
      const { state, players } = this.games.get(roomId);
      socket.join(roomId);
      // Create player object and store
      const p = new Player(socket.id, name);
      p.isComputer = false;
      players.set(socket.id, p);
      // Add to player order if not present
      if (!state.playerOrder) state.playerOrder = [];
      if (!state.playerOrder.includes(socket.id)) state.playerOrder.push(socket.id);
      state.playersCount = state.playerOrder.length;
      // Add computers if requested
      for (let i = 0; i < numComputers; i++) {
        const cpuId = `CPU_${Math.random().toString(36).slice(2, 5)}`;
        if (!players.has(cpuId)) {
          const cpu = new Player(cpuId, `CPU ${i + 1}`);
          cpu.isComputer = true;
          players.set(cpuId, cpu);
          if (!state.playerOrder.includes(cpuId)) state.playerOrder.push(cpuId);
        }
      }
      state.playersCount = state.playerOrder.length;
      this._emitLobby(roomId);
    });

    socket.on(START_GAME, (opts) => {
      const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
      if (roomId) this.handleStartGame(roomId, opts || {});
    });

    socket.on('play-card', data => {
      const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
      if (roomId) this.handlePlay(roomId, socket, data);
    });

    socket.on(NEXT_TURN, () => {
      const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
      if (roomId) this.handleNextTurn(roomId);
    });

    socket.on('takePile', () => {
      const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
      if (roomId) this.handleTakePile(roomId, socket.id);
    });

    socket.on(REJOIN, ({ playerId, roomId }) => {
      if (!this.games.has(roomId)) {
        socket.emit('err', 'Invalid room for rejoin');
        return;
      }
      const { players } = this.games.get(roomId);
      if (!players.has(playerId)) {
        socket.emit('err', 'Invalid player for rejoin');
        return;
      }
      const player = players.get(playerId);
      if (player && player.disconnected) {
        player.disconnected = false;
        player.sock = socket;
        socket.join(roomId);
        socket.emit(JOINED, { id: playerId, roomId });
        this.pushState(roomId);
        this.io.to(roomId).emit(PLAYER_JOINED, [...players.values()].map(pl => pl.name));
      } else {
        socket.emit('err', 'Rejoin failed');
      }
    });

    socket.on('disconnect', () => {
      const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
      if (!this.games.has(roomId)) return;
      const { players } = this.games.get(roomId);
      const playerId = socket.id;
      const player = players.get(playerId);
      if (player) {
        player.disconnected = true;
        this.io.to(roomId).emit(PLAYER_JOINED, [...players.values()].map(pl => ({ id: pl.id, disconnected: pl.disconnected })));
      }
    });
  }

  _emitLobby(roomId) {
    const { state, players } = this.games.get(roomId);
    const list = Array.from(players.values()).map(pl => ({
      id: pl.id, name: pl.name, isComputer: pl.isComputer
    }));
    this.io.to(roomId).emit('lobby', {
      roomId,
      players: list,
      maxPlayers: state.maxPlayers
    });
  }

  /** Initialize deck, deal cards, assign them to players, and emit first turn */
  handleStartGame(roomId, opts = {}) {
    const game = this.games.get(roomId);
    const { state, players } = game;
    const computerCount = opts.computerCount || 0;
    if (players.size + computerCount < 2) {
      console.error('Cannot start game: need at least 2 players.');
      return;
    }
    for (let i = 0; i < computerCount; i++) {
      const id = `COMPUTER_${i+1}`;
      if (!players.has(id)) {
        state.addPlayer(id);
        players.set(id, new Player(id));
      }
    }
    state.buildDeck();
    const numPlayers = state.players.length;
    const { hands, upCards, downCards } = state.dealCards(numPlayers);
    state.players.forEach((id, idx) => {
      const player = players.get(id);
      player.setHand(hands[idx]);
      player.setUpCards(upCards[idx]);
      player.setDownCards(downCards[idx]);
    });
    this.pushState(roomId);
    const first = state.players[0];
    this.io.to(roomId).emit(NEXT_TURN, first);
  }

  /**
   * Player plays a card from hand/up/down
   * @param {string} roomId
   * @param {import('socket.io').Socket|null} socket
   * @param {{playerId:string,cardIndex:number,zone:'hand'|'up'|'down'}} data
   */
  handlePlay(roomId, socket, { playerId, cardIndex, zone }) {
    const game = this.games.get(roomId);
    if (!game) return;
    const { state, players } = game;
    const player = players.get(playerId);
    if (!player || playerId !== state.playerOrder[state.currentPlayerIndex]) {
      return; // invalid player or not player's turn
    }
    // Determine card without removing yet
    let card;
    if (zone === 'hand') card = player.hand[cardIndex];
    else if (zone === 'up') card = player.upCards[cardIndex];
    else if (zone === 'down') card = player.downCards[0];
    if (!card) return; // no card found
    // Validate move
    if (!state.isValidPlay(card)) {
      if (zone === 'down') {
        // face-down invalid: player picks up pile
        player.hand.push(player.downCards.shift()); // move the down card to hand
        player.sortHand();
        this.io.to(roomId).emit('special-card', 'invalid');
        this.handleTakePile(roomId, playerId);
      } else {
        // hand/up invalid: restore card if needed
        if (socket) socket.emit('err', 'Invalid play: card must be higher than top card');
      }
      return;
    }
    // Remove the card from player's hand/up/down now that it's confirmed valid
    if (zone === 'hand') card = player.playFromHand(cardIndex);
    else if (zone === 'up') card = player.playUpCard(cardIndex);
    else if (zone === 'down') card = player.playDownCard();
    // broadcast
    const normVal = normalizeCardValue(card.value);
    state.addToPile({ ...card, value: normVal });
    this.io.to(roomId).emit('card-played', { playerId, card: { ...card, value: normVal } });
    // special card handling
    if (normVal === 'ten' || state.checkFourOfKind()) {
      this.io.to(roomId).emit('special-card', 'burn');
      state.clearPile();
      this.handleNextTurn(roomId);
      return;
    }
    if (normVal === 'five') {
      this.io.to(roomId).emit('special-card', 'copy');
      const lastReal = state.getLastRealCard();
      if (lastReal) {
        state.addToPile({ ...lastReal });
      }
    }
    if (normVal === 'two') {
      this.io.to(roomId).emit('special-card', 'reset');
      // Optionally set a reset flag if needed
    }
    // End turn after any single card play
    this.handleNextTurn(roomId);
  }

  async handleNextTurn(roomId) {
    const game = this.games.get(roomId);
    const { state, players } = game;
    const prevIdx = (state.currentPlayerIndex + state.playersCount - 1) % state.playersCount;
    const prevId = state.playerOrder[prevIdx];
    const prev = players.get(prevId);
    while (prev.hand.length < 3 && state.deck.length > 0) {
      prev.hand.push(state.deck.pop());
    }
    if (
      prev.hand.length === 0 &&
      prev.upCards.length === 0 &&
      prev.downCards.length === 0
    ) {
      this.io.to(roomId).emit('gameOver', { winnerId: prev.id, winnerName: prev.name });
      return;
    }
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.playersCount;
    const nextId = state.playerOrder[state.currentPlayerIndex];
    this.io.to(roomId).emit('nextTurn', nextId);
    this.pushState(roomId);
    const next = players.get(nextId);
    if (next.isComputer) {
      setTimeout(() => this._doCpuTurn(roomId, nextId), 700);
    }
  }

  _doCpuTurn(roomId, cpuId) {
    const game = this.games.get(roomId);
    const { state, players } = game;
    const cpu = players.get(cpuId);
    // valid hand indexes
    const valid = cpu.hand
      .map((c, i) => ({ card: c, idx: i }))
      .filter(ci => state.isValidPlay(ci.card));
    if (valid.length > 0) {
      // play lowest-value valid
      valid.sort((a, b) => rank(a.card.value) - rank(b.card.value));
      const choice = valid[0].idx;
      this.handlePlay(roomId, null, { playerId: cpuId, cardIndex: choice, zone: 'hand' });
    } else {
      this.handleTakePile(roomId, cpuId);
    }
  }

  handleTakePile(roomId, playerId) {
    const game = this.games.get(roomId);
    const { state, players } = game;
    const pl = players.get(playerId);
    pl.hand.push(...state.pile);
    state.pile = [];
    pl.hand.sort((a, b) => rank(a.value) - rank(b.value));
    this.io.to(roomId).emit('special-card', 'take');
    this.pushState(roomId);
    this.handleNextTurn(roomId);
  }

  /** Broadcast full game state to all clients */
  pushState(roomId) {
    const game = this.games.get(roomId);
    const { state, players } = game;
    const currentPlayerId = state.players[state.currentPlayerIndex];
    const stateData = {
      players: state.players.map(id => {
        const player = players.get(id);
        if (id === currentPlayerId) {
          return {
            id,
            hand: player.hand,
            upCards: player.upCards,
            downCards: player.downCards,
            name: player.name
          };
        } else {
          return {
            id,
            handCount: player.hand.length,
            upCount: player.upCards.length,
            downCount: player.downCards.length,
            name: player.name
          };
        }
      }),
      pile: state.pile,
      discardCount: state.discard.length,
      currentPlayer: currentPlayerId,
      started: true
    };
    this.io.to(roomId).emit(STATE_UPDATE, stateData);
  }
}
