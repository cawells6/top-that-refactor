import { Server, Socket } from 'socket.io';
import GameState, { Card, CardValue } from '../models/GameState.js';
import Player from '../models/Player.js';
import { normalizeCardValue, isSpecialCard, isTwoCard, isFiveCard, isTenCard, rank as getCardRank } from '../utils/cardUtils.js'; // Renamed rank to avoid conflict
import {
  JOIN_GAME,
  JOINED,
  PLAYER_JOINED,
  LOBBY,
  STATE_UPDATE,
  SPECIAL_CARD,
  REJOIN,
  START_GAME,
  NEXT_TURN,
  GAME_OVER,
  CARD_PLAYED,
  PILE_PICKED_UP,
  ERROR as ERROR_EVENT, // Renamed to avoid conflict
  PLAY_CARD, // Added PLAY_CARD
  PICK_UP_PILE // Added PICK_UP_PILE
} from '../src/shared/events.js'; // Corrected path and changed to .js extension

interface PlayerJoinData {
  id?: string; // Player might provide their previous ID for rejoin, or server assigns
  name?: string;
  numCPUs?: number; // Number of CPU players to add if this player is creating the game
}

interface StartGameOptions {
  computerCount?: number; // Number of CPUs to add explicitly when starting
  socket?: Socket; // Socket that initiated the start game action
}

interface PlayData {
  // playerId: string; // playerId is inferred from the socket
  cardIndices: number[]; // Array of indices of cards to play
  zone: 'hand' | 'upCards' | 'downCards'; // Which zone to play from
}

interface RejoinData {
  roomId: string; // Should always be 'game-room' for now
  playerId: string;
}

interface ClientStatePlayer {
  id: string;
  name: string;
  handCount?: number;
  upCount?: number;
  downCount?: number;
  hand?: Card[];
  upCards?: Card[];
  downCards?: Card[]; // Will be array of { back: true } for opponents
  disconnected: boolean;
  error?: string;
}

interface ClientState {
  players: ClientStatePlayer[];
  pile: Card[];
  discardCount: number;
  deckCount: number;
  currentPlayerId: string | undefined; // Renamed from currentPlayer
  started: boolean;
  lastRealCard: Card | null; // For client-side '5' logic if needed
}


export default class GameController {
  private io: Server;
  private gameState: GameState;
  private players: Map<string, Player>; // Map<playerId, Player>
  private socketIdToPlayerId: Map<string, string>; // Map<socket.id, playerId>

  constructor(io: Server) {
    this.io = io;
    this.gameState = new GameState();
    this.players = new Map<string, Player>();
    this.socketIdToPlayerId = new Map<string, string>();

    this.io.on('connection', (socket: Socket) => this.setupListeners(socket));
    console.log('[GameController] Initialized and listening for connections.');
  }

  private setupListeners(socket: Socket): void {
    socket.on(JOIN_GAME, (playerData: PlayerJoinData) => this.handleJoin(socket, playerData));
    socket.on(START_GAME, (opts: Pick<StartGameOptions, 'computerCount'> = {}) => this.handleStartGame({ ...opts, socket }));
    socket.on(PLAY_CARD, (data: PlayData) => this.handlePlayCard(socket, data));
    socket.on(PICK_UP_PILE, () => this.handlePickUpPile(socket));
    socket.on(REJOIN, ({ roomId, playerId }: RejoinData) => this.handleRejoin(socket, roomId, playerId));
    socket.on('disconnect', () => this.handleDisconnect(socket));
    console.log(`[GameController] Listeners set up for socket: ${socket.id}`);
  }

  private getLobbyPlayerList(): {id: string, name: string, disconnected: boolean}[] {
    return Array.from(this.players.values()).map((p: Player) => ({
        id: p.id,
        name: p.name,
        disconnected: p.disconnected
    }));
  }

