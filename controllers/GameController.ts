import { Server, Socket } from 'socket.io';
import GameState, { Card, CardValue } from '../models/GameState.js';
import Player from '../models/Player.js';
import {
  normalizeCardValue,
  isSpecialCard,
  isTwoCard,
  isFiveCard,
  isTenCard,
} from '../utils/cardUtils.js';
import {
  JOIN_GAME,
  JOINED,
  PLAYER_JOINED,
  LOBBY,
  STATE_UPDATE,
  SPECIAL_CARD_EFFECT,
  REJOIN,
  START_GAME,
  NEXT_TURN,
  GAME_OVER,
  CARD_PLAYED,
  PILE_PICKED_UP,
  ERROR as ERROR_EVENT,
  PLAY_CARD,
  PICK_UP_PILE,
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
    socket.on(START_GAME, (opts: Pick<StartGameOptions, 'computerCount'> = {}) =>
      this.handleStartGame({ ...opts, socket })
    );
    socket.on(PLAY_CARD, (data: PlayData) => this.handlePlayCard(socket, data));
    socket.on(PICK_UP_PILE, () => this.handlePickUpPile(socket));
    socket.on(REJOIN, ({ roomId, playerId }: RejoinData) =>
      this.handleRejoin(socket, roomId, playerId)
    );
    socket.on('disconnect', () => this.handleDisconnect(socket));
    console.log(`[GameController] Listeners set up for socket: ${socket.id}`);
  }

  private getLobbyPlayerList(): { id: string; name: string; disconnected: boolean }[] {
    return Array.from(this.players.values()).map((p: Player) => ({
      id: p.id,
      name: p.name,
      disconnected: p.disconnected,
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

    console.log(
      `[GameController] Join attempt: id=${id}, name=${name}, numCPUs=${numCPUs}, socket=${socket.id}`
    );

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
    console.log(
      `[GameController] Player ${player.name} (${player.id}) joined with socket ${socket.id}. Players count: ${this.players.size}`
    );

    const currentLobbyPlayers = this.getLobbyPlayerList();
    this.io.to('game-room').emit(PLAYER_JOINED, currentLobbyPlayers);
    this.io.to('game-room').emit(LOBBY, {
      roomId: 'game-room',
      players: currentLobbyPlayers,
      maxPlayers: this.gameState.maxPlayers,
    });

    const autoStartEnabled = true;
    if (autoStartEnabled && this.players.size === 1 && numCPUs > 0 && !this.gameState.started) {
      console.log(
        `[GameController] Player ${id} is host. Auto-starting game with ${numCPUs} CPU players.`
      );
      this.handleStartGame({ computerCount: numCPUs, socket });
    } else {
      console.log(
        `[GameController] Not auto-starting. Total Players: ${this.players.size}, Requested CPUs: ${numCPUs}, GameStarted: ${this.gameState.started}`
      );
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

    const currentHumanPlayers = Array.from(this.players.values()).filter(
      (p: Player) => !p.isComputer
    ).length;
    if (currentHumanPlayers === 0 && computerCount < 2) {
      const errorMsg = 'At least two players (humans or CPUs) are required to start.';
      console.warn(`[GameController] Start game failed: ${errorMsg}`);
      if (opts.socket) opts.socket.emit(ERROR_EVENT, errorMsg);
      else this.io.to('game-room').emit(ERROR_EVENT, errorMsg);
      return;
    }
    if (currentHumanPlayers > 0 && currentHumanPlayers + computerCount < 2) {
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

    console.log(
      `[GameController] About to start game instance. Number of players in gameState: ${this.gameState.players.length}`
    );
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
        console.error(
          `[GameController] Critical error: Player ${id} not found in map during card dealing.`
        );
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
      socket.emit(ERROR_EVENT, 'Player not recognized.');
      return;
    }

    const player = this.players.get(playerId);
    if (!player) {
      socket.emit(ERROR_EVENT, 'Player data not found.');
      return;
    }

    if (this.gameState.players[this.gameState.currentPlayerIndex] !== playerId) {
      socket.emit(ERROR_EVENT, 'Not your turn.');
      return;
    }

    if (!cardIndices || cardIndices.length === 0) {
      socket.emit(ERROR_EVENT, 'No cards selected to play.');
      return;
    }

    const cardsToPlay: Card[] = [];
    let sourceZone: Card[] | undefined;
    if (zone === 'hand') sourceZone = player.hand;
    else if (zone === 'upCards') sourceZone = player.upCards;
    else if (zone === 'downCards') sourceZone = player.downCards;

    if (!sourceZone) {
      socket.emit(ERROR_EVENT, 'Invalid zone.');
      return;
    }

    for (const index of cardIndices) {
      if (index < 0 || index >= sourceZone.length) {
        socket.emit(ERROR_EVENT, 'Invalid card index.');
        return;
      }
      cardsToPlay.push(sourceZone[index]);
    }

    if (zone === 'downCards' && cardsToPlay.length > 1) {
      socket.emit(ERROR_EVENT, 'Can only play one down card.');
      return;
    }

    this.handlePlayCardInternal(player, cardIndices, zone, cardsToPlay);
  }

  private handlePlayCardInternal(
    player: Player,
    cardIndices: number[],
    zone: 'hand' | 'upCards' | 'downCards',
    cardsToPlay: Card[]
  ): void {
    if (this.gameState.players[this.gameState.currentPlayerIndex] !== player.id) {
      console.warn(`[GameController] Play attempt by ${player.name} (${player.id}) out of turn.`);
      return;
    }
    if (cardsToPlay.length === 0) {
      console.warn(`[GameController] Play attempt by ${player.name} (${player.id}) with no cards.`);
      return;
    }

    const isValid = this.gameState.isValidPlay(cardsToPlay);
    if (!isValid && zone !== 'downCards') {
      console.warn(`[GameController] ${player.name} (${player.id}) made an invalid play.`);
      if (player.isComputer) {
        this.handlePickUpPileInternal(player);
      }
      return;
    }

    if (zone === 'hand') {
      player.setHand(player.hand.filter((_, i) => !cardIndices.includes(i)));
    } else if (zone === 'upCards') {
      player.setUpCards(player.upCards.filter((_, i) => !cardIndices.includes(i)));
    } else if (zone === 'downCards') {
      player.playDownCard();
    }

    cardsToPlay.forEach((card) => {
      const normalizedValue = normalizeCardValue(card.value) as CardValue;
      const playedCardForPile: Card = { ...card, value: normalizedValue };
      this.gameState.addToPile(playedCardForPile);

      if (!isSpecialCard(normalizedValue) && !this.gameState.isFourOfAKindOnPile()) {
        this.gameState.lastRealCard = playedCardForPile;
      }
    });

    this.io.to('game-room').emit(CARD_PLAYED, { playerId: player.id, cards: cardsToPlay, zone });

    const lastPlayedCard = cardsToPlay[0];
    const lastPlayedNormalizedValue = normalizeCardValue(lastPlayedCard.value);

    let pileClearedBySpecial = false;
    if (isTwoCard(lastPlayedNormalizedValue)) {
      this.io
        .to('game-room')
        .emit(SPECIAL_CARD_EFFECT, { type: 'two', value: lastPlayedNormalizedValue });
      this.gameState.clearPile();
      pileClearedBySpecial = true;
    } else if (this.gameState.isFourOfAKindOnPile() || isTenCard(lastPlayedNormalizedValue)) {
      this.io.to('game-room').emit(SPECIAL_CARD_EFFECT, {
        type: isTenCard(lastPlayedNormalizedValue) ? 'ten' : 'four',
        value: lastPlayedNormalizedValue,
      });
      this.gameState.clearPile();
      pileClearedBySpecial = true;
      if (this.gameState.deck && this.gameState.deck.length > 0) {
        const nextCardFromDeck = this.gameState.deck.pop();
        if (nextCardFromDeck) {
          this.gameState.addToPile(nextCardFromDeck);
          if (!isSpecialCard(normalizeCardValue(nextCardFromDeck.value))) {
            this.gameState.lastRealCard = nextCardFromDeck;
          } else {
            this.gameState.lastRealCard = null;
          }
        }
      }
    } else if (isFiveCard(lastPlayedNormalizedValue)) {
      this.io
        .to('game-room')
        .emit(SPECIAL_CARD_EFFECT, { type: 'five', value: lastPlayedNormalizedValue });
      if (this.gameState.lastRealCard) {
        this.gameState.addToPile({ ...this.gameState.lastRealCard, copied: true });
      }
    }

    if (player.hasEmptyHand() && player.hasEmptyUp() && player.hasEmptyDown()) {
      this.io.to('game-room').emit(GAME_OVER, { winnerId: player.id, winnerName: player.name });
      console.log(`[GameController] Game Over! Winner: ${player.name} (${player.id})`);
      this.gameState.endGameInstance();
      this.pushState();
      return;
    }

    if (zone === 'hand' && this.gameState.deck) {
      while (player.hand.length < 3 && this.gameState.deck.length > 0) {
        const drawnCard = this.gameState.deck.pop();
        if (drawnCard) player.hand.push(drawnCard);
      }
      player.sortHand();
    }

    if (pileClearedBySpecial) {
      this.pushState();
      this.io.to('game-room').emit(NEXT_TURN, player.id);
      if (player.isComputer) {
        setTimeout(() => this.playComputerTurn(player), 1200);
      }
    } else {
      this.handleNextTurn();
    }
    this.pushState();
  }

  private handlePickUpPile(socket: Socket): void {
    const playerId = this.socketIdToPlayerId.get(socket.id);
    if (!playerId) return;

    const player = this.players.get(playerId);
    if (!player) {
      socket.emit(ERROR_EVENT, 'Player data not found.');
      return;
    }
    if (this.gameState.players[this.gameState.currentPlayerIndex] !== playerId) {
      socket.emit(ERROR_EVENT, 'Not your turn to pick up pile.');
      return;
    }
    this.handlePickUpPileInternal(player);
  }

  private handlePickUpPileInternal(player: Player): void {
    if (this.gameState.pile.length === 0) {
      console.warn(`[GameController] ${player.name} tried to pick up an empty pile.`);
      if (player.isComputer) this.handleNextTurn();
      return;
    }

    player.pickUpPile([...this.gameState.pile]);
    this.gameState.clearPile();

    this.io.to('game-room').emit(PILE_PICKED_UP, { playerId: player.id });
    console.log(`[GameController] Player ${player.id} picked up the pile.`);
    this.handleNextTurn();
  }

  private handleNextTurn(): void {
    if (!this.gameState.started) {
      console.log('[GameController] handleNextTurn called but game not started.');
      this.pushState();
      return;
    }
    this.gameState.advancePlayer();
    const nextPlayerId = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!nextPlayerId) {
      console.error('[GameController] Critical: Next player ID is undefined after advancing turn.');
      return;
    }
    this.io.to('game-room').emit(NEXT_TURN, nextPlayerId);
    console.log(`[GameController] Advanced turn to ${nextPlayerId}.`);
    this.pushState();

    const nextPlayerInstance = this.players.get(nextPlayerId);
    if (nextPlayerInstance?.isComputer) {
      setTimeout(() => this.playComputerTurn(nextPlayerInstance), 1200);
    }
  }

  private playComputerTurn(computerPlayer: Player): void {
    if (
      !this.gameState.started ||
      this.gameState.players[this.gameState.currentPlayerIndex] !== computerPlayer.id
    ) {
      return;
    }

    console.log(`[GameController] Computer ${computerPlayer.name} is taking its turn.`);

    const bestPlay =
      this.findBestPlayForComputer(computerPlayer, 'hand') ||
      this.findBestPlayForComputer(computerPlayer, 'upCards');

    if (bestPlay) {
      console.log(
        `[GameController] Computer ${computerPlayer.name} will play ${bestPlay.cards.map((c) => `${c.value}${c.suit ? c.suit[0] : ''}`).join(', ')} from ${bestPlay.zone}`
      );
      this.handlePlayCardInternal(computerPlayer, bestPlay.indices, bestPlay.zone, bestPlay.cards);
    } else if (computerPlayer.downCards.length > 0) {
      const downCardToPlay = computerPlayer.downCards[0];
      console.log(
        `[GameController] Computer ${computerPlayer.name} will play a down card: ${downCardToPlay.value}${downCardToPlay.suit ? downCardToPlay.suit[0] : ''}`
      );
      this.handlePlayCardInternal(computerPlayer, [0], 'downCards', [downCardToPlay]);
    } else {
      console.log(
        `[GameController] Computer ${computerPlayer.name} has no valid plays, picking up pile.`
      );
      this.handlePickUpPileInternal(computerPlayer);
    }
  }

  private findBestPlayForComputer(
    player: Player,
    zone: 'hand' | 'upCards'
  ): { cards: Card[]; indices: number[]; zone: 'hand' | 'upCards' } | null {
    const cardsInZone = zone === 'hand' ? player.hand : player.upCards;
    if (cardsInZone.length === 0) return null;

    for (let i = 0; i < cardsInZone.length; i++) {
      const firstCard = cardsInZone[i];
      const sameValueCards = [firstCard];
      const sameValueIndices = [i];
      for (let j = i + 1; j < cardsInZone.length; j++) {
        if (cardsInZone[j].value === firstCard.value) {
          sameValueCards.push(cardsInZone[j]);
          sameValueIndices.push(j);
        }
      }
      if (this.gameState.isValidPlay(sameValueCards)) {
        return { cards: sameValueCards, indices: sameValueIndices, zone };
      }
    }

    for (let i = 0; i < cardsInZone.length; i++) {
      const card = cardsInZone[i];
      if (this.gameState.isValidPlay([card])) {
        return { cards: [card], indices: [i], zone };
      }
    }
    return null;
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

      const activePlayers = Array.from(this.players.values()).filter(
        (p: Player) => !p.disconnected
      );
      if (activePlayers.length === 0 && this.gameState.started) {
        console.log('[GameController] All players disconnected. Ending game session.');
        this.gameState.endGameInstance();
      } else if (
        this.gameState.started &&
        playerId === this.gameState.players[this.gameState.currentPlayerIndex]
      ) {
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
      console.error('[GameController] pushState called but IO is not initialized.');
      return;
    }

    const currentPlayerId =
      this.gameState.started &&
      this.gameState.players.length > 0 &&
      this.gameState.currentPlayerIndex >= 0 &&
      this.gameState.currentPlayerIndex < this.gameState.players.length
        ? this.gameState.players[this.gameState.currentPlayerIndex]
        : undefined;

    console.log(
      `[pushState] Determined currentPlayerId: ${currentPlayerId} (type: ${typeof currentPlayerId})`
    );
    console.log(
      `[pushState] gameState.players: ${JSON.stringify(this.gameState.players)}, currentPlayerIndex: ${this.gameState.currentPlayerIndex}`
    );

    const stateForEmit: ClientState = {
      players: Array.from(this.players.values()).map((player: Player): ClientStatePlayer => {
        const isSelf =
          player.socketId && this.io.sockets.sockets.get(player.socketId) !== undefined;
        return {
          id: player.id,
          name: player.name,
          hand: isSelf || player.isComputer ? player.hand : undefined,
          handCount: player.hand.length,
          upCards: player.upCards,
          upCount: player.upCards.length,
          downCards: isSelf
            ? player.downCards
            : player.downCards.map(() => ({ value: '?', suit: '?', back: true }) as Card),
          downCount: player.downCards.length,
          disconnected: player.disconnected,
        };
      }),
      pile: this.gameState.pile,
      discardCount: this.gameState.discard.length,
      deckCount: this.gameState.deck?.length || 0,
      currentPlayerId: currentPlayerId,
      started: this.gameState.started,
      lastRealCard: this.gameState.lastRealCard,
    };

    console.log('--- GameController: pushState ---');
    console.log(
      '[pushState] Value of stateForEmit.currentPlayer before stringify:',
      stateForEmit.currentPlayerId
    );
    console.log('---------------------------------');

    this.players.forEach((playerInstance) => {
      if (playerInstance.socketId && !playerInstance.disconnected) {
        const targetSocket = this.io.sockets.sockets.get(playerInstance.socketId);
        if (targetSocket) {
          console.log(
            `[pushState] Emitting STATE_UPDATE to socket: ${targetSocket.id}, player: ${playerInstance.id}`
          );
          const personalizedState: ClientState = {
            ...stateForEmit,
            players: stateForEmit.players.map((p) => ({
              ...p,
              hand: p.id === playerInstance.id ? p.hand : undefined,
              downCards:
                p.id === playerInstance.id
                  ? p.downCards
                  : p.downCards?.map(() => ({ value: '?', suit: '?', back: true }) as Card),
            })),
          };
          targetSocket.emit(STATE_UPDATE, personalizedState);
        }
      }
    });
    if (this.players.size === 0 && !this.gameState.started) {
      this.io.to('game-room').emit(STATE_UPDATE, stateForEmit);
    }

    console.log(
      `[GameController] Pushed state. Current Turn: ${currentPlayerId || 'None'}. Game Started: ${this.gameState.started}`
    );
  }
}
