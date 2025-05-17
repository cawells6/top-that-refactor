// controllers/GameController.ts

import { Server as SocketIOServer, Socket } from 'socket.io';
import GameState from '../models/GameState'; // Removed .js
import Player from '../models/Player'; // Removed .js
import { normalizeCardValue, isSpecialCard, isTwoCard, isFiveCard, isTenCard, isFourOfAKind } from '../utils/cardUtils'; // Removed .js
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
} from '../src/shared/events'; // Removed .js

// Define Card type based on usage in GameState and cardUtils
interface Card {
  value: string | number; 
  suit?: string;
}

interface PlayerData {
  id: string;
  name?: string;
  numCPUs?: number;
}

interface PlayData {
  playerId: string;
  cardIndex: number;
  zone: 'hand' | 'up' | 'down';
}

interface RejoinData {
  roomId: string;
  playerId: string;
}

interface StartGameOptions {
  computerCount?: number;
  socket?: Socket; 
}

interface SpecialCardEmitData {
  type: 'two' | 'five' | 'ten' | 'four';
}

interface CardPlayedEmitData {
  playerId: string;
  card: Card;
}

interface LobbyEmitData {
  roomId: string;
  players: { id: string; name: string }[];
  maxPlayers: number;
}

interface JoinedEmitData {
  id: string;
  roomId: string;
}

interface StateForEmitPlayer {
  id: string;
  name: string;
  hand?: Card[];
  upCards?: Card[];
  downCards?: Card[];
  handCount?: number;
  upCount?: number;
  downCount?: number;
  error?: string;
}

interface StateForEmit {
  players: StateForEmitPlayer[];
  pile: Card[];
  discardCount: number;
  deckCount: number;
  currentPlayer: string | undefined;
  started: boolean;
}

export default class GameController {
  private io: SocketIOServer;
  private gameState: GameState;
  private players: Map<string, Player>;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.gameState = new GameState();
    this.players = new Map<string, Player>();