  private handleRejoin(socket: Socket, roomId: string, playerId: string): void {
    if (roomId !== 'game-room') { // Currently only one room
      socket.emit(ERROR_EVENT, 'Invalid room for rejoin.');
      return;
    }
    const player = this.players.get(playerId);
    if (player) {
      socket.join('game-room');
      player.socketId = socket.id; // Update socket ID
      player.disconnected = false;
      this.socketIdToPlayerId.set(socket.id, playerId);

      console.log(`[GameController] Player ${playerId} reconnected with socket ${socket.id}.`);
      socket.emit(JOINED, { id: player.id, name: player.name, roomId: 'game-room' });
      this.pushState(); // Send full state to everyone, including reconnected player
      this.io.to('game-room').emit(LOBBY, {
        roomId: 'game-room',
        players: this.getLobbyPlayerList(),
        maxPlayers: this.gameState.maxPlayers,
      });
    } else {
      socket.emit(ERROR_EVENT, `Player ${playerId} not found for rejoin.`);
    }
  }


  private handleJoin(socket: Socket, playerData: PlayerJoinData): void {
    let id = playerData.id || socket.id; // Use provided ID or fallback to socket.id
    let name = playerData.name || `Player-${id.substring(0, 4)}`;
    const numCPUs = playerData.numCPUs || 0;

    console.log(`[GameController] Join attempt: id=${id}, name=${name}, numCPUs=${numCPUs}, socket=${socket.id}`);

    if (this.players.has(id) && !this.players.get(id)?.disconnected) {
      socket.emit(ERROR_EVENT, `Player ID '${id}' is already active in a game.`);
      console.warn(`[GameController] Join rejected: Player ${id} already active.`);
      return;
    }
     if (this.players.has(id) && this.players.get(id)?.disconnected) {
      // This is a rejoin scenario for a known, disconnected player
      console.log(`[GameController] Player ${id} is rejoining.`);
      this.handleRejoin(socket, 'game-room', id);
      return;
    }


    if (this.gameState.started) {
      socket.emit(ERROR_EVENT, 'Game has already started. Cannot join.');
      console.warn(`[GameController] Join rejected: Game started, player ${id} cannot join.`);
      return;
    }

    if (this.players.size >= this.gameState.maxPlayers) {
      socket.emit(ERROR_EVENT, 'Game room is full.');
      console.warn(`[GameController] Join rejected: Room full, player ${id} cannot join.`);
      return;
    }

    this.gameState.addPlayer(id);
    const player = new Player(id);
    player.name = name;
    player.socketId = socket.id;
    this.players.set(id, player);
    this.socketIdToPlayerId.set(socket.id, id);

    socket.join('game-room');
    socket.emit(JOINED, { id: player.id, name: player.name, roomId: 'game-room' });
    console.log(`[GameController] Player ${player.name} (${player.id}) joined with socket ${socket.id}. Players count: ${this.players.size}`);

    const currentLobbyPlayers = this.getLobbyPlayerList();
    this.io.to('game-room').emit(PLAYER_JOINED, currentLobbyPlayers);
    this.io.to('game-room').emit(LOBBY, {
      roomId: 'game-room',
      players: currentLobbyPlayers,
      maxPlayers: this.gameState.maxPlayers,
    });

    const autoStartEnabled = true; // Or make this configurable
    if (autoStartEnabled && this.players.size === 1 && numCPUs > 0 && !this.gameState.started) {
      console.log(`[GameController] Player ${id} is host. Auto-starting game with ${numCPUs} CPU players.`);
      this.handleStartGame({ computerCount: numCPUs, socket });
    } else {
      console.log(`[GameController] Not auto-starting. Total Players: ${this.players.size}, Requested CPUs: ${numCPUs}, GameStarted: ${this.gameState.started}`);
      this.pushState(); // Send current lobby state
    }
  }

