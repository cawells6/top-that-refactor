import { Server, Socket } from 'socket.io';
import GameState, { Card, CardValue } from '../models/GameState'; // Updated import
import Player from '../models/Player'; // Updated import
import { normalizeCardValue, isSpecialCard, isTwoCard, isFiveCard, isTenCard } from '../utils/cardUtils'; // Updated import
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
} from '../src/shared/events'; // Updated import

interface PlayerData {
  id?: string;
  name?: string;
  numCPUs?: number;
}

interface StartGameOptions {
  computerCount?: number;
  socket?: Socket;
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

interface ClientStatePlayer {
  id: string;
  name: string;
  handCount?: number;
  upCount?: number;
  downCount?: number;
  hand?: Card[];
  upCards?: Card[];
  downCards?: Card[];
  error?: string;
}

interface ClientState {
  players: ClientStatePlayer[];
  pile: Card[];
  discardCount: number;
  deckCount: number;
  currentPlayer: string | undefined;
  started: boolean;
}

export default class GameController {
  private io: Server;
  private gameState: GameState;
  private players: Map<string, Player>; // Map<playerId, Player>

  constructor(io: Server) {
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
      const state: Partial<ClientState> = { // TODO: Refine type - Ensure this matches ClientState structure fully
        players: this.gameState.players.map((id: string) => { // Added type for id
          const player: Player | undefined = this.players.get(id);
          return {
            id,
            name: player?.name || id,
            handCount: player?.hand.length || 0,
            upCount: player?.upCards.length || 0,
            downCount: player?.downCards.length || 0,
          };
        }),
        pile: this.gameState.pile,
        discardCount: this.gameState.discard.length,
        currentPlayer: this.gameState.players[this.gameState.currentPlayerIndex],
      };
      socket.emit(STATE_UPDATE, state);
    });
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  private handleJoin(socket: Socket, playerData: PlayerData | string): void {
    let id: string | undefined;
    let name: string | undefined;

    if (typeof playerData === 'object' && playerData !== null) {
      id = playerData.id || playerData.name;
      name = playerData.name || playerData.id;
    } else if (typeof playerData === 'string') {
      id = playerData;
      name = playerData;
    }

    if (typeof id !== 'string' || id.trim() === '') {
      socket.emit('err', 'Invalid player identifier provided.');
      console.error('[GameController] Join attempt with invalid identifier:', playerData);
      return;
    }
    id = id.trim();
    name = (typeof name === 'string' && name.trim() !== '') ? name.trim() : id;

    if (this.players.has(id)) {
      socket.emit('err', `Player ID '${id}' already joined.`);
      return;
    }

    this.gameState.addPlayer(id);
    const player: Player = new Player(id);
    player.name = name;
    this.players.set(id, player);

    socket.join('game-room');
    socket.emit(JOINED, { id: id, roomId: 'game-room' });

    const lobbyPlayerList: {id: string, name: string}[] = this.gameState.players.map((pId: string) => { // Added type for pId and return
      const p: Player | undefined = this.players.get(pId);
      return { id: pId, name: p ? p.name : pId }; // TODO: Refine type - Ensure p is always found
    });

    this.io.to('game-room').emit(PLAYER_JOINED, lobbyPlayerList);
    this.io.to('game-room').emit(LOBBY, {
      roomId: 'game-room',
      players: lobbyPlayerList,
      maxPlayers: this.gameState.maxPlayers,
    });

    const numCPUs: number = (typeof playerData === 'object' && typeof playerData.numCPUs === 'number') ? playerData.numCPUs : 0;

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
      const errorMsg: string = 'Cannot start game: Total players would exceed the maximum of ' + this.gameState.maxPlayers;
      if (opts.socket) {
        opts.socket.emit('err', errorMsg);
      } else {
        this.io.to('game-room').emit('err', errorMsg);
      }
      return;
    }

    for (let i: number = 0; i < computerCount; i++) {
      const id: string = `COMPUTER_${i + 1}`;
      if (!this.players.has(id)) {
        this.gameState.addPlayer(id);
        const cpuPlayer: Player = new Player(id);
        cpuPlayer.name = id;
        this.players.set(id, cpuPlayer);
      }
    }

    console.log('[GameController] About to build deck. Number of players in gameState:', this.gameState.players.length);
    this.gameState.buildDeck();
    const numPlayers: number = this.gameState.players.length;
    if (numPlayers === 0) {
      console.error('[GameController] No players to deal cards to in handleStartGame.');
      return;
    }
    const { hands, upCards, downCards }: { hands: Card[][], upCards: Card[][], downCards: Card[][] } = this.gameState.dealCards(numPlayers);

    this.gameState.players.forEach((id: string, idx: number) => { // Added types for id and idx
      const player: Player | undefined = this.players.get(id);
      if (!player) {
        console.error(`[GameController] Player not found in this.players map for id: ${id} during card assignment.`);
        return;
      }
      player.setHand(hands[idx] || []);
      player.setUpCards(upCards[idx] || []);
      player.setDownCards(downCards[idx] || []);
    });

