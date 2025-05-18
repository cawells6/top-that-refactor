import { Server, Socket } from 'socket.io';
import GameState, { Card, CardValue } from '../models/GameState.js';
import Player from '../models/Player.js';
import { normalizeCardValue, isSpecialCard, isTwoCard, isFiveCard, isTenCard, rank as getCardRank } from '../utils/cardUtils.js';
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
  ERROR as ERROR_EVENT,
  PLAY_CARD,
  PICK_UP_PILE
} from '../src/shared/events.js';

interface PlayerJoinData {
  id?: string;
  name?: string;
  numCPUs?: number;
}

interface StartGameOptions {
  computerCount?: number;
  socket?: Socket;
}

interface PlayData {
  cardIndices: number[];
  zone: 'hand' | 'upCards' | 'downCards';
}

interface RejoinData {
  roomId: string;
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
  downCards?: Card[];
  disconnected: boolean;
  error?: string;
}

interface ClientState {
  players: ClientStatePlayer[];
  pile: Card[];
  discardCount: number;
  deckCount: number;
  currentPlayerId: string | undefined;
  started: boolean;
  lastRealCard: Card | null;
}

export default class GameController {
  private io: Server;
  private gameState: GameState;
  private players: Map<string, Player>;
  private socketIdToPlayerId: Map<string, string>;

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
    if (roomId !== 'game-room') {
      socket.emit(ERROR_EVENT, 'Invalid room for rejoin.');
      return;
    }
    const player = this.players.get(playerId);
    if (player) {
      socket.join('game-room');
      player.socketId = socket.id;
      player.disconnected = false;
      this.socketIdToPlayerId.set(socket.id, playerId);

      console.log(`[GameController] Player ${playerId} reconnected with socket ${socket.id}.`);
      socket.emit(JOINED, { id: player.id, name: player.name, roomId: 'game-room' });
      this.pushState();
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
    let id = playerData.id || socket.id;
    let name = playerData.name || `Player-${id.substring(0, 4)}`;
    const numCPUs = playerData.numCPUs || 0;

    console.log(`[GameController] Join attempt: id=${id}, name=${name}, numCPUs=${numCPUs}, socket=${socket.id}`);

    if (this.players.has(id) && !this.players.get(id)?.disconnected) {
      socket.emit(ERROR_EVENT, `Player ID '${id}' is already active in a game.`);
      console.warn(`[GameController] Join rejected: Player ${id} already active.`);
      return;
    }
     if (this.players.has(id) && this.players.get(id)?.disconnected) {
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

    const autoStartEnabled = true;
    if (autoStartEnabled && this.players.size === 1 && numCPUs > 0 && !this.gameState.started) {
      console.log(`[GameController] Player ${id} is host. Auto-starting game with ${numCPUs} CPU players.`);
      this.handleStartGame({ computerCount: numCPUs, socket });
    } else {
      console.log(`[GameController] Not auto-starting. Total Players: ${this.players.size}, Requested CPUs: ${numCPUs}, GameStarted: ${this.gameState.started}`);
      this.pushState();
    }
  }

  private async handleStartGame(opts: StartGameOptions): Promise<void> {
    console.log('--- GameController: handleStartGame --- ENTERED ---');
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

    for (let i = 0; i < computerCount; i++) {
      if (this.players.size >= this.gameState.maxPlayers) {
        console.warn(`[GameController] Cannot add CPU player ${i + 1}, max players reached.`);
        break;
      }
      const cpuId = `COMPUTER_${i + 1}`;
      if (!this.players.has(cpuId)) {
        this.gameState.addPlayer(cpuId);
        const cpuPlayer = new Player(cpuId);
        cpuPlayer.name = `CPU ${i + 1}`;
        cpuPlayer.isComputer = true;
        this.players.set(cpuId, cpuPlayer);
        console.log(`[GameController] Added ${cpuPlayer.name}`);
      }
    }
    
    console.log(`[GameController] About to start game instance. Number of players in gameState: ${this.gameState.players.length}`);
    this.gameState.startGameInstance();
    console.log('[GameController] Game instance started and deck built.');

    const numPlayers = this.gameState.players.length;
    if (numPlayers < 2) {
        const errorMsg = `Not enough players to start (need at least 2, have ${numPlayers}).`;
        console.warn(`[GameController] Start game failed: ${errorMsg}`);
        if (opts.socket) opts.socket.emit(ERROR_EVENT, errorMsg);
        else this.io.to('game-room').emit(ERROR_EVENT, errorMsg);
        return;
    }

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

    this.gameState.started = true;
    this.gameState.currentPlayerIndex = 0;

    console.log('--- GameController: handleStartGame --- CARDS ASSIGNED ---');
    this.players.forEach((player: Player) => {
        console.log(`Player ${player.id} (${player.name}):`);
        console.log(`    Hand: ${player.hand.length}`);
        console.log(`    UpCards: ${player.upCards.length}`);
        console.log(`    DownCards: ${player.downCards.length}`);
    });
    console.log('------------------------------------');

    const firstPlayerId = this.gameState.players[this.gameState.currentPlayerIndex];
    console.log(`[GameController] Game started. First turn: ${firstPlayerId}`);

    this.pushState();
    this.io.to('game-room').emit(NEXT_TURN, firstPlayerId);
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

    const cardsToPlay: Card[] = [];
    let validPlay = true;

    for (const index of cardIndices) {
        let card: Card | undefined;
        if (zone === 'hand') card = player.hand[index];
        else if (zone === 'upCards') card = player.upCards[index];
        else if (zone === 'downCards') card = player.downCards[0];

        if (!card) {
            validPlay = false;
            break;
        }
        cardsToPlay.push(card);
    }

    if (!validPlay || (zone !== 'downCards' && cardsToPlay.length !== cardIndices.length) || (zone === 'downCards' && cardsToPlay.length !== 1) ) {
        socket.emit(ERROR_EVENT, "Invalid card selection.");
        return;
    }

    const isValid = this.gameState.isValidPlay(cardsToPlay);
    if (!isValid) {
        socket.emit(ERROR_EVENT, "Invalid play according to game rules.");
        return;
    }

    if (zone === 'hand') {
        player.setHand(player.hand.filter((_, i) => !cardIndices.includes(i)));
    } else if (zone === 'upCards') {
        player.setUpCards(player.upCards.filter((_, i) => !cardIndices.includes(i)));
    } else if (zone === 'downCards') {
        player.playDownCard();
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

    const lastPlayedCard = cardsToPlay[0];
    const lastPlayedNormalizedValue = normalizeCardValue(lastPlayedCard.value);

    let effectApplied = false;
    if (isTwoCard(lastPlayedNormalizedValue)) {
        this.io.to('game-room').emit(SPECIAL_CARD, { type: 'two', value: lastPlayedNormalizedValue });
        this.gameState.clearPile();
        effectApplied = true;
    } else if (this.gameState.isFourOfAKindOnPile() || isTenCard(lastPlayedNormalizedValue)) {
        this.io.to('game-room').emit(SPECIAL_CARD, { type: isTenCard(lastPlayedNormalizedValue) ? 'ten' : 'four', value: lastPlayedNormalizedValue });
        this.gameState.clearPile();
         if (this.gameState.deck && this.gameState.deck.length > 0) {
            const nextCardFromDeck = this.gameState.deck.pop();
            if (nextCardFromDeck) {
                this.gameState.addToPile(nextCardFromDeck);
                if(!isSpecialCard(normalizeCardValue(nextCardFromDeck.value))) {
                    this.gameState.lastRealCard = nextCardFromDeck;
                } else {
                    this.gameState.lastRealCard = null;
                }
            }
        }
        effectApplied = true;
    } else if (isFiveCard(lastPlayedNormalizedValue)) {
        this.io.to('game-room').emit(SPECIAL_CARD, { type: 'five', value: lastPlayedNormalizedValue });
        if (this.gameState.lastRealCard) {
            this.gameState.addToPile({ ...this.gameState.lastRealCard, copied: true });
        }
        effectApplied = true;
    }

    if (player.hasEmptyHand() && player.hasEmptyUp() && player.hasEmptyDown()) {
      this.io.to('game-room').emit(GAME_OVER, { winnerId: playerId, winnerName: player.name });
      console.log(`[GameController] Game Over! Winner: ${player.name} (${playerId})`);
      this.gameState.endGameInstance();
    } else {
      if (zone === 'hand' && this.gameState.deck) {
          while(player.hand.length < 3 && this.gameState.deck.length > 0) {
              const drawnCard = this.gameState.deck.pop();
              if (drawnCard) player.hand.push(drawnCard);
          }
          player.sortHand();
      }
      if (!(isTenCard(lastPlayedNormalizedValue) || this.gameState.isFourOfAKindOnPile())) {
        this.handleNextTurn();
      } else {
        this.pushState();
        if (this.gameState.pile.length === 0) {
             this.io.to('game-room').emit(NEXT_TURN, playerId);
        } else {
            const currentPlayerInstance = this.players.get(playerId);
            if (currentPlayerInstance?.isComputer) {
                setTimeout(() => this.playComputerTurn(playerId), 1200);
            }
        }
      }
    }
    this.pushState();
  }

  private handlePickUpPile(socket: Socket): void {
    const playerId = this.socketIdToPlayerId.get(socket.id);
    if (!playerId) return;

    const player = this.players.get(playerId);
    if (!player) {
      socket.emit(ERROR_EVENT, "Player data not found or not your turn to pick up.");
      return;
    }

    if (this.gameState.pile.length === 0) {
        socket.emit(ERROR_EVENT, "Pile is empty, cannot pick up.");
        return;
    }

    player.pickUpPile([...this.gameState.pile]);
    this.gameState.clearPile();

    this.io.to('game-room').emit(PILE_PICKED_UP, { playerId });
    console.log(`[GameController] Player ${playerId} picked up the pile.`);
    this.gameState.advancePlayer();
    const nextPlayerId = this.gameState.players[this.gameState.currentPlayerIndex];
    this.io.to('game-room').emit(NEXT_TURN, nextPlayerId);
    console.log(`[GameController] Advanced turn to ${nextPlayerId} after pile pick up.`);
    this.pushState();

    const nextPlayerInstance = this.players.get(nextPlayerId);
    if (nextPlayerInstance?.isComputer) {
        setTimeout(() => this.playComputerTurn(nextPlayerId), 1200);
    }
  }

  private handleNextTurn(): void {
    if (!this.gameState.started) {
        console.log("[GameController] handleNextTurn called but game not started.");
        this.pushState();
        return;
    }
    this.gameState.advancePlayer();
    const nextPlayerId = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!nextPlayerId) {
      console.error("[GameController] Critical: Next player ID is undefined after advancing turn.");
      return;
    }
    this.io.to('game-room').emit(NEXT_TURN, nextPlayerId);
    console.log(`[GameController] Advanced turn to ${nextPlayerId}.`);
    this.pushState();

    const nextPlayerInstance = this.players.get(nextPlayerId);
    if (nextPlayerInstance?.isComputer) {
        setTimeout(() => this.playComputerTurn(nextPlayerId), 1200);
    }
  }

  private playComputerTurn(cpuPlayerId: string): void {
    if (!this.gameState.started || this.gameState.players[this.gameState.currentPlayerIndex] !== cpuPlayerId) {
        return;
    }
    const cpu = this.players.get(cpuPlayerId);
    if (!cpu || !cpu.isComputer) return;

    console.log(`[GameController] CPU ${cpuPlayerId} (${cpu.name}) is taking its turn.`);

    let playedACard = false;
    let cardToPlayInfo: { card: Card, index: number, zone: 'hand' | 'upCards' | 'downCards' } | null = null;

    if (cpu.hand.length > 0) {
        for (let i = 0; i < cpu.hand.length; i++) {
            if (this.gameState.isValidPlay([cpu.hand[i]])) {
                cardToPlayInfo = { card: cpu.hand[i], index: i, zone: 'hand' };
                break;
            }
        }
    }
    if (!cardToPlayInfo && cpu.hand.length === 0 && cpu.upCards.length > 0) {
        for (let i = 0; i < cpu.upCards.length; i++) {
            if (this.gameState.isValidPlay([cpu.upCards[i]])) {
                cardToPlayInfo = { card: cpu.upCards[i], index: i, zone: 'upCards' };
                break;
            }
        }
    }
    if (!cardToPlayInfo && cpu.hand.length === 0 && cpu.upCards.length === 0 && cpu.downCards.length > 0) {
        cardToPlayInfo = { card: cpu.downCards[0], index: 0, zone: 'downCards' };
    }

    if (cardToPlayInfo) {
        console.log(`[AI] ${cpu.name} attempts to play ${cardToPlayInfo.card.value} of ${cardToPlayInfo.card.suit} from ${cardToPlayInfo.zone}.`);
        
        const { card, index, zone } = cardToPlayInfo;
        let playedCard: Card | undefined;

        if (zone === 'hand') playedCard = cpu.playFromHand(index);
        else if (zone === 'upCards') playedCard = cpu.playUpCard(index);
        else if (zone === 'downCards') playedCard = cpu.playDownCard();

        if (playedCard) {
            if (zone === 'downCards' && !this.gameState.isValidPlay([playedCard])) {
                console.log(`[AI] ${cpu.name} played an invalid down card: ${playedCard.value}. Picking up pile.`);
                cpu.hand.push(playedCard);
                if (this.gameState.pile.length > 0) {
                    cpu.pickUpPile([...this.gameState.pile]);
                    this.gameState.clearPile();
                    this.io.to('game-room').emit(PILE_PICKED_UP, { playerId: cpu.id });
                }
                playedACard = false;
            } else {
                this.gameState.addToPile(playedCard);
                if (!isSpecialCard(normalizeCardValue(playedCard.value)) && !this.gameState.isFourOfAKindOnPile()) {
                    this.gameState.lastRealCard = playedCard;
                }
                this.io.to('game-room').emit(CARD_PLAYED, { playerId: cpu.id, cards: [playedCard], zone });
                playedACard = true;

                const normalizedValue = normalizeCardValue(playedCard.value);
                if (isTwoCard(normalizedValue)) {
                    this.io.to('game-room').emit(SPECIAL_CARD, { type: 'two', value: normalizedValue });
                    this.gameState.clearPile();
                } else if (this.gameState.isFourOfAKindOnPile() || isTenCard(normalizedValue)) {
                     this.io.to('game-room').emit(SPECIAL_CARD, { type: isTenCard(normalizedValue) ? 'ten' : 'four', value: normalizedValue });
                     this.gameState.clearPile();
                     if (this.gameState.deck && this.gameState.deck.length > 0) {
                        const nextCard = this.gameState.deck.pop();
                        if (nextCard) {
                            this.gameState.addToPile(nextCard);
                            if(!isSpecialCard(normalizeCardValue(nextCard.value))) this.gameState.lastRealCard = nextCard;
                            else this.gameState.lastRealCard = null;
                        }
                    }
                } else if (isFiveCard(normalizedValue)) {
                    this.io.to('game-room').emit(SPECIAL_CARD, { type: 'five', value: normalizedValue });
                    if (this.gameState.lastRealCard) this.gameState.addToPile({ ...this.gameState.lastRealCard, copied: true });
                }
            }
        }
    }

    if (playedACard && cpu.hand.length < 3 && cpu.isComputer && this.gameState.deck && this.gameState.deck.length > 0) {
        while(cpu.hand.length < 3 && this.gameState.deck.length > 0) {
            const drawn = this.gameState.deck.pop();
            if(drawn) cpu.hand.push(drawn);
        }
        cpu.sortHand();
    } else if (!playedACard) {
        console.log(`[AI] ${cpu.name} has no valid play or played invalid down card, picking up pile.`);
        if (this.gameState.pile.length > 0) {
            cpu.pickUpPile([...this.gameState.pile]);
            this.gameState.clearPile();
            this.io.to('game-room').emit(PILE_PICKED_UP, { playerId: cpu.id });
        } else {
             console.log(`[AI] ${cpu.name} tried to pick up an empty pile (or pile was cleared by invalid down play). Passing turn.`);
        }
    }
    
    if (cpu.hasEmptyHand() && cpu.hasEmptyUp() && cpu.hasEmptyDown()) {
      this.io.to('game-room').emit(GAME_OVER, { winnerId: cpu.id, winnerName: cpu.name });
      this.gameState.endGameInstance();
    } else {
        const lastPlayedValue = cardToPlayInfo && playedACard ? normalizeCardValue(cardToPlayInfo.card.value) : null;
        if (!(isTenCard(lastPlayedValue) || (this.gameState.isFourOfAKindOnPile() && playedACard))) {
            this.handleNextTurn();
        } else {
            this.pushState();
             if (this.gameState.pile.length === 0) {
                 this.io.to('game-room').emit(NEXT_TURN, cpu.id);
                 setTimeout(() => this.playComputerTurn(cpu.id), 1200);
            }
        }
    }
    if (!playedACard || (isTenCard(cardToPlayInfo?.card.value) || this.gameState.isFourOfAKindOnPile())) {
        this.pushState();
    }
  }

  private handleDisconnect(socket: Socket): void {
    const playerId = this.socketIdToPlayerId.get(socket.id);
    if (playerId) {
      const player = this.players.get(playerId);
      if (player) {
        player.disconnected = true;
        player.socketId = undefined;
        console.log(`[GameController] Player ${playerId} (${player.name}) marked as disconnected.`);
      }
      this.socketIdToPlayerId.delete(socket.id);

      const activePlayers = Array.from(this.players.values()).filter((p: Player) => !p.disconnected);
      if (activePlayers.length === 0 && this.gameState.started) {
        console.log("[GameController] All players disconnected. Ending game session.");
        this.gameState.endGameInstance();
      } else if (this.gameState.started && playerId === this.gameState.players[this.gameState.currentPlayerIndex]) {
        console.log(`[GameController] Current player ${playerId} disconnected. Advancing turn.`);
        this.handleNextTurn();
        return;
      }
    } else {
      console.log(`[GameController] Socket ${socket.id} disconnected, but no player found for it.`);
    }
    this.pushState();
    this.io.to('game-room').emit(LOBBY, {
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

    const currentPlayerId = this.gameState.started && this.gameState.players.length > 0 && this.gameState.currentPlayerIndex >= 0 && this.gameState.currentPlayerIndex < this.gameState.players.length
        ? this.gameState.players[this.gameState.currentPlayerIndex]
        : undefined;
    
    console.log(`[pushState] Determined currentPlayerId: ${currentPlayerId} (type: ${typeof currentPlayerId})`);
    console.log(`[pushState] gameState.players: ${JSON.stringify(this.gameState.players)}, currentPlayerIndex: ${this.gameState.currentPlayerIndex}`);

    const stateForEmit: ClientState = {
      players: Array.from(this.players.values()).map((player: Player): ClientStatePlayer => {
        const isSelf = player.socketId && this.io.sockets.sockets.get(player.socketId) !== undefined;
        return {
          id: player.id,
          name: player.name,
          hand: isSelf || player.isComputer ? player.hand : undefined,
          handCount: player.hand.length,
          upCards: player.upCards, 
          upCount: player.upCards.length,
          downCards: isSelf ? player.downCards : player.downCards.map(() => ({ value: '?', suit: '?', back: true } as Card)),
          downCount: player.downCards.length,
          disconnected: player.disconnected,
        };
      }),
      pile: this.gameState.pile,
      discardCount: this.gameState.discard.length,
      deckCount: this.gameState.deck?.length || 0,
      currentPlayerId: currentPlayerId,
      started: this.gameState.started,
      lastRealCard: this.gameState.lastRealCard
    };
    
    console.log("--- GameController: pushState ---");
    console.log("[pushState] Value of stateForEmit.currentPlayer before stringify:", stateForEmit.currentPlayerId);
    console.log("---------------------------------");

    this.players.forEach(playerInstance => {
        if(playerInstance.socketId && !playerInstance.disconnected) {
            const targetSocket = this.io.sockets.sockets.get(playerInstance.socketId);
            if (targetSocket) {
                const personalizedState: ClientState = {
                    ...stateForEmit,
                    players: stateForEmit.players.map(p => ({
                        ...p,
                        hand: p.id === playerInstance.id ? p.hand : undefined,
                        downCards: p.id === playerInstance.id ? p.downCards : p.downCards?.map(() => ({ value: '?', suit: '?', back: true } as Card))
                    }))
                };
                targetSocket.emit(STATE_UPDATE, personalizedState);
            }
        }
    });
     if (this.players.size === 0 && !this.gameState.started) {
        this.io.to('game-room').emit(STATE_UPDATE, stateForEmit);
    }

    console.log(`[GameController] Pushed state. Current Turn: ${currentPlayerId || 'None'}. Game Started: ${this.gameState.started}`);
  }
}