    this.io.on('connection', (socket: Socket) => this.setupListeners(socket));
  }

  private setupListeners(socket: Socket): void {
    socket.on(JOIN_GAME, (playerData: PlayerData | string) => this.handleJoin(socket, playerData));
    socket.on(START_GAME, (opts: StartGameOptions) => this.handleStartGame(opts));
    socket.on('play-card', (data: PlayData) => this.handlePlay(socket, data));
    socket.on(NEXT_TURN, () => this.handleNextTurn());
    socket.on(REJOIN, ({ roomId, playerId }: RejoinData) => {
      if (roomId !== 'game-room' || !this.players.has(playerId)) {
        socket.emit('err', 'Invalid room or player for rejoin');
        return;
      }
      socket.join(roomId);
      const player = this.players.get(playerId);
      if (!player) {
        socket.emit('err', 'Player not found during rejoin');
        return;
      }
      const state: Partial<StateForEmit> = {
        players: this.gameState.players.map(id => {
          const p = this.players.get(id);
          if (!p) return { id, name: id, handCount: 0, upCount: 0, downCount: 0, error: 'Player data missing' } as StateForEmitPlayer;
          return {
            id,
            name: p.name || id,
            handCount: p.hand.length,
            upCount: p.upCards.length,
            downCount: p.downCards.length,
          } as StateForEmitPlayer;
        }),
        pile: this.gameState.pile as Card[], // Added type assertion
        discardCount: this.gameState.discard.length,
        deckCount: this.gameState.deck.length,
        currentPlayer: this.gameState.players[this.gameState.currentPlayerIndex],
        started: !!(this.gameState.deck && this.gameState.deck.length > 0 && this.gameState.players.length > 0)
      };
      socket.emit(STATE_UPDATE, state as StateForEmit);
    });
  }

  private handleJoin(socket: Socket, playerData: PlayerData | string): void {
    let id: string;
    let name: string;
    let numCPUs: number = 0;

    if (typeof playerData === 'object' && playerData !== null) {
      id = typeof playerData.id === 'string' ? playerData.id : (typeof playerData.name === 'string' ? playerData.name : '');
      name = typeof playerData.name === 'string' ? playerData.name : id;
      numCPUs = typeof playerData.numCPUs === 'number' ? playerData.numCPUs : 0;
    } else if (typeof playerData === 'string') {
      id = playerData;
      name = playerData;
    } else {
      socket.emit('err', 'Invalid player identifier type provided.');
      console.error('[GameController] Join attempt with invalid identifier type:', playerData);
      return;
    }

    if (id.trim() === '') {
      socket.emit('err', 'Invalid player identifier provided (empty).');
      console.error('[GameController] Join attempt with empty identifier:', playerData);
      return;
    }
    id = id.trim();
    name = name.trim() || id;

    if (this.players.has(id)) {
      socket.emit('err', `Player ID '${id}' already joined.`);
      return;
    }

    this.gameState.addPlayer(id);
    const player = new Player(id);
    player.name = name;
    this.players.set(id, player);

    socket.join('game-room');
    const joinedEmitData: JoinedEmitData = { id: id, roomId: 'game-room' };
    socket.emit(JOINED, joinedEmitData);

    const lobbyPlayerList = this.gameState.players.map(pId => {
      const p = this.players.get(pId);
      return { id: pId, name: p ? (p.name || pId) : pId };
    });

    this.io.to('game-room').emit(PLAYER_JOINED, lobbyPlayerList);
    const lobbyEmitData: LobbyEmitData = {
      roomId: 'game-room',
      players: lobbyPlayerList,
      maxPlayers: this.gameState.maxPlayers
    };
    this.io.to('game-room').emit(LOBBY, lobbyEmitData);

    if (!this.gameState.deck && this.gameState.players.length === 1) {
      console.log(`[GameController] Player ${id} is host. Auto-starting game with ${numCPUs} CPU players.`);
      this.handleStartGame({ computerCount: numCPUs, socket: socket });
    } else {
      console.log(`[GameController] Not auto-starting. Deck exists: ${!!this.gameState.deck}, Player count: ${this.gameState.players.length}`);
      this.pushState();
    }
  }

  private async handleStartGame(opts: StartGameOptions = {}): Promise<void> {
    console.log('--- GameController: handleStartGame --- ENTERED ---');
    const computerCount: number = typeof opts.computerCount === 'number' ? opts.computerCount : 0;

    if (this.players.size + computerCount > this.gameState.maxPlayers) {
      const errorMsg = 'Cannot start game: Total players would exceed the maximum of ' + this.gameState.maxPlayers;
      if (opts.socket) {
        opts.socket.emit('err', errorMsg);
      } else {
        this.io.to('game-room').emit('err', errorMsg);
      }
      return;
    }

    for (let i = 0; i < computerCount; i++) {
      const id = `COMPUTER_${i + 1}`;
      if (!this.players.has(id)) {
        this.gameState.addPlayer(id);
        const cpuPlayer = new Player(id);
        cpuPlayer.name = id;
        this.players.set(id, cpuPlayer);
      }
    }

    console.log('[GameController] About to build deck. Number of players in gameState:', this.gameState.players.length);
    this.gameState.buildDeck();
    const numPlayers = this.gameState.players.length;
    if (numPlayers === 0) {
      console.error('[GameController] No players to deal cards to in handleStartGame.');
      return;
    }
    const { hands, upCards, downCards } = this.gameState.dealCards(numPlayers);

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

    console.log('--- GameController: handleStartGame --- CARDS ASSIGNED ---');
    this.players.forEach((player, id) => {
      console.log(`Player ${id} (${player.name}):`);
      console.log('  Hand:', player.hand ? player.hand.length : 'undefined');
      console.log('  UpCards:', player.upCards ? player.upCards.length : 'undefined');
      console.log('  DownCards:', player.downCards ? player.downCards.length : 'undefined');
    });
    console.log('------------------------------------');

    this.pushState();
    const firstPlayerId: string | undefined = this.gameState.players[0];
    if (!firstPlayerId) {
      console.error('[GameController] No first player to start the turn.');
      return;
    }
    console.log(`[GameController] Emitting NEXT_TURN for player: ${firstPlayerId}`);
    this.io.to('game-room').emit(NEXT_TURN, firstPlayerId);
  }

  private handlePlay(socket: Socket, { playerId, cardIndex, zone }: PlayData): void {
    const player = this.players.get(playerId);
    if (!player) return;

    let card: Card | undefined;
    switch (zone) {
      case 'hand': card = player.playFromHand(cardIndex) as Card | undefined; break;
      case 'up': card = player.playUpCard(cardIndex) as Card | undefined; break;
      case 'down': card = player.playDownCard() as Card | undefined; break;
      default: return;
    }

    if (!card) {
      console.error(`[GameController] Invalid play by ${playerId} from ${zone} at index ${cardIndex}`);
      socket.emit('err', 'Invalid play attempt.');
      return;
    }
    const normalizedValue: string | null | undefined = normalizeCardValue(card.value as string | number);

    if (normalizedValue === null || normalizedValue === undefined) {
        console.error(`[GameController] Card value normalization failed for card:`, card);
        socket.emit('err', 'Invalid card value after normalization.');
        return;
    }
    const playedCard: Card = { ...card, value: normalizedValue };

    this.gameState.addToPile(playedCard as any); 
    const cardPlayedEmitData: CardPlayedEmitData = { playerId, card: playedCard };
    this.io.to('game-room').emit('card-played', cardPlayedEmitData);

    const isFour = this.gameState.isFourOfAKindOnPile();
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const DELAY_SPECIAL = 1200;

    (async () => {
      let specialType: SpecialCardEmitData['type'] | null = null;

      if (isTwoCard(normalizedValue)) specialType = 'two';
      else if (isTenCard(normalizedValue)) specialType = 'ten';
      else if (isFour) specialType = 'four';
      else if (isFiveCard(normalizedValue)) specialType = 'five';

      if (specialType) {
        this.io.to('game-room').emit(SPECIAL_CARD, { type: specialType } as SpecialCardEmitData);
        await delay(DELAY_SPECIAL);

        if (specialType === 'two' || specialType === 'ten' || specialType === 'four') {
          this.gameState.clearPile();
          if ((specialType === 'ten' || specialType === 'four') && this.gameState.deck && this.gameState.deck.length > 0) {
            const newCardFromDeck = this.gameState.deck.pop();
            if (newCardFromDeck) {
                const normalizedNewCardValue = normalizeCardValue(newCardFromDeck.value as string | number);
                if(normalizedNewCardValue === null || normalizedNewCardValue === undefined) {
                    console.error("Normalized new card value from deck is null/undefined");
                } else {
                    const cardForPile: Card = { ...newCardFromDeck, value: normalizedNewCardValue };
                    this.gameState.addToPile(cardForPile as any);
                    if (!isSpecialCard(normalizedNewCardValue)) {
                        this.gameState.lastRealCard = cardForPile as any;
                    } else {
                        this.gameState.lastRealCard = null;
                    }
                }
            }
          }
        } else if (specialType === 'five') {
          if (this.gameState.lastRealCard) {
            const copiedCardValue = normalizeCardValue(this.gameState.lastRealCard.value as string | number);
            if (copiedCardValue !== null && copiedCardValue !== undefined) {
                const copiedCard = { ...this.gameState.lastRealCard, value: copiedCardValue };
                this.gameState.addToPile(copiedCard as any, { isCopy: true });
            } else {
                console.error("[GameController] Failed to normalize lastRealCard value for copying with Five.");
            }
          }
        }
        this.pushState();
        this.handleNextTurn();
        return;
      }

      this.gameState.lastRealCard = playedCard as any;
      this.pushState();
      this.handleNextTurn();
    })();
  }

  private handleNextTurn(): void {
    this.gameState.advancePlayer();
    const nextPlayerId: string | undefined = this.gameState.players[this.gameState.currentPlayerIndex];
    if (nextPlayerId !== undefined) {
        this.io.to('game-room').emit(NEXT_TURN, nextPlayerId);
    } else {
        console.error("[GameController] Next player ID is undefined. Cannot emit NEXT_TURN.");
    }
  }

  private pushState(): void {
    if (this.gameState.players.length === 0 && this.gameState.currentPlayerIndex === 0) {
      console.log('[pushState] Attempting to push state with no players, currentPlayerId will be undefined.');
    }
    const currentPlayerId: string | undefined = this.gameState.players[this.gameState.currentPlayerIndex];

    console.log(`[pushState] Determined currentPlayerId: ${currentPlayerId} (type: ${typeof currentPlayerId})`);
    console.log(`[pushState] gameState.players: ${JSON.stringify(this.gameState.players)}, currentPlayerIndex: ${this.gameState.currentPlayerIndex}`);

    if (currentPlayerId === undefined && this.gameState.players.length > 0) {
      console.warn(`[pushState] currentPlayerId is undefined. gameState.players: ${JSON.stringify(this.gameState.players)}, currentPlayerIndex: ${this.gameState.currentPlayerIndex}`);
    }

    const stateForEmit: StateForEmit = {
      players: this.gameState.players.map((id): StateForEmitPlayer => {
        const player = this.players.get(id);
        if (!player) {
          console.error(`[pushState] Player object not found for id: ${id} in this.players map.`);
          return { id, name: String(id), handCount: 0, upCount: 0, downCount: 0, error: 'Player data missing server-side' };
        }
        const playerName = String(player.name || id);
        if (id === currentPlayerId) {
          return {
            id,
            hand: (player.hand || []) as Card[],
            upCards: (player.upCards || []) as Card[],
            downCards: (player.downCards || []) as Card[],
            name: playerName
          };
        } else {
          return {
            id,
            handCount: player.hand ? player.hand.length : 0,
            upCount: player.upCards ? player.upCards.length : 0,
            downCount: player.downCards ? player.downCards.length : 0,
            name: playerName
          };
        }
      }),
      pile: (this.gameState.pile || []) as Card[],
      discardCount: this.gameState.discard ? this.gameState.discard.length : 0,
      deckCount: this.gameState.deck ? this.gameState.deck.length : 0,
      currentPlayer: currentPlayerId,
      started: !!(this.gameState.deck && this.gameState.deck.length > 0 && this.gameState.players.length > 0)
    };

    console.log('--- GameController: pushState ---');
    console.log(`[pushState] Value of stateForEmit.currentPlayer before stringify: ${stateForEmit.currentPlayer}`);
    console.log('---------------------------------');

    this.io.to('game-room').emit(STATE_UPDATE, stateForEmit);
  }
}