  private async handleStartGame(opts: StartGameOptions): Promise<void> {
    console.log('[GameController] Attempting to start game with options:', opts);
    const computerCount = opts.computerCount || 0;

    if (this.gameState.started) {
      const errorMsg = 'Game has already started.';
      console.warn(`[GameController] Start game failed: ${errorMsg}`);
      if (opts.socket) opts.socket.emit(ERROR_EVENT, errorMsg);
      else this.io.to('game-room').emit(ERROR_EVENT, errorMsg);
      return;
    }

    const currentHumanPlayers = Array.from(this.players.values()).filter((p: Player) => !p.isComputer).length;
    if (currentHumanPlayers === 0 && computerCount < 2) {
        const errorMsg = 'At least two players (humans or CPUs) are required to start.';
        console.warn(`[GameController] Start game failed: ${errorMsg}`);
        if (opts.socket) opts.socket.emit(ERROR_EVENT, errorMsg);
        else this.io.to('game-room').emit(ERROR_EVENT, errorMsg);
        return;
    }
    if (currentHumanPlayers > 0 && (currentHumanPlayers + computerCount) < 2) {
        const errorMsg = 'At least two total players (humans + CPUs) are required.';
        console.warn(`[GameController] Start game failed: ${errorMsg}`);
        if (opts.socket) opts.socket.emit(ERROR_EVENT, errorMsg);
        else this.io.to('game-room').emit(ERROR_EVENT, errorMsg);
        return;
    }


    // Add CPU players if requested and space allows
    for (let i = 0; i < computerCount; i++) {
      if (this.players.size >= this.gameState.maxPlayers) {
        console.warn(`[GameController] Cannot add CPU player ${i + 1}, max players reached.`);
        break;
      }
      const cpuId = `COMPUTER_${this.players.size + 1}`; // Ensure unique CPU IDs
      if (!this.players.has(cpuId)) {
        this.gameState.addPlayer(cpuId);
        const cpuPlayer = new Player(cpuId);
        cpuPlayer.name = `CPU ${i + 1}`;
        cpuPlayer.isComputer = true;
        this.players.set(cpuId, cpuPlayer);
        console.log(`[GameController] Added ${cpuPlayer.name}`);
      }
    }

    if (this.players.size < 2) {
      const errorMsg = `Not enough players to start (need at least 2, have ${this.players.size}).`;
      console.warn(`[GameController] Start game failed: ${errorMsg}`);
      if (opts.socket) opts.socket.emit(ERROR_EVENT, errorMsg);
      else this.io.to('game-room').emit(ERROR_EVENT, errorMsg);
      return;
    }

    this.gameState.startGameInstance(); // Builds deck, sets started=true, sets initial currentPlayerIndex
    console.log('[GameController] GameState instance started. Deck built, game marked as started.');

    const numPlayers = this.gameState.players.length;
    const { hands, upCards, downCards } = this.gameState.dealCards(numPlayers);

    this.gameState.players.forEach((id: string, idx: number) => {
      const player = this.players.get(id);
      if (!player) {
        console.error(`[GameController] Critical error: Player ${id} not found in map during card dealing.`);
        return;
      }
      player.setHand(hands[idx] || []);
      player.setUpCards(upCards[idx] || []);
      player.setDownCards(downCards[idx] || []);
    });

    console.log('[GameController] Cards dealt and assigned.');
    this.players.forEach((player: Player) => {
      console.log(`  Player ${player.id} (${player.name}): Hand: ${player.hand.length}, Up: ${player.upCards.length}, Down: ${player.downCards.length}`);
    });

    // The first turn is determined by GameState.startGameInstance() setting currentPlayerIndex
    const firstPlayerId = this.gameState.players[this.gameState.currentPlayerIndex];
    console.log(`[GameController] Game started. First turn: ${firstPlayerId}`);
    this.io.to('game-room').emit(NEXT_TURN, firstPlayerId); // Announce the first turn
    this.pushState(); // Send the initial game state
  }

