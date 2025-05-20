import { Server, Socket } from 'socket.io';

import GameState, { Card, CardValue } from '../models/GameState.js';
import Player from '../models/Player.js';
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
import {
  normalizeCardValue,
  isSpecialCard,
  isTwoCard,
  isFiveCard,
  isTenCard,
} from '../utils/cardUtils.js';

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

    if (this.players.has(id) && !this.players.get(id)?.disconnected) {
      socket.emit(ERROR_EVENT, `Player ID '${id}' is already active in a game.`);
      return;
    }
    if (this.players.has(id) && this.players.get(id)?.disconnected) {
      this.handleRejoin(socket, 'game-room', id);
      return;
    }

    if (this.gameState.started) {
      socket.emit(ERROR_EVENT, 'Game has already started. Cannot join.');
      return;
    }

    if (this.players.size >= this.gameState.maxPlayers) {
      socket.emit(ERROR_EVENT, 'Game room is full.');
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

    const currentLobbyPlayers = this.getLobbyPlayerList();
    this.io.to('game-room').emit(PLAYER_JOINED, currentLobbyPlayers);
    this.io.to('game-room').emit(LOBBY, {
      roomId: 'game-room',
      players: currentLobbyPlayers,
      maxPlayers: this.gameState.maxPlayers,
    });

    const autoStartEnabled = true;
    if (autoStartEnabled && this.players.size === 1 && numCPUs > 0 && !this.gameState.started) {
      this.handleStartGame({ computerCount: numCPUs, socket });
    } else {
      this.pushState();
    }
  }

  private async handleStartGame(opts: StartGameOptions): Promise<void> {
    const computerCount = opts.computerCount || 0;

    if (this.gameState.started) {
      const errorMsg = 'Game has already started.';
      if (opts.socket) opts.socket.emit(ERROR_EVENT, errorMsg);
      else this.io.to('game-room').emit(ERROR_EVENT, errorMsg);
      return;
    }

    const currentHumanPlayers = Array.from(this.players.values()).filter(
      (p: Player) => !p.isComputer
    ).length;
    if (currentHumanPlayers === 0 && computerCount < 2) {
      const errorMsg = 'At least two players (humans or CPUs) are required to start.';
      if (opts.socket) opts.socket.emit(ERROR_EVENT, errorMsg);
      else this.io.to('game-room').emit(ERROR_EVENT, errorMsg);
      return;
    }
    if (currentHumanPlayers > 0 && currentHumanPlayers + computerCount < 2) {
      const errorMsg = 'At least two total players (humans + CPUs) are required.';
      if (opts.socket) opts.socket.emit(ERROR_EVENT, errorMsg);
      else this.io.to('game-room').emit(ERROR_EVENT, errorMsg);
      return;
    }

    for (let i = 0; i < computerCount; i++) {
      if (this.players.size >= this.gameState.maxPlayers) {
        break;
      }
      const cpuId = `COMPUTER_${i + 1}`;
      if (!this.players.has(cpuId)) {
        this.gameState.addPlayer(cpuId);
        const cpuPlayer = new Player(cpuId);
        cpuPlayer.name = `CPU ${i + 1}`;
        cpuPlayer.isComputer = true;
        this.players.set(cpuId, cpuPlayer);
      }
    }

    this.gameState.startGameInstance();

    const numPlayers = this.gameState.players.length;
    if (numPlayers < 2) {
      const errorMsg = `Not enough players to start (need at least 2, have ${numPlayers}).`;
      if (opts.socket) opts.socket.emit(ERROR_EVENT, errorMsg);
      else this.io.to('game-room').emit(ERROR_EVENT, errorMsg);
      return;
    }

    const { hands, upCards, downCards } = this.gameState.dealCards(numPlayers);

    this.gameState.players.forEach((id: string, idx: number) => {
      const player = this.players.get(id);
      if (!player) {
        return;
      }
      player.setHand(hands[idx] || []);
      player.setUpCards(upCards[idx] || []);
      player.setDownCards(downCards[idx] || []);
    });

    this.gameState.started = true;
    this.gameState.currentPlayerIndex = 0;

    const firstPlayerId = this.gameState.players[this.gameState.currentPlayerIndex];

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
      return;
    }
    if (cardsToPlay.length === 0) {
      return;
    }

    const isValid = this.gameState.isValidPlay(cardsToPlay);
    if (!isValid && zone !== 'downCards') {
      if (player.isComputer) {
        this.handlePickUpPileInternal(player);
      }
      return;
    }

    if (zone === 'hand') {
      player.setHand(player.hand.filter((_: Card, i: number) => !cardIndices.includes(i)));
    } else if (zone === 'upCards') {
      player.setUpCards(player.upCards.filter((_: Card, i: number) => !cardIndices.includes(i)));
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
      if (player.isComputer) this.handleNextTurn();
      return;
    }

    player.pickUpPile([...this.gameState.pile]);
    this.gameState.clearPile();

    this.io.to('game-room').emit(PILE_PICKED_UP, { playerId: player.id });
    this.handleNextTurn();
  }

  private handleNextTurn(): void {
    if (!this.gameState.started) {
      this.pushState();
      return;
    }
    this.gameState.advancePlayer();
    const nextPlayerId = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!nextPlayerId) {
      return;
    }
    this.io.to('game-room').emit(NEXT_TURN, nextPlayerId);
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

    const bestPlay =
      this.findBestPlayForComputer(computerPlayer, 'hand') ||
      this.findBestPlayForComputer(computerPlayer, 'upCards');

    if (bestPlay) {
      this.handlePlayCardInternal(computerPlayer, bestPlay.indices, bestPlay.zone, bestPlay.cards);
    } else if (computerPlayer.downCards.length > 0) {
      const downCardToPlay = computerPlayer.downCards[0];
      this.handlePlayCardInternal(computerPlayer, [0], 'downCards', [downCardToPlay]);
    } else {
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
      }
      this.socketIdToPlayerId.delete(socket.id);

      const activePlayers = Array.from(this.players.values()).filter(
        (p: Player) => !p.disconnected
      );
      if (activePlayers.length === 0 && this.gameState.started) {
        this.gameState.endGameInstance();
      } else if (
        this.gameState.started &&
        playerId === this.gameState.players[this.gameState.currentPlayerIndex]
      ) {
        this.handleNextTurn();
        return;
      }
    }
    this.pushState();
    this.io.to('game-room').emit(LOBBY, {
      roomId: 'game-room',
      players: this.getLobbyPlayerList(),
      maxPlayers: this.gameState.maxPlayers,
    });
  }

  private pushState(): void {
    const currentPlayerId =
      this.gameState.started &&
      this.gameState.players.length > 0 &&
      this.gameState.currentPlayerIndex >= 0 &&
      this.gameState.currentPlayerIndex < this.gameState.players.length
        ? this.gameState.players[this.gameState.currentPlayerIndex]
        : undefined;

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

    this.players.forEach((playerInstance) => {
      if (playerInstance.socketId && !playerInstance.disconnected) {
        const targetSocket = this.io.sockets.sockets.get(playerInstance.socketId);
        if (targetSocket) {
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
  }
}
