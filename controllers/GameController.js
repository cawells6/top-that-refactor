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
import { normalizeCardValue, isSpecialCard } from '../utils/cardUtils.js';
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

export default class GameController {
  /**
   * @param {import('socket.io').Server} io
   */
  constructor(io) {
    this.io = io;
    this.gameState = new GameState();
    this.players = new Map(); // Map<playerId, Player>

    // Wire up per‑socket listeners
    this.io.on('connection', socket => this.setupListeners(socket));
  }

  /**
   * Register socket event handlers
   * @param {import('socket.io').Socket} socket
   */
  setupListeners(socket) {
    socket.on(JOIN_GAME, playerId => this.handleJoin(socket, playerId));
    socket.on(START_GAME, (opts) => this.handleStartGame(opts));
    socket.on('play-card', data => this.handlePlay(socket, data));
    socket.on(NEXT_TURN, () => this.handleNextTurn());
    socket.on(REJOIN, ({ roomId, playerId }) => {
      // Validate the room exists (for now, only 'game-room' is valid)
      if (roomId !== 'game-room' || !this.players.has(playerId)) {
        socket.emit('err', 'Invalid room or player for rejoin');
        return;
      }
      socket.join(roomId);
      // Resend the latest game snapshot
      const state = {
        players: this.gameState.players.map(id => ({
          id,
          handCount: this.players.get(id).hand.length,
          upCount: this.players.get(id).upCards.length,
          downCount: this.players.get(id).downCards.length,
        })),
        pile: this.gameState.pile,
        discardCount: this.gameState.discard.length,
        currentPlayer: this.gameState.players[this.gameState.currentPlayerIndex],
      };
      socket.emit(STATE_UPDATE, state);
    });
  }

  /** Add a new player to the game */
  handleJoin(socket, playerId) {
    if (this.players.has(playerId)) {
      socket.emit('err', 'Player already joined');
      return;
    }
    this.gameState.addPlayer(playerId);
    const player = new Player(playerId);
    this.players.set(playerId, player);

    socket.join('game-room');
    // One-off ACK to the joining socket
    socket.emit(JOINED, { id: playerId, roomId: 'game-room' });
    // Notify all clients of the updated player list
    const playerList = [...this.players.keys()];
    this.io.to('game-room').emit(PLAYER_JOINED, playerList);
    this.io.to('game-room').emit(LOBBY, {
      roomId: 'game-room',
      players: playerList,
      maxPlayers: 4
    });
    this.pushState();
  }

  /** Initialize deck, deal cards, assign them to players, and emit first turn */
  handleStartGame(opts = {}) {
    // Support both legacy (no opts) and new (opts.computerCount) calls
    const computerCount = opts.computerCount || 0;
    if (this.players.size + computerCount < 2) {
      console.error('Cannot start game: need at least 2 players.');
      return;
    }
    // Add computer players if needed
    for (let i = 0; i < computerCount; i++) {
      const id = `COMPUTER_${i+1}`;
      if (!this.players.has(id)) {
        this.gameState.addPlayer(id);
        this.players.set(id, new Player(id));
      }
    }
    this.gameState.buildDeck();
    // Deal cards to all players
    const numPlayers = this.gameState.players.length;
    const { hands, upCards, downCards } = this.gameState.dealCards(numPlayers);
    // Assign cards to each player
    this.gameState.players.forEach((id, idx) => {
      const player = this.players.get(id);
      player.setHand(hands[idx]);
      player.setUpCards(upCards[idx]);
      player.setDownCards(downCards[idx]);
    });
    this.pushState();
    const first = this.gameState.players[0];
    this.io.to('game-room').emit(NEXT_TURN, first);
  }

  /**
   * Player plays a card from hand/up/down
   * @param {import('socket.io').Socket} socket
   * @param {{playerId:string,cardIndex:number,zone:'hand'|'up'|'down'}} data
   */
  handlePlay(socket, { playerId, cardIndex, zone }) {
    const player = this.players.get(playerId);
    if (!player) return;

    let card;
    switch (zone) {
      case 'hand': card = player.playFromHand(cardIndex); break;
      case 'up':   card = player.playUpCard(cardIndex);     break;
      case 'down': card = player.playDownCard();            break;
      default:     return;
    }

    const normalized = normalizeCardValue(card.value);
    this.gameState.addToPile({ ...card, value: normalized });
    this.io.to('game-room').emit('card-played', { playerId, card: { ...card, value: normalized } });

    if (isSpecialCard(normalized)) {
      socket.emit(SPECIAL_CARD, normalized);
    }
  }

  /** Advance to next player's turn */
  handleNextTurn() {
    this.gameState.advancePlayer();
    const next = this.gameState.players[this.gameState.currentPlayerIndex];
    this.io.to('game-room').emit(NEXT_TURN, next);
  }

  /** Cleanup on disconnect (optional) */
  handleDisconnect(socket) {
    // TO DO: remove or mark offline
    this.pushState();
  }

  /** Broadcast full game state to all clients */
  pushState() {
    const currentPlayerId = this.gameState.players[this.gameState.currentPlayerIndex];
    const state = {
      players: this.gameState.players.map(id => {
        const player = this.players.get(id);
        if (id === currentPlayerId) {
          // Send full hand/upCards/downCards for current player
          return {
            id,
            hand: player.hand,
            upCards: player.upCards,
            downCards: player.downCards,
            name: player.name // if you have a name property
          };
        } else {
          // Only send counts for opponents
          return {
            id,
            handCount: player.hand.length,
            upCount: player.upCards.length,
            downCount: player.downCards.length,
            name: player.name // if you have a name property
          };
        }
      }),
      pile: this.gameState.pile,
      discardCount: this.gameState.discard.length,
      currentPlayer: currentPlayerId,
      started: true // or set appropriately
    };
    this.io.to('game-room').emit(STATE_UPDATE, state);
  }
}