  private handlePlayCard(socket: Socket, { cardIndices, zone }: PlayData): void {
    const playerId = this.socketIdToPlayerId.get(socket.id);
    if (!playerId) {
      socket.emit(ERROR_EVENT, "Player not recognized.");
      return;
    }

    const player = this.players.get(playerId);
    if (!player) {
      socket.emit(ERROR_EVENT, "Player data not found.");
      return;
    }

    if (this.gameState.players[this.gameState.currentPlayerIndex] !== playerId) {
      socket.emit(ERROR_EVENT, "Not your turn.");
      return;
    }

    if (!cardIndices || cardIndices.length === 0) {
      socket.emit(ERROR_EVENT, "No cards selected to play.");
      return;
    }

    // Basic validation (more can be added in Player model or here)
    // For example, check if all cards are from the same zone and if indices are valid

    const cardsToPlay: Card[] = [];
    let validPlay = true;

    for (const index of cardIndices) {
        let card: Card | undefined;
        if (zone === 'hand') card = player.hand[index];
        else if (zone === 'upCards') card = player.upCards[index];
        else if (zone === 'downCards') card = player.downCards[index]; // Assuming down cards can be selected by index for now

        if (!card) {
            validPlay = false;
            break;
        }
        cardsToPlay.push(card);
    }

    if (!validPlay || cardsToPlay.length !== cardIndices.length) {
        socket.emit(ERROR_EVENT, "Invalid card selection.");
        return;
    }

    // --- TODO: Implement actual game rule validation for the played cards ---
    // Example: this.isValidPlay(cardsToPlay, this.gameState.pile)
    // For now, assume the play is valid if cards are found

    // Remove cards from player's possession
    if (zone === 'hand') {
        player.setHand(player.hand.filter((_: Card, i: number) => !cardIndices.includes(i)));
    } else if (zone === 'upCards') {
        player.setUpCards(player.upCards.filter((_: Card, i: number) => !cardIndices.includes(i)));
    } else if (zone === 'downCards') {
        player.setDownCards(player.downCards.filter((_: Card, i: number) => !cardIndices.includes(i)));
    }


    cardsToPlay.forEach(card => {
        const normalizedValue = normalizeCardValue(card.value) as CardValue;
        const playedCardForPile: Card = { ...card, value: normalizedValue };
        this.gameState.addToPile(playedCardForPile);

        if (!isSpecialCard(normalizedValue) && !this.gameState.isFourOfAKindOnPile()) {
            this.gameState.lastRealCard = playedCardForPile;
        }
    });

    this.io.to('game-room').emit(CARD_PLAYED, { playerId, cards: cardsToPlay, zone });

    // Handle special card effects (2, 5, 10, four-of-a-kind)
    const lastPlayedNormalizedValue = normalizeCardValue(cardsToPlay[0].value); // Assuming all cards in a play are same value

    if (isTwoCard(lastPlayedNormalizedValue)) {
        this.io.to('game-room').emit(SPECIAL_CARD, { type: 'two', value: lastPlayedNormalizedValue });
        this.gameState.clearPile();
    } else if (this.gameState.isFourOfAKindOnPile() || isTenCard(lastPlayedNormalizedValue)) {
        this.io.to('game-room').emit(SPECIAL_CARD, { type: isTenCard(lastPlayedNormalizedValue) ? 'ten' : 'four', value: lastPlayedNormalizedValue });
        this.gameState.clearPile();
        // If deck is not empty, automatically play the next card from deck onto the new pile
        if (this.gameState.deck && this.gameState.deck.length > 0) {
            const nextCardFromDeck = this.gameState.deck.pop();
            if (nextCardFromDeck) {
                this.gameState.addToPile(nextCardFromDeck);
                if(!isSpecialCard(normalizeCardValue(nextCardFromDeck.value))) {
                    this.gameState.lastRealCard = nextCardFromDeck;
                }
            }
        }
    } else if (isFiveCard(lastPlayedNormalizedValue)) {
        this.io.to('game-room').emit(SPECIAL_CARD, { type: 'five', value: lastPlayedNormalizedValue });
        if (this.gameState.lastRealCard) {
            this.gameState.addToPile({ ...this.gameState.lastRealCard, copied: true });
        }
    }

    // Check for win condition
    if (player.hasEmptyHand() && player.hasEmptyUp() && player.hasEmptyDown()) {
      this.io.to('game-room').emit(GAME_OVER, { winnerId: playerId, winnerName: player.name });
      console.log(`[GameController] Game Over! Winner: ${player.name} (${playerId})`);
      this.gameState.endGameInstance(); // Reset game state for a new game potentially
      // Optionally, fully reset players map and game state for a new lobby.
      // this.players.clear();
      // this.socketIdToPlayerId.clear();
      // this.gameState = new GameState();
    } else {
      // Refill player's hand if played from hand and deck has cards
      if (zone === 'hand' && this.gameState.deck) {
          while(player.hand.length < 3 && this.gameState.deck.length > 0) {
              const drawnCard = this.gameState.deck.pop();
              if (drawnCard) player.hand.push(drawnCard);
          }
          player.sortHand();
      }
      this.handleNextTurn(); // Advances turn and pushes state
    }
    this.pushState(); // Push state after play and potential hand refill
}