    console.log('--- GameController: handleStartGame --- CARDS ASSIGNED ---');
    this.players.forEach((player: Player, id: string) => { // Added types for player and id
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
    const player: Player | undefined = this.players.get(playerId);
    if (!player) return;

    let card: Card | undefined;
    switch (zone) {
      case 'hand': card = player.playFromHand(cardIndex); break;
      case 'up': card = player.playUpCard(cardIndex); break;
      case 'down': card = player.playDownCard(); break; // playDownCard might not take an index
      default: return;
    }

    if (!card) {
        console.error(`[GameController] Card not played from zone: ${zone} for player: ${playerId}`);
        // TODO: Emit error to client?
        return;
    }

    const normalizedValue: CardValue = normalizeCardValue(card.value) as CardValue; // Ensure CardValue is imported and used
    const playedCard: Card = { ...card, value: normalizedValue };

    this.gameState.addToPile(playedCard);
    this.io.to('game-room').emit('card-played', { playerId, card: playedCard });

    const DELAY_SPECIAL: number = 1200; // ms
    const delay = (ms: number): Promise<void> => new Promise(res => setTimeout(res, ms));

    (async () => {
      if (isTwoCard(normalizedValue)) {
        this.io.to('game-room').emit(SPECIAL_CARD, { type: 'two' });
        await delay(DELAY_SPECIAL);
        this.gameState.clearPile();
        this.pushState();
        this.handleNextTurn();
        return;
      }

      const isFour: boolean = this.gameState.isFourOfAKindOnPile();
      if (isTenCard(normalizedValue) || isFour) {
        this.io.to('game-room').emit(SPECIAL_CARD, { type: isFour ? 'four' : 'ten' });
        await delay(DELAY_SPECIAL);
        this.gameState.clearPile();
        if (this.gameState.deck && this.gameState.deck.length > 0) {
          const newCard: Card | undefined = this.gameState.deck.pop(); // deck.pop() can return undefined
          if (newCard) {
            this.gameState.addToPile(newCard);
            if (!isSpecialCard(normalizeCardValue(newCard.value))) {
              this.gameState.lastRealCard = newCard;
            } else {
              this.gameState.lastRealCard = null;
            }
          }
        }
        this.pushState();
        const currentPlayerId: string | undefined = this.gameState.players[this.gameState.currentPlayerIndex];
        this.io.to('game-room').emit(NEXT_TURN, currentPlayerId);
        return;
      }

      if (isFiveCard(normalizedValue)) {
        this.io.to('game-room').emit(SPECIAL_CARD, { type: 'five' });
        await delay(DELAY_SPECIAL);
        if (this.gameState.lastRealCard) {
          this.gameState.addToPile({ ...this.gameState.lastRealCard }, { isCopy: true });
        }
        this.pushState();
        this.handleNextTurn();
        return;
      }

      this.gameState.lastRealCard = playedCard;
      this.pushState();
      this.handleNextTurn();
    })();
  }

  private handleNextTurn(): void {
    this.gameState.advancePlayer();
    const nextPlayerId: string | undefined = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!nextPlayerId) {
        console.error("[GameController] Next player ID is undefined in handleNextTurn.");
        // TODO: What to do here? Maybe reset game or emit an error.
        return;
    }
    this.io.to('game-room').emit(NEXT_TURN, nextPlayerId);
  }

  private handleDisconnect(socket: Socket): void {
    // TODO: Implement player removal or mark as offline
    // For now, just log and push state if a player ID was associated with the socket
    let disconnectedPlayerId: string | null = null; // TODO: Refine type - This is not currently used effectively
    for (const [id, playerInstance] of this.players.entries()) { // Added types for id and playerInstance
        // This is a naive way to find player by socket, assumes one socket per player and no easy socket.id to player mapping stored
        // A better way would be to store socket.id with player on join or have a map: Map<socketId, playerId>
        // console.log(`Checking player ${id} against socket ${socket.id}`); // For debugging
    }
    // if (disconnectedPlayerId) {
    //    console.log(`Player ${disconnectedPlayerId} disconnected`);
    //    this.gameState.removePlayer(disconnectedPlayerId); // Example: you'd need to implement this
    //    this.players.delete(disconnectedPlayerId);
    // }
    this.pushState();
  }

  private pushState(): void {
    if (this.gameState.players.length === 0 && this.gameState.currentPlayerIndex === -1) {
        console.log('[pushState] Attempting to push state with no players or game not started.');
    }
    const currentPlayerId: string | undefined = this.gameState.players[this.gameState.currentPlayerIndex];

    if (currentPlayerId === undefined && this.gameState.players.length > 0) {
        console.warn(`[pushState] currentPlayerId is undefined. gameState.players: ${JSON.stringify(this.gameState.players)}, currentPlayerIndex: ${this.gameState.currentPlayerIndex}`);
    }

    const stateForEmit: ClientState = {
      players: this.gameState.players.map((id: string): ClientStatePlayer => { // Added type for id and return type
        const player: Player | undefined = this.players.get(id);
        if (!player) {
          console.error(`[pushState] Player object not found for id: ${id}.`);
          return { id, name: String(id), handCount: 0, upCount: 0, downCount: 0, error: 'Player data missing' };
        }
        if (id === currentPlayerId) {
          return {
            id,
            name: String(player.name || id),
            hand: player.hand || [],
            upCards: player.upCards || [],
            downCards: player.downCards || [],
          };
        } else {
          return {
            id,
            name: String(player.name || id),
            handCount: player.hand?.length || 0,
            upCount: player.upCards?.length || 0,
            downCount: player.downCards?.length || 0,
          };
        }
      }),
      pile: this.gameState.pile || [],
      discardCount: this.gameState.discard?.length || 0,
      deckCount: this.gameState.deck?.length || 0,
      currentPlayer: currentPlayerId,
      started: !!(this.gameState.deck && this.gameState.deck.length > 0 && this.gameState.players.length > 0 && currentPlayerId !== undefined)
    };
    this.io.to('game-room').emit(STATE_UPDATE, stateForEmit);
  }
}
