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
import { normalizeCardValue, isSpecialCard, isTwoCard, isFiveCard, isTenCard, isFourOfAKind } from '../utils/cardUtils.js';
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
  handleJoin(socket, playerData) { // Renamed param for clarity
    let id;
    let name;

    if (typeof playerData === 'object' && playerData !== null) {
      id = playerData.id || playerData.name; // Prioritize .id, fallback to .name
      name = playerData.name || playerData.id; // Prioritize .name, fallback to .id
    } else if (typeof playerData === 'string') {
      id = playerData;
      name = playerData; // Default name to the id string
    }

    // Validate id
    if (typeof id !== 'string' || id.trim() === '') {
      socket.emit('err', 'Invalid player identifier provided.');
      console.error('[GameController] Join attempt with invalid identifier:', playerData);
      return;
    }
    id = id.trim();
    // Ensure name is a non-empty string, defaulting to id if necessary
    name = (typeof name === 'string' && name.trim() !== '') ? name.trim() : id;

    if (this.players.has(id)) {
      socket.emit('err', `Player ID '${id}' already joined.`);
      return;
    }

    this.gameState.addPlayer(id);
    const player = new Player(id);
    player.name = name;
    this.players.set(id, player);

    socket.join('game-room');
    // One-off ACK to the joining socket
    socket.emit(JOINED, { id: id, roomId: 'game-room' });
    
    // Notify all clients of the updated player list for the lobby
    const lobbyPlayerList = this.gameState.players.map(pId => {
      const p = this.players.get(pId);
      return { id: pId, name: p ? p.name : pId }; // Send objects with id and name
    });

    this.io.to('game-room').emit(PLAYER_JOINED, lobbyPlayerList); // Consider sending the richer list here too
    this.io.to('game-room').emit(LOBBY, {
      roomId: 'game-room',
      players: lobbyPlayerList,
      maxPlayers: this.gameState.maxPlayers
    });

    // Auto-start logic if this is the first player (host) setting up the game
    const numCPUs = typeof playerData.numCPUs === 'number' ? playerData.numCPUs : 0;

    // Check if the game deck hasn't been built (implies game not started by handleStartGame)
    // and if the current joining player is the first one in the game state.
    if (!this.gameState.deck && this.gameState.players.length === 1) {
      console.log(`[GameController] Player ${id} is host. Auto-starting game with ${numCPUs} CPU players.`);
      // The host (current player) is already in this.gameState.players via addPlayer earlier.
      // handleStartGame will add CPU players based on computerCount, build deck, deal cards, and then call pushState.
      this.handleStartGame({ computerCount: numCPUs, socket: socket }); 
      // Note: handleStartGame is async and calls pushState internally.
    } else {
      // If not auto-starting (e.g., game already started, or this is a subsequent player joining a non-started lobby),
      // just push the current state.
      console.log(`[GameController] Not auto-starting. Deck exists: ${!!this.gameState.deck}, Player count: ${this.gameState.players.length}`);
      this.pushState();
    }
  }

  /** Initialize deck, deal cards, assign them to players, and emit first turn */
  async handleStartGame(opts = {}) {
    console.log('--- GameController: handleStartGame --- ENTERED ---'); // New log
    // Support both legacy (no opts) and new (opts.computerCount) calls
    const computerCount = typeof opts.computerCount === 'number' ? opts.computerCount : 0;
    // Validation: prevent exceeding max players
    if (this.players.size + computerCount > this.gameState.maxPlayers) {
      // Try to find the initiator socket (if available)
      let initiatorSocketId = null;
      if (opts.socket && opts.socket.id) {
        initiatorSocketId = opts.socket.id;
      } else {
        // Fallback: emit to the room
        initiatorSocketId = null;
      }
      const errorMsg = 'Cannot start game: Total players would exceed the maximum of ' + this.gameState.maxPlayers;
      if (initiatorSocketId && this.io.sockets.sockets[initiatorSocketId]) {
        this.io.sockets.sockets[initiatorSocketId].emit('err', errorMsg);
      } else {
        // Fallback: emit to all sockets in the default room
        this.io.emit('err', errorMsg);
      }
      return;
    }
    // Add computer players if needed
    for (let i = 0; i < computerCount; i++) {
      const id = `COMPUTER_${i+1}`;
      if (!this.players.has(id)) {
        this.gameState.addPlayer(id);
        this.players.set(id, new Player(id)); // Ensure computer players are in this.players map
      }
    }

    console.log('[GameController] About to build deck. Number of players in gameState:', this.gameState.players.length); // New log
    this.gameState.buildDeck();
    // Deal cards to all players
    const numPlayers = this.gameState.players.length;
    if (numPlayers === 0) {
        console.error('[GameController] No players to deal cards to in handleStartGame.');
        return;
    }
    const { hands, upCards, downCards } = this.gameState.dealCards(numPlayers);
    // Assign cards to each player
    this.gameState.players.forEach((id, idx) => {
      const player = this.players.get(id);
      if (!player) {
          console.error(`[GameController] Player not found in this.players map for id: ${id} during card assignment.`);
          return; 
      }
      player.setHand(hands[idx] || []);
      player.setUpCards(upCards[idx] || []);
      player.setDownCards(downCards[idx] || []);
    });

    // <<< START MODIFIED LOGGING >>>
    console.log('--- GameController: handleStartGame --- CARDS ASSIGNED ---');
    this.players.forEach((player, id) => {
      console.log(`Player ${id} (${player.name}):`);
      console.log('  Hand:', player.hand ? player.hand.length : 'undefined');
      console.log('  UpCards:', player.upCards ? player.upCards.length : 'undefined');
      console.log('  DownCards:', player.downCards ? player.downCards.length : 'undefined');
    });
    console.log('------------------------------------');
    // <<< END MODIFIED LOGGING >>>

    this.pushState();
    const firstPlayerId = this.gameState.players[0];
    if (!firstPlayerId) {
        console.error('[GameController] No first player to start the turn.');
        return;
    }
    console.log(`[GameController] Emitting NEXT_TURN for player: ${firstPlayerId}`); // New log
    this.io.to('game-room').emit(NEXT_TURN, firstPlayerId);
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
    // Add card to pile
    this.gameState.addToPile({ ...card, value: normalized });
    this.io.to('game-room').emit('card-played', { playerId, card: { ...card, value: normalized } });

    // --- Special Card Logic ---
    const pile = this.gameState.pile;
    const isFour = this.gameState.isFourOfAKindOnPile();
    const delay = ms => new Promise(res => setTimeout(res, ms));
    const DELAY_SPECIAL = 1200; // ms

    (async () => {
      if (isTwoCard(normalized)) {
        this.io.to('game-room').emit('special-card', { type: 'two' });
        await delay(DELAY_SPECIAL);
        this.gameState.clearPile();
        this.pushState();
        // Next player can play any card
        this.handleNextTurn();
        return;
      }
      if (isTenCard(normalized) || isFour) {
        this.io.to('game-room').emit('special-card', { type: isFour ? 'four' : 'ten' });
        await delay(DELAY_SPECIAL);
        this.gameState.clearPile();
        // Draw a new card to start the pile if deck is not empty
        if (this.gameState.deck && this.gameState.deck.length > 0) {
          const newCard = this.gameState.deck.pop();
          this.gameState.addToPile(newCard);
          if (!isSpecialCard(normalizeCardValue(newCard.value))) {
            this.gameState.lastRealCard = newCard;
          } else {
            this.gameState.lastRealCard = null;
          }
        }
        this.pushState();
        this.handleNextTurn();
        return;
      }
      if (isFiveCard(normalized)) {
        this.io.to('game-room').emit('special-card', { type: 'five' });
        await delay(DELAY_SPECIAL);
        // Copy lastRealCard if it exists
        if (this.gameState.lastRealCard) {
          this.gameState.addToPile({ ...this.gameState.lastRealCard }, { isCopy: true });
        }
        this.pushState();
        this.handleNextTurn();
        return;
      }
      // Regular card: update lastRealCard
      this.gameState.lastRealCard = { ...card, value: normalized };
      this.pushState();
      this.handleNextTurn();
    })();
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
    if (this.gameState.players.length === 0 && this.gameState.currentPlayerIndex === 0) {
        console.log('[pushState] Attempting to push state with no players, currentPlayerId will be undefined.');
    }
    const currentPlayerId = this.gameState.players[this.gameState.currentPlayerIndex];
    
    // Log the value of currentPlayerId immediately
    console.log(`[pushState] Determined currentPlayerId: ${currentPlayerId} (type: ${typeof currentPlayerId})`);
    console.log(`[pushState] gameState.players: ${JSON.stringify(this.gameState.players)}, currentPlayerIndex: ${this.gameState.currentPlayerIndex}`);

    if (currentPlayerId === undefined) {
        console.warn(`[pushState] currentPlayerId is undefined. gameState.players: ${JSON.stringify(this.gameState.players)}, currentPlayerIndex: ${this.gameState.currentPlayerIndex}`);
    }

    const stateForEmit = {
      players: this.gameState.players.map(id => {
        const player = this.players.get(id);
        if (!player) {
            console.error(`[pushState] Player object not found for id: ${id} in this.players map. gameState.players: ${JSON.stringify(this.gameState.players)}. this.players keys: ${JSON.stringify(Array.from(this.players.keys()))}`);
            return { id, name: String(id), handCount: 0, upCount: 0, downCount: 0, error: 'Player data missing server-side' };
        }
        // Determine if this is the current player to decide whether to send full hand or counts
        if (id === currentPlayerId) {
          return {
            id,
            hand: player.hand || [],
            upCards: player.upCards || [],
            downCards: player.downCards || [],
            name: String(player.name || id)
          };
        } else {
          return {
            id,
            handCount: player.hand ? player.hand.length : 0,
            upCount: player.upCards ? player.upCards.length : 0,
            downCount: player.downCards ? player.downCards.length : 0,
            name: String(player.name || id)
          };
        }
      }),
      pile: this.gameState.pile || [],
      discardCount: this.gameState.discard ? this.gameState.discard.length : 0,
      deckCount: this.gameState.deck ? this.gameState.deck.length : 0,
      currentPlayer: currentPlayerId,
      started: !!(this.gameState.deck && this.gameState.deck.length > 0 && this.gameState.players.length > 0)
    };
    
    console.log('--- GameController: pushState ---');
    console.log(`[pushState] Value of stateForEmit.currentPlayer before stringify: ${stateForEmit.currentPlayer}`);
    console.log('Broadcasting STATE_UPDATE (raw object):', stateForEmit); 
    console.log('Broadcasting STATE_UPDATE (JSON):', JSON.stringify(stateForEmit, null, 2));
    console.log('---------------------------------');
    
    this.io.to('game-room').emit(STATE_UPDATE, stateForEmit);
  }
}