  private handlePickUpPile(socket: Socket): void {
    const playerId = this.socketIdToPlayerId.get(socket.id);
    if (!playerId) return;

    const player = this.players.get(playerId);
    if (!player || this.gameState.players[this.gameState.currentPlayerIndex] !== playerId) {
      socket.emit(ERROR_EVENT, "Cannot pick up pile now.");
      return;
    }

    if (this.gameState.pile.length === 0) {
        socket.emit(ERROR_EVENT, "Pile is empty.");
        return;
    }

    player.pickUpPile([...this.gameState.pile]); // Give a copy of the pile
    this.gameState.clearPile(); // Clears original pile and lastRealCard

    this.io.to('game-room').emit(PILE_PICKED_UP, { playerId });
    console.log(`[GameController] Player ${playerId} picked up the pile.`);
    this.handleNextTurn(); // Advances turn and pushes state
  }


  private handleNextTurn(): void {
    if (!this.gameState.started) {
        console.log("[GameController] handleNextTurn called but game not started.");
        this.pushState(); // Push current (lobby) state
        return;
    }
    this.gameState.advancePlayer();
    const nextPlayerId = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!nextPlayerId) {
      console.error("[GameController] Critical: Next player ID is undefined after advancing turn.");
      // Potentially end game or reset if no valid next player
      return;
    }
    this.io.to('game-room').emit(NEXT_TURN, nextPlayerId);
    console.log(`[GameController] Advanced turn to ${nextPlayerId}.`);
    this.pushState();

    const nextPlayerInstance = this.players.get(nextPlayerId);
    if (nextPlayerInstance?.isComputer) {
        // Simple delay before CPU plays
        setTimeout(() => this.playComputerTurn(nextPlayerId), 1200);
    }
  }

  private playComputerTurn(cpuPlayerId: string): void {
    if (!this.gameState.started || this.gameState.players[this.gameState.currentPlayerIndex] !== cpuPlayerId) {
        return; // Not this CPU's turn or game ended
    }
    const cpu = this.players.get(cpuPlayerId);
    if (!cpu || !cpu.isComputer) return;

    console.log(`[GameController] CPU ${cpuPlayerId} is taking its turn.`);
    // AI Logic:
    // 1. Try to play from hand
    // 2. If hand empty, try from upCards
    // 3. If upCards empty, play from downCards
    // 4. If no valid play, pick up pile

    let playedACard = false;

    // Try hand cards
    if (cpu.hand.length > 0) {
        // Simplified: find first playable card. Real AI would be smarter.
        for (let i = 0; i < cpu.hand.length; i++) {
            const cardToAttempt = cpu.hand[i];
            // TODO: Implement `isValidPlay(card, pile)` in GameState or GameController
            // For now, let's assume the AI can find a "valid" play or just picks one
            if (true /*this.isValidPlay([cardToAttempt], this.gameState.pile)*/) {
                console.log(`[AI] ${cpu.name} plays ${cardToAttempt.value} of ${cardToAttempt.suit} from hand.`);
                // Simulate a socket for handlePlayCard, or refactor handlePlayCard
                // This is a simplified direct manipulation for AI
                const playedCard = cpu.playFromHand(i);
                if (playedCard) {
                    this.gameState.addToPile(playedCard);
                    if (!isSpecialCard(normalizeCardValue(playedCard.value))) {
                        this.gameState.lastRealCard = playedCard;
                    }
                    this.io.to('game-room').emit(CARD_PLAYED, { playerId: cpu.id, cards: [playedCard], zone: 'hand' });
                    playedACard = true;
                    break;
                }
            }
        }
        if (playedACard) {
             while(cpu.hand.length < 3 && this.gameState.deck && this.gameState.deck.length > 0) {
                const drawnCard = this.gameState.deck.pop();
                if (drawnCard) cpu.hand.push(drawnCard);
            }
            cpu.sortHand();
        }
    }

    // TODO: Add logic for upCards and downCards similar to hand, if hand was empty or no play was made

    if (!playedACard) {
        console.log(`[AI] ${cpu.name} has no valid play, picking up pile.`);
        if (this.gameState.pile.length > 0) {
            cpu.pickUpPile([...this.gameState.pile]);
            this.gameState.clearPile();
            this.io.to('game-room').emit(PILE_PICKED_UP, { playerId: cpu.id });
        } else {
            console.log(`[AI] ${cpu.name} tried to pick up an empty pile. Passing turn.`);
        }
    }
    
    if (cpu.hasEmptyHand() && cpu.hasEmptyUp() && cpu.hasEmptyDown()) {
      this.io.to('game-room').emit(GAME_OVER, { winnerId: cpu.id, winnerName: cpu.name });
      this.gameState.endGameInstance();
    } else {
        this.handleNextTurn();
    }
    this.pushState();
  }


  private handleDisconnect(socket: Socket): void {
    const playerId = this.socketIdToPlayerId.get(socket.id);
    if (playerId) {
      const player = this.players.get(playerId);
      if (player) {
        player.disconnected = true;
        player.socketId = undefined; // Clear socketId on disconnect
        console.log(`[GameController] Player ${playerId} (${player.name}) marked as disconnected.`);
      }
      this.socketIdToPlayerId.delete(socket.id);

      const activePlayers = Array.from(this.players.values()).filter((p: Player) => !p.disconnected);
      if (activePlayers.length === 0 && this.gameState.started) {
        console.log("[GameController] All players disconnected. Ending game session.");
        this.gameState.endGameInstance(); // Mark game as not started
        // Consider fully resetting players and game state if the room should be "destroyed"
        // this.players.clear();
        // this.gameState = new GameState(); // Or a more graceful reset
      } else if (this.gameState.started && playerId === this.gameState.players[this.gameState.currentPlayerIndex]) {
        // If the disconnected player was the current player, advance the turn
        console.log(`[GameController] Current player ${playerId} disconnected. Advancing turn.`);
        this.handleNextTurn(); // This will also push state
        return; // Avoid double pushState
      }
    } else {
      console.log(`[GameController] Socket ${socket.id} disconnected, but no player found for it.`);
    }
    this.pushState();
    this.io.to('game-room').emit(LOBBY, { // Update lobby for disconnections too
        roomId: 'game-room',
        players: this.getLobbyPlayerList(),
        maxPlayers: this.gameState.maxPlayers,
    });
  }

  private pushState(): void {
    if (!this.io) {
        console.error("[GameController] pushState called but IO is not initialized.");
        return;
    }

    const currentPlayerId = this.gameState.started && this.gameState.players.length > 0 && this.gameState.currentPlayerIndex !== -1
        ? this.gameState.players[this.gameState.currentPlayerIndex]
        : undefined;

    const stateForEmit: ClientState = {
      players: Array.from(this.players.values()).map((player: Player): ClientStatePlayer => {
        // For self, send full details, for others, send counts
        // This needs to be customized per-socket if sending private data
        return {
          id: player.id,
          name: player.name,
          hand: player.hand, // For simplicity, sending all hands. In prod, only send to self.
          handCount: player.hand.length,
          upCards: player.upCards, // Same as hand
          upCount: player.upCards.length,
          downCards: player.downCards.map(() => ({ value: '?', suit: '?', back: true })), // Obfuscate opponent down cards
          downCount: player.downCards.length,
          disconnected: player.disconnected,
        };
      }),
      pile: this.gameState.pile,
      discardCount: this.gameState.discard.length,
      deckCount: this.gameState.deck?.length || 0, // Handle null deck
      currentPlayerId: currentPlayerId,
      started: this.gameState.started,
      lastRealCard: this.gameState.lastRealCard
    };
    this.io.to('game-room').emit(STATE_UPDATE, stateForEmit);
    console.log(`[GameController] Pushed state. Current Turn: ${currentPlayerId || 'None'}. Game Started: ${this.gameState.started}`);
  }
}