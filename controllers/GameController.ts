import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import GameState from '../models/GameState.js';
import Player from '../models/Player.js';
import {
  createErrorResponse,
  ERROR_MESSAGES,
} from '../src/shared/errorCodes.js';
import {
  ERROR as ERROR_EVENT,
  GAME_OVER,
  JOIN_GAME,
  JOINED,
  LOBBY,
  LOBBY_STATE_UPDATE,
  NEXT_TURN,
  PICK_UP_PILE,
  PILE_PICKED_UP,
  PLAY_CARD,
  PLAYER_JOINED,
  PLAYER_READY,
  REJOIN,
  SPECIAL_CARD_EFFECT,
  START_GAME,
  STATE_UPDATE,
} from '../src/shared/events.js';
import {
  validateJoinGamePayloadServer,
  validateRejoinDataServer,
} from '../src/shared/serverValidation.js';
import {
  Card,
  CardValue,
  ClientStatePlayer,
  GameStateData,
  InSessionLobbyState,
  JoinGamePayload,
  RejoinData,
} from '../src/shared/types.js';
import {
  isFiveCard,
  isSpecialCard,
  isTenCard,
  isTwoCard,
  normalizeCardValue,
} from '../utils/cardUtils.js';

// interface PlayerJoinData {
//   id?: string;
//   name?: string;
//   numHumans?: number;
//   numCPUs?: number;
// }

interface StartGameOptions {
  computerCount?: number;
  socket?: Socket;
}

interface PlayData {
  cardIndices: number[];
  zone: 'hand' | 'upCards' | 'downCards';
}

export class GameRoomManager {
  private io: Server;
  private rooms: Map<string, GameController>;

  constructor(io: Server) {
    this.io = io;
    this.rooms = new Map();
    this.io.on('connection', (socket: Socket) => {
      console.log(`[SERVER] Socket connected: ${socket.id}`);

      socket.on(
        JOIN_GAME,
        (
          playerData: JoinGamePayload,
          ack?: (
            response: { roomId: string; playerId: string } | { error: string }
          ) => void
        ) => {
          console.log(
            `[SERVER] Received JOIN_GAME from ${socket.id}:`,
            playerData
          );
          // Validate payload on server side
          const validation = validateJoinGamePayloadServer(playerData);
          if (!validation.isValid && validation.errorResponse) {
            if (typeof ack === 'function') {
              ack({ error: validation.errorResponse.error });
            }
            socket.emit(ERROR_EVENT, validation.errorResponse.error);
            return;
          }

          this.handleClientJoinGame(socket, playerData, ack);
        }
      );

      socket.on(
        REJOIN,
        (
          rejoinData: RejoinData,
          ack?: (response: {
            success: boolean;
            error?: string;
            code?: string;
          }) => void
        ) => {
          // Validate rejoin data on server side
          const validation = validateRejoinDataServer(rejoinData);
          if (!validation.isValid && validation.errorResponse) {
            if (typeof ack === 'function') {
              ack({
                success: false,
                error: validation.errorResponse.error,
                code: validation.errorResponse.code,
              });
            }
            socket.emit(ERROR_EVENT, validation.errorResponse.error);
            return;
          }

          const controller = this.rooms.get(rejoinData.roomId);
          if (controller) {
            controller.publicHandleRejoin(
              socket,
              rejoinData.roomId,
              rejoinData.playerId,
              ack
            );
          } else {
            const errorResponse = createErrorResponse(
              'ROOM_NOT_FOUND',
              ERROR_MESSAGES.ROOM_NOT_FOUND
            );
            if (typeof ack === 'function') {
              ack({
                success: false,
                error: errorResponse.error,
                code: errorResponse.code,
              });
            }
            socket.emit(ERROR_EVENT, errorResponse.error);
          }
        }
      );
    });

    setInterval(() => {
      for (const [roomId, controller] of this.rooms.entries()) {
        const hasActivePlayers = Array.from(
          controller['players'].values()
        ).some((p) => !p.disconnected);
        if (!hasActivePlayers && !controller['gameState'].started) {
          this.log(`Cleaning up empty room: ${roomId}`);
          controller.destroy(); // 🔥 CRITICAL: Properly destroy controller
          this.rooms.delete(roomId);
        }
      }
    }, 60000);
  }

  // 🔥 CRITICAL: Add proper shutdown method
  public shutdown(): void {
    this.log('Shutting down GameRoomManager and cleaning up all rooms');
    for (const [roomId, controller] of this.rooms.entries()) {
      this.log(`Destroying room: ${roomId}`);
      controller.destroy();
    }
    this.rooms.clear();
  }

  private log(...args: any[]): void {
    console.log('[GameRoomManager]', ...args);
  }

  private handleClientJoinGame(
    socket: Socket,
    playerData: JoinGamePayload,
    ack?: (
      response:
        | { roomId: string; playerId: string }
        | { error: string; code?: string }
    ) => void
  ): void {
    console.log(
      `[SERVER] Processing JOIN_GAME for socket ${socket.id}, data:`,
      playerData
    );

    // Use playerData.roomId instead of playerData.id
    let roomId = playerData.roomId;
    let controller: GameController | undefined;

    if (roomId) {
      controller = this.rooms.get(roomId);
      if (!controller) {
        console.log(
          `[SERVER] Room ${roomId} not found for JOIN_GAME from ${socket.id}`
        );
        const errorResponse = createErrorResponse(
          'ROOM_NOT_FOUND',
          ERROR_MESSAGES.ROOM_NOT_FOUND
        );
        if (typeof ack === 'function') {
          console.log(
            `[SERVER] Sending error response to ${socket.id}: Room not found`
          );
          ack({ error: errorResponse.error, code: errorResponse.code });
        }
        socket.emit(ERROR_EVENT, errorResponse.error);
        return;
      }
    }

    if (!controller) {
      roomId = uuidv4().slice(0, 6);
      console.log(
        `[SERVER] Creating new room ${roomId} for JOIN_GAME from ${socket.id}`
      );
      controller = new GameController(this.io, roomId);
      this.rooms.set(roomId, controller);
    }

    // Pass a copy of playerData without the room identifier so the controller
    // assigns the joining player's ID from the socket.
    const joinData = { ...playerData, id: undefined };
    console.log(
      `[SERVER] Calling publicHandleJoin for room ${roomId}, socket ${socket.id}`
    );
    controller.publicHandleJoin(socket, joinData, ack);
  }
}

export default class GameController {
  private io: Server;
  private gameState: GameState;
  private players: Map<string, Player>;
  private socketIdToPlayerId: Map<string, string>;
  private roomId: string;
  private expectedHumanCount: number;
  private expectedCpuCount: number;
  private hostId: string | null = null;

  // 🔥 CRITICAL: Race condition prevention and memory management
  // Add timeout tracking and turn management for race condition prevention
  private gameTimeouts: Set<NodeJS.Timeout> = new Set();
  private turnLock: boolean = false;
  private stateUpdateScheduled: boolean = false;
  private destroyed: boolean = false;

  // Performance optimization: event throttling and batching
  private lastStateEmit: number = 0;
  private pendingStateUpdates: Set<string> = new Set();
  private eventThrottleDelay: number = 50; // Minimum ms between state updates
  private batchedEventQueue: Map<string, any[]> = new Map();

  constructor(io: Server, roomId: string) {
    this.io = io;
    this.roomId = roomId;
    this.gameState = new GameState();
    this.players = new Map<string, Player>();
    this.socketIdToPlayerId = new Map<string, string>();
    this.expectedHumanCount = 1;
    this.expectedCpuCount = 0;
  }

  public attachSocketEventHandlers(socket: Socket): void {
    this.log(`Attaching event handlers for socket ${socket.id}`);

    // Remove ALL listeners first to prevent duplicates
    socket.removeAllListeners();

    socket.on(
      START_GAME,
      (opts: Pick<StartGameOptions, 'computerCount'> = {}) =>
        this.handleStartGame({ ...opts, socket })
    );
    socket.on(PLAY_CARD, (data: PlayData) => this.handlePlayCard(socket, data));
    socket.on(PICK_UP_PILE, () => this.handlePickUpPile(socket));
    socket.on(PLAYER_READY, (playerName: string) => {
      const playerId = this.socketIdToPlayerId.get(socket.id);
      if (playerId) {
        const player = this.players.get(playerId);
        if (player) {
          // Update name and mark as ready
          player.name = playerName;
          player.status = 'ready';
          this.pushLobbyState();
          this.checkIfGameCanStart();
        }
      }
    });
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  private getLobbyPlayerList(): {
    id: string;
    name: string;
    disconnected: boolean;
  }[] {
    return Array.from(this.players.values()).map((p: Player) => ({
      id: p.id,
      name: p.name,
      disconnected: p.disconnected,
    }));
  }

  private pushLobbyState(): void {
    const lobbyPlayers = Array.from(this.players.values()).map((p: Player) => ({
      id: p.id,
      name: p.name,
      status: p.status,
    }));

    const lobbyState: InSessionLobbyState = {
      roomId: this.roomId,
      hostId: this.hostId,
      players: lobbyPlayers,
      started: this.gameState.started, // Add started property
    };

    // console.log('[SERVER] Emitting LOBBY_STATE_UPDATE:', lobbyState);
    this.io.to(this.roomId).emit(LOBBY_STATE_UPDATE, lobbyState);
  }

  /**
   * Determine if all human players are ready and start the game automatically.
   * The host is considered ready by default.
   */
  private checkIfGameCanStart(): void {
    // console.log('[SERVER] checkIfGameCanStart called');
    const allPlayers = Array.from(this.players.values());
    const humanPlayers = allPlayers.filter((p) => !p.isComputer);
    const allHumansReady = humanPlayers.every(
      (p) => p.status === 'host' || p.status === 'ready'
    );
    // console.log(
    //   '[SERVER] Human players:',
    //   humanPlayers.map((p) => ({ id: p.id, status: p.status }))
    // );
    if (
      humanPlayers.length === this.expectedHumanCount &&
      allHumansReady &&
      !this.gameState.started
    ) {
      // console.log('[SERVER] All humans ready, starting game');
      this.handleStartGame({ computerCount: this.expectedCpuCount });
    }
  }

  public publicHandleJoin(
    socket: Socket,
    playerData: JoinGamePayload,
    ack?: (
      response: { roomId: string; playerId: string } | { error: string }
    ) => void
  ): void {
    console.log(
      `[SERVER] publicHandleJoin for socket ${socket.id}, data:`,
      playerData
    );
    this.attachSocketEventHandlers(socket);
    this.handleJoin(socket, playerData, ack);
  }

  public publicHandleRejoin(
    socket: Socket,
    roomId: string,
    playerId: string,
    ack?: (response: { success: boolean; error?: string }) => void
  ): void {
    this.attachSocketEventHandlers(socket);
    this.handleRejoin(socket, roomId, playerId, ack);
  }

  private handleRejoin(
    socket: Socket,
    roomId: string,
    playerId: string,
    ack?: (response: { success: boolean; error?: string }) => void
  ): void {
    if (roomId !== this.roomId) {
      if (typeof ack === 'function') {
        ack({ success: false, error: 'Invalid room for rejoin.' });
      }
      socket.emit(ERROR_EVENT, 'Invalid room for rejoin.');
      return;
    }
    const player = this.players.get(playerId);
    if (player) {
      socket.join(this.roomId);
      player.socketId = socket.id;
      player.disconnected = false;
      this.socketIdToPlayerId.set(socket.id, playerId);

      socket.emit(JOINED, {
        id: player.id,
        name: player.name,
        roomId: this.roomId,
      });
      this.log(`Emitted JOINED to rejoining player ${player.name}`);

      this.pushState();
      this.pushLobbyState();
      this.log(
        `Pushed state and lobby info to room ${this.roomId} after rejoin.`
      );
      if (typeof ack === 'function') {
        ack({ success: true });
      }
    } else {
      this.log(`Rejoin failed: Player ${playerId} not found in this room.`);
      if (typeof ack === 'function') {
        ack({
          success: false,
          error: `Player ${playerId} not found for rejoin.`,
        });
      }
      socket.emit(ERROR_EVENT, `Player ${playerId} not found for rejoin.`);
    }
  }

  private handleJoin(
    socket: Socket,
    playerData: JoinGamePayload,
    ack?: (
      response:
        | { roomId: string; playerId: string }
        | { error: string; code?: string }
    ) => void
  ): void {
    // --- Payload validation ---
    if (
      typeof playerData.playerName !== 'string' ||
      !playerData.playerName.trim() ||
      typeof playerData.numHumans !== 'number' ||
      typeof playerData.numCPUs !== 'number' ||
      playerData.numHumans < 1 ||
      playerData.numCPUs < 0 ||
      playerData.numHumans + playerData.numCPUs < 2 ||
      playerData.numHumans + playerData.numCPUs > this.gameState.maxPlayers
    ) {
      const errorResponse = createErrorResponse(
        'INVALID_PAYLOAD',
        ERROR_MESSAGES.INVALID_PAYLOAD
      );
      if (typeof ack === 'function') {
        ack({ error: errorResponse.error, code: errorResponse.code });
      }
      socket.emit(ERROR_EVENT, errorResponse.error);
      return;
    }

    // console.log('[SERVER] handleJoin: playerData', playerData);

    // Validate playerName
    if (
      !playerData.playerName ||
      typeof playerData.playerName !== 'string' ||
      !playerData.playerName.trim()
    ) {
      this.log(`Invalid or missing player name. Emitting ERROR_EVENT.`);
      const errorResponse = createErrorResponse(
        'INVALID_PLAYER_NAME',
        ERROR_MESSAGES.INVALID_PLAYER_NAME
      );
      if (typeof ack === 'function') {
        ack({ error: errorResponse.error, code: errorResponse.code });
      }
      return;
    }

    let id = playerData.id || socket.id;
    let name = playerData.playerName.trim();
    this.log(
      `Handling join request for player: ${name} (Proposed ID: ${id}, Socket: ${socket.id})`
    );

    const existingPlayer = this.players.get(id);
    const callAck = (response: any) => {
      if (typeof ack === 'function') {
        ack(response);
      }
    };
    if (existingPlayer && !existingPlayer.disconnected) {
      this.log(
        `Player ID '${id}' (${name}) is already active. Emitting ERROR_EVENT.`
      );
      console.log('[DEBUG] Emitting ERROR_EVENT: duplicate join');
      const errorResponse = createErrorResponse(
        'DUPLICATE_JOIN',
        ERROR_MESSAGES.DUPLICATE_JOIN
      );
      callAck({ error: errorResponse.error, code: errorResponse.code });
      return;
    }
    if (existingPlayer && existingPlayer.disconnected) {
      this.log(
        `Player ID '${id}' (${name}) is disconnected. Attempting rejoin logic.`
      );
      this.handleRejoin(
        socket,
        this.roomId,
        id,
        ack
          ? (rejoinAck) => {
              if (rejoinAck.success) {
                callAck({ roomId: this.roomId, playerId: id });
              } else {
                callAck({ error: rejoinAck.error || 'Rejoin failed' });
              }
            }
          : undefined
      );
      return;
    }
    if (this.gameState.started) {
      this.log(
        `Game already started. Player '${name}' cannot join. Emitting ERROR_EVENT.`
      );
      console.log('[DEBUG] Emitting ERROR_EVENT: game already started');
      const errorResponse = createErrorResponse(
        'GAME_ALREADY_STARTED',
        ERROR_MESSAGES.GAME_ALREADY_STARTED
      );
      if (typeof ack === 'function') {
        ack({ error: errorResponse.error, code: errorResponse.code });
      }
      return;
    }
    if (this.players.size >= this.gameState.maxPlayers) {
      this.log(
        `Game room is full. Player '${name}' cannot join. Emitting ERROR_EVENT.`
      );
      console.log('[DEBUG] Emitting ERROR_EVENT: room full');
      const errorResponse = createErrorResponse(
        'GAME_FULL',
        ERROR_MESSAGES.GAME_FULL
      );
      callAck({ error: errorResponse.error, code: errorResponse.code });
      return;
    }

    this.log(`Adding player '${name}' (ID: ${id}) to game state.`);
    this.gameState.addPlayer(id);
    const player = new Player(id);
    player.name = name;
    player.socketId = socket.id;
    if (this.players.size === 0) {
      this.hostId = id;
      player.status = 'host';
      // Set expected player counts from payload if provided
      if (
        typeof playerData.numHumans === 'number' &&
        playerData.numHumans > 0 &&
        typeof playerData.numCPUs === 'number' &&
        playerData.numCPUs >= 0
      ) {
        this.expectedHumanCount = playerData.numHumans;
        this.expectedCpuCount = playerData.numCPUs;
        this.log(
          `Host set expected players: ${this.expectedHumanCount} humans, ${this.expectedCpuCount} CPUs`
        );
      }
    } else {
      player.status = 'joined';
    }
    this.players.set(id, player);
    this.socketIdToPlayerId.set(socket.id, id);

    // Update expected player counts for the host only
    if (this.players.size === 1) {
      // If host specifies numHumans, use that value
      this.expectedHumanCount = playerData.numHumans ?? 1;
      this.expectedCpuCount = playerData.numCPUs ?? 0;

      this.log(
        `Host set expected players: ${this.expectedHumanCount} humans, ${this.expectedCpuCount} CPUs`
      );
    }

    socket.join(this.roomId);
    this.log(
      `Player '${name}' (Socket ID: ${socket.id}) joined room '${this.roomId}'. Emitting JOINED.`
    );
    console.log('[SERVER] Emitting JOINED to socket', socket.id, {
      id: player.id,
      name: player.name,
      roomId: this.roomId,
    });
    socket.emit(JOINED, {
      id: player.id,
      name: player.name,
      roomId: this.roomId,
    });
    if (typeof ack === 'function') {
      console.log(`[SERVER] Calling JOIN_GAME ack for socket ${socket.id}`);
      ack({ roomId: this.roomId, playerId: player.id });
    }

    // --- After adding the player, update lobby ---
    const currentLobbyPlayers = this.getLobbyPlayerList();
    this.log(
      `Emitting PLAYER_JOINED and LOBBY to room '${this.roomId}'. Players:`,
      currentLobbyPlayers
    );
    this.io.to(this.roomId).emit(PLAYER_JOINED, currentLobbyPlayers);
    this.io.to(this.roomId).emit(LOBBY, {
      roomId: this.roomId,
      players: currentLobbyPlayers,
      maxPlayers: this.gameState.maxPlayers,
    });

    // Always push state after join, even if not enough players
    this.pushState();
  }

  private async handleStartGame(opts: StartGameOptions): Promise<void> {
    const computerCount = opts.computerCount || 0;
    const requestingSocket = opts.socket;
    this.log(
      `Handling start game request. Computer count: ${computerCount}. Requested by: ${requestingSocket?.id}`
    );

    if (
      requestingSocket &&
      this.socketIdToPlayerId.get(requestingSocket.id) !== this.hostId
    ) {
      return;
    }

    if (this.gameState.started) {
      const errorMsg = 'Game has already started.';
      this.log(`Start game failed: ${errorMsg}`);
      if (requestingSocket) requestingSocket.emit(ERROR_EVENT, errorMsg);
      return;
    }

    this.players.forEach((player) => {
      if (!this.gameState.players.includes(player.id)) {
        this.gameState.addPlayer(player.id);
        this.log(
          `Added player ${player.id} to gameState.players before starting.`
        );
      }
    });

    // --- Ensure host/human is always first in player order ---
    if (requestingSocket) {
      const hostPlayerId = this.socketIdToPlayerId.get(requestingSocket.id);
      if (hostPlayerId && this.gameState.players[0] !== hostPlayerId) {
        // Move host to front, preserve order for others
        this.gameState.players = [
          hostPlayerId,
          ...this.gameState.players.filter((id) => id !== hostPlayerId),
        ];
        this.log(
          `Reordered players so host (${hostPlayerId}) is first: ${this.gameState.players.join(', ')}`
        );
      }
    }
    // --------------------------------------------------------

    const currentHumanPlayers = Array.from(this.players.values()).filter(
      (p: Player) => !p.isComputer
    ).length;

    this.log(
      `Current human players: ${currentHumanPlayers}. Desired CPUs: ${computerCount}. Total players before adding CPUs: ${this.players.size}`
    );

    if (currentHumanPlayers === 0 && computerCount < 2) {
      const errorMsg =
        'At least two players (humans or CPUs) are required to start.';
      this.log(`Start game failed: ${errorMsg}`);
      if (requestingSocket) requestingSocket.emit(ERROR_EVENT, errorMsg);
      return;
    }
    if (currentHumanPlayers > 0 && currentHumanPlayers + computerCount < 2) {
      const errorMsg =
        'At least two total players (humans + CPUs) are required.';
      this.log(`Start game failed: ${errorMsg}`);
      if (requestingSocket) requestingSocket.emit(ERROR_EVENT, errorMsg);
      return;
    }
    if (currentHumanPlayers + computerCount > this.gameState.maxPlayers) {
      const errorMsg = `Cannot start: Total players (${currentHumanPlayers + computerCount}) would exceed max players (${this.gameState.maxPlayers}).`;
      this.log(`Start game failed: ${errorMsg}`);
      if (requestingSocket) requestingSocket.emit(ERROR_EVENT, errorMsg);
      return;
    }

    for (let i = 0; i < computerCount; i++) {
      if (this.players.size >= this.gameState.maxPlayers) {
        this.log('Max players reached, cannot add more CPUs.');
        break;
      }
      const cpuId = `COMPUTER_${i + 1}`;
      if (!this.players.has(cpuId)) {
        const cpuPlayer = new Player(cpuId);
        cpuPlayer.name = `CPU ${i + 1}`;
        cpuPlayer.isComputer = true;
        this.players.set(cpuId, cpuPlayer);
        if (!this.gameState.players.includes(cpuId)) {
          this.gameState.addPlayer(cpuId);
        }
        this.log(
          `Added CPU player ${cpuId}. Total players now: ${this.players.size}`
        );
      }
    }
    this.log(
      `Finished adding CPUs. Total players in this.players: ${this.players.size}. Players in gameState: ${this.gameState.players.length}`
    );

    this.players.forEach((p) => {
      if (!this.gameState.players.includes(p.id)) {
        this.gameState.addPlayer(p.id);
        this.log(`Final sync: Added player ${p.id} to gameState.players.`);
      }
    });

    this.gameState.startGameInstance();
    this.log(
      `Game instance started. Players in gameState after start: ${this.gameState.players.join(', ')}`
    );

    const numPlayers = this.gameState.players.length;
    if (numPlayers < 2) {
      const errorMsg = `Not enough players to start (need at least 2, have ${numPlayers}).`;
      this.log(
        `Start game failed: ${errorMsg}. Players in gameState: ${this.gameState.players.join(', ')}`
      );
      this.gameState.started = false;
      if (requestingSocket) requestingSocket.emit(ERROR_EVENT, errorMsg);
      return;
    }

    this.log(
      `Dealing cards for ${numPlayers} players: ${this.gameState.players.join(', ')}`
    );
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

    const firstPlayerId =
      this.gameState.players[this.gameState.currentPlayerIndex];
    this.log(
      `Game started successfully. First player: ${firstPlayerId}. Emitting NEXT_TURN and pushing state.`
    );

    this.pushState();
    this.io.to(this.roomId).emit(NEXT_TURN, firstPlayerId);

    // Only allow a human to start the game. If the first player is a CPU, do not auto-play.
    // If you want to force a human to always be first, ensure player order is set accordingly before this point.
    // If the first player is a CPU, do NOT call playComputerTurn.
  }

  /**
   * Public wrapper around the private start logic so external callers (like the Lobby)
   * can trigger the game start without exposing the full internal options type.
   */
  public startGame(computerCount = 0, socket?: Socket): Promise<void> {
    return this.handleStartGame({ computerCount, socket });
  }

  private handlePlayCard(
    socket: Socket,
    { cardIndices, zone }: PlayData
  ): void {
    const playerId = this.socketIdToPlayerId.get(socket.id);
    this.log(
      `Handling play card request from socket ${socket.id} (Player ID: ${playerId}). Zone: ${zone}, Indices: ${cardIndices}`
    );
    if (!playerId) {
      socket.emit(ERROR_EVENT, 'Player not recognized.');
      return;
    }

    const player = this.players.get(playerId);
    if (!player) {
      socket.emit(ERROR_EVENT, 'Player data not found.');
      return;
    }

    if (
      this.gameState.players[this.gameState.currentPlayerIndex] !== playerId
    ) {
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
    this.log(
      `Internal play card for player ${player.id} (${player.name}). Zone: ${zone}, Cards: ${JSON.stringify(
        cardsToPlay
      )}`
    );
    if (
      this.gameState.players[this.gameState.currentPlayerIndex] !== player.id
    ) {
      this.log(
        `Play card rejected: Not player ${player.id}'s turn. Current player: ${this.gameState.players[this.gameState.currentPlayerIndex]}`
      );
      const playerSocket = player.socketId
        ? this.io.sockets.sockets.get(player.socketId)
        : undefined;
      if (playerSocket) {
        playerSocket.emit(ERROR_EVENT, 'Not your turn.');
      }
      return;
    }
    if (cardsToPlay.length === 0) {
      this.log('Play card rejected: No cards provided.');
      return;
    }

    const isValid = this.gameState.isValidPlay(cardsToPlay);
    if (!isValid && zone !== 'downCards') {
      this.log(
        `Play card rejected: Invalid play by ${player.id} with cards ${JSON.stringify(
          cardsToPlay
        )} onto pile top: ${JSON.stringify(this.gameState.pile[this.gameState.pile.length - 1])}.`
      );
      if (!player.isComputer) {
        if (player.socketId) {
          const playerSocket = this.io.sockets.sockets.get(player.socketId);
          if (playerSocket) {
            playerSocket.emit(ERROR_EVENT, 'Invalid play.');
          }
        }
      } else {
        this.log(
          `Computer player ${player.id} made an invalid play. Forcing pickup.`
        );
        this.handlePickUpPileInternal(player);
      }
      return;
    }

    if (zone === 'hand') {
      player.setHand(
        player.hand.filter((_: Card, i: number) => !cardIndices.includes(i))
      );
    } else if (zone === 'upCards') {
      player.setUpCards(
        player.upCards.filter((_: Card, i: number) => !cardIndices.includes(i))
      );
    } else if (zone === 'downCards') {
      player.playDownCard();
    }

    cardsToPlay.forEach((card) => {
      const normalizedValue = normalizeCardValue(card.value) as CardValue;
      const playedCardForPile: Card = { ...card, value: normalizedValue };
      this.gameState.addToPile(playedCardForPile);

      if (
        !isSpecialCard(normalizedValue) &&
        !this.gameState.isFourOfAKindOnPile()
      ) {
        this.gameState.lastRealCard = playedCardForPile;
      }
    });

    // 🚀 PERFORMANCE: Batch card played events for better scalability
    this.batchEvent('card-played', {
      playerId: player.id,
      cards: cardsToPlay,
      zone,
      timestamp: Date.now(),
    });

    this.log(
      `Batched CARD_PLAYED for player ${player.id}. Cards: ${JSON.stringify(cardsToPlay)}`
    );

    const lastPlayedCard = cardsToPlay[0];
    const lastPlayedNormalizedValue = normalizeCardValue(lastPlayedCard.value);

    let pileClearedBySpecial = false;
    if (isTwoCard(lastPlayedNormalizedValue)) {
      this.log(`Special card: 2 played by ${player.id}. Resetting pile.`);
      this.io.to(this.roomId).emit(SPECIAL_CARD_EFFECT, {
        type: 'two',
        value: lastPlayedNormalizedValue,
      });
      this.gameState.clearPile();
      pileClearedBySpecial = true;
    } else if (
      this.gameState.isFourOfAKindOnPile() ||
      isTenCard(lastPlayedNormalizedValue)
    ) {
      const effectType = isTenCard(lastPlayedNormalizedValue) ? 'ten' : 'four';
      this.log(
        `Special card: ${effectType} played by ${player.id}. Burning pile.`
      );
      this.io.to(this.roomId).emit(SPECIAL_CARD_EFFECT, {
        type: effectType,
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
      this.log(
        `Special card: 5 played by ${player.id}. Copying last real card.`
      );
      this.io.to(this.roomId).emit(SPECIAL_CARD_EFFECT, {
        type: 'five',
        value: lastPlayedNormalizedValue,
      });
      if (this.gameState.lastRealCard) {
        this.gameState.addToPile({
          ...this.gameState.lastRealCard,
          copied: true,
        });
      }
    }

    if (player.hasEmptyHand() && player.hasEmptyUp() && player.hasEmptyDown()) {
      this.log(
        `Player ${player.id} (${player.name}) has played all cards. Game Over!`
      );
      this.io
        .to(this.roomId)
        .emit(GAME_OVER, { winnerId: player.id, winnerName: player.name });
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
      this.log(
        `Pile cleared by special card. Player ${player.id} plays again.`
      );
      this.scheduleStateUpdate();
      this.io.to(this.roomId).emit(NEXT_TURN, player.id);
      if (player.isComputer) {
        this.log(
          `Computer player ${player.id} plays again. Scheduling their turn.`
        );
        this.scheduleComputerTurn(player, 1200);
      }
    } else {
      this.log('Proceeding to next turn.');
      this.handleNextTurn();
    }
    this.scheduleStateUpdate();
  }

  private handlePickUpPile(socket: Socket): void {
    const playerId = this.socketIdToPlayerId.get(socket.id);
    this.log(
      `Handling pick up pile request from socket ${socket.id} (Player ID: ${playerId})`
    );
    if (!playerId) {
      this.log(
        `Pick up pile failed: Player not recognized for socket ${socket.id}`
      );
      socket.emit(ERROR_EVENT, 'Player not recognized.');
      return;
    }

    const player = this.players.get(playerId);
    if (!player) {
      this.log(`Pick up pile failed: Player data not found for ID ${playerId}`);
      socket.emit(ERROR_EVENT, 'Player data not found.');
      return;
    }

    if (
      this.gameState.players[this.gameState.currentPlayerIndex] !== playerId
    ) {
      this.log(
        `Pick up pile rejected: Not player ${playerId}'s turn. Current player: ${this.gameState.players[this.gameState.currentPlayerIndex]}`
      );
      socket.emit(ERROR_EVENT, 'Not your turn to pick up.');
      return;
    }

    this.handlePickUpPileInternal(player);
  }

  private handlePickUpPileInternal(player: Player): void {
    this.log(
      `Internal pick up pile for player ${player.id} (${player.name}). Pile size: ${this.gameState.pile.length}`
    );
    if (this.gameState.pile.length === 0) {
      this.log(
        `Player ${player.id} tried to pick up an empty pile. This shouldn't typically happen unless it's a forced pickup after an invalid downcard play on an empty pile.`
      );
    } else {
      player.pickUpPile([...this.gameState.pile]);
      this.gameState.clearPile();
      this.log(
        `Player ${player.id} picked up ${this.gameState.pile.length} cards. New hand size: ${player.hand.length}`
      );
      this.io.to(this.roomId).emit(PILE_PICKED_UP, { playerId: player.id });
    }

    this.handleNextTurn();
    this.scheduleStateUpdate();
  }

  private handleNextTurn(): void {
    if (!this.gameState.started) {
      this.log('Attempted to advance turn, but game has not started.');
      return;
    }

    // 🔥 CRITICAL: Prevent race conditions with turn lock
    if (this.turnLock) {
      this.log(
        'Turn change already in progress, skipping duplicate handleNextTurn'
      );
      return;
    }

    this.turnLock = true;

    try {
      this.gameState.advancePlayer();
      const nextPlayerId =
        this.gameState.players[this.gameState.currentPlayerIndex];
      const nextPlayer = this.players.get(nextPlayerId);

      this.log(
        `Advancing turn. Current player index: ${this.gameState.currentPlayerIndex}, Next player ID: ${nextPlayerId}`
      );

      if (!nextPlayer) {
        this.log(
          `Error: Next player with ID ${nextPlayerId} not found in 'this.players' map. This should not happen.`
        );
        this.io.to(this.roomId).emit(NEXT_TURN, nextPlayerId);
        return;
      }

      if (nextPlayer.disconnected) {
        this.log(
          `Next player ${nextPlayerId} (${nextPlayer.name}) is disconnected. Skipping turn.`
        );
        // Recursive call is safe here because we'll release the lock first
        this.turnLock = false;
        this.handleNextTurn();
        return;
      }

      this.io.to(this.roomId).emit(NEXT_TURN, nextPlayerId);
      this.log(
        `Emitted NEXT_TURN for player ${nextPlayerId} (${nextPlayer.name})`
      );

      if (nextPlayer.isComputer) {
        this.log(
          `Next player ${nextPlayerId} is a CPU. Scheduling their turn.`
        );
        this.scheduleComputerTurn(nextPlayer, 1200);
      }
    } finally {
      this.turnLock = false;
    }
  }

  private playComputerTurn(computerPlayer: Player): void {
    // 🔥 CRITICAL: Additional validation to prevent invalid computer turns
    if (this.destroyed || !this.gameState.started) {
      this.log(
        `CPU ${computerPlayer.id} turn skipped: game destroyed or not started.`
      );
      return;
    }

    if (
      this.gameState.players[this.gameState.currentPlayerIndex] !==
      computerPlayer.id
    ) {
      this.log(
        `CPU ${computerPlayer.id} turn skipped: not their turn. Current player: ${
          this.gameState.players[this.gameState.currentPlayerIndex]
        }`
      );
      return;
    }

    if (computerPlayer.disconnected) {
      this.log(
        `CPU ${computerPlayer.id} turn skipped: player is disconnected.`
      );
      this.handleNextTurn();
      return;
    }

    const bestPlay =
      this.findBestPlayForComputer(computerPlayer, 'hand') ||
      this.findBestPlayForComputer(computerPlayer, 'upCards');

    if (bestPlay) {
      this.handlePlayCardInternal(
        computerPlayer,
        bestPlay.indices,
        bestPlay.zone,
        bestPlay.cards
      );
    } else if (computerPlayer.downCards.length > 0) {
      const downCardToPlay = computerPlayer.downCards[0];
      this.handlePlayCardInternal(computerPlayer, [0], 'downCards', [
        downCardToPlay,
      ]);
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
        player.disconnectedAt = new Date();
        this.socketIdToPlayerId.delete(socket.id);

        this.log(
          `Player ${player.name} (${playerId}) disconnected. Setting grace period for reconnection.`
        );

        const activePlayers = Array.from(this.players.values()).filter(
          (p: Player) => !p.disconnected
        );

        if (activePlayers.length === 0 && this.gameState.started) {
          // Don't immediately end the game, give players time to reconnect
          this.log(
            'All players disconnected, but keeping game alive for potential reconnections'
          );
          // 🔥 Use tracked timeout system
          const timeoutId = setTimeout(() => {
            this.gameTimeouts.delete(timeoutId);
            if (!this.destroyed) {
              const stillAllDisconnected = Array.from(
                this.players.values()
              ).every((p) => p.disconnected);
              if (stillAllDisconnected) {
                this.log(
                  'All players still disconnected after grace period, ending game'
                );
                this.gameState.endGameInstance();
              }
            }
          }, 300000); // 5 minute grace period
          this.gameTimeouts.add(timeoutId);
        } else if (
          this.gameState.started &&
          playerId === this.gameState.players[this.gameState.currentPlayerIndex]
        ) {
          this.log(
            `Current player ${player.name} disconnected, advancing turn after delay`
          );
          // Give the player a chance to reconnect before skipping their turn
          // 🔥 Use tracked timeout system
          const timeoutId = setTimeout(() => {
            this.gameTimeouts.delete(timeoutId);
            if (!this.destroyed) {
              const currentPlayer = this.players.get(playerId);
              if (currentPlayer && currentPlayer.disconnected) {
                this.handleNextTurn();
              }
            }
          }, 30000); // 30 second grace period for current player's turn
          this.gameTimeouts.add(timeoutId);
          return;
        }
      }
    }
    this.pushState();
    this.pushLobbyState();
  }

  // 🔥 CRITICAL: Throttled state pushing to prevent spam and improve performance
  private pushState(): void {
    // Disable throttling in test environments for immediate state updates
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      this.executePushState();
      return;
    }

    // Only throttle if we've had recent rapid emissions
    const now = Date.now();
    const timeSinceLastEmit = now - this.lastStateEmit;

    // Allow immediate emission for the first call or after sufficient delay
    if (
      this.lastStateEmit === 0 ||
      timeSinceLastEmit >= this.eventThrottleDelay
    ) {
      this.lastStateEmit = now;
      this.executePushState();
    } else {
      // Queue this update for throttled emission
      this.pendingStateUpdates.add('state-update');
      this.scheduleThrottledUpdate();
    }
  }

  private executePushState(): void {
    const currentPlayerId =
      this.gameState.started &&
      this.gameState.players.length > 0 &&
      this.gameState.currentPlayerIndex >= 0 &&
      this.gameState.currentPlayerIndex < this.gameState.players.length
        ? this.gameState.players[this.gameState.currentPlayerIndex]
        : undefined;

    const stateForEmit: GameStateData = {
      players: Array.from(this.players.values()).map(
        (player: Player): ClientStatePlayer => {
          const isSelf =
            player.socketId &&
            this.io.sockets.sockets.get(player.socketId) !== undefined;
          return {
            id: player.id,
            name: player.name,
            hand: isSelf || player.isComputer ? player.hand : undefined,
            handCount: player.hand.length,
            upCards: player.upCards,
            upCount: player.upCards.length,
            downCards: isSelf
              ? player.downCards
              : player.downCards.map(
                  () => ({ value: '?', suit: '?', back: true }) as Card
                ),
            downCount: player.downCards.length,
            disconnected: player.disconnected,
          };
        }
      ),
      pile: this.gameState.pile,
      discardCount: this.gameState.discard.length,
      deckSize: this.gameState.deck?.length || 0,
      currentPlayerId: currentPlayerId,
      started: this.gameState.started,
      lastRealCard: this.gameState.lastRealCard,
    };

    // Emit personalized state to each connected player
    this.players.forEach((playerInstance) => {
      if (playerInstance.socketId && !playerInstance.disconnected) {
        const targetSocket = this.io.sockets.sockets.get(
          playerInstance.socketId
        );
        if (targetSocket) {
          const personalizedState: GameStateData = {
            ...stateForEmit,
            players: stateForEmit.players.map((p) => ({
              ...p,
              hand: p.id === playerInstance.id ? p.hand : undefined,
              downCards:
                p.id === playerInstance.id
                  ? p.downCards
                  : p.downCards?.map(
                      () => ({ value: '?', suit: '?', back: true }) as Card
                    ),
            })),
          };
          targetSocket.emit(STATE_UPDATE, personalizedState);
        }
      }
    });
    // Always emit a generic STATE_UPDATE to the room for listeners (testability, clients)
    this.io.to(this.roomId).emit(STATE_UPDATE, stateForEmit);
  }

  // 🔥 CRITICAL: Race condition prevention methods
  private scheduleComputerTurn(player: Player, delay: number): void {
    if (this.destroyed) return;

    const timeoutId = setTimeout(() => {
      this.gameTimeouts.delete(timeoutId);
      if (!this.destroyed) {
        this.playComputerTurn(player);
      }
    }, delay);
    this.gameTimeouts.add(timeoutId);
  }

  private scheduleStateUpdate(): void {
    if (this.destroyed || this.stateUpdateScheduled) return;

    this.stateUpdateScheduled = true;
    process.nextTick(() => {
      if (!this.destroyed) {
        this.pushState();
      }
      this.stateUpdateScheduled = false;
    });
  }

  // 🚀 PERFORMANCE: Event throttling and batching for better scalability
  private scheduleThrottledUpdate(): void {
    if (this.destroyed) return;

    const delay = Math.max(
      this.eventThrottleDelay - (Date.now() - this.lastStateEmit),
      0
    );

    const timeoutId = setTimeout(() => {
      this.gameTimeouts.delete(timeoutId);
      if (!this.destroyed && this.pendingStateUpdates.has('state-update')) {
        this.pendingStateUpdates.delete('state-update');
        this.executePushState();
      }
    }, delay);
    this.gameTimeouts.add(timeoutId);
  }

  private batchEvent(eventType: string, data: any): void {
    if (this.destroyed) return;

    if (!this.batchedEventQueue.has(eventType)) {
      this.batchedEventQueue.set(eventType, []);
    }

    this.batchedEventQueue.get(eventType)!.push(data);

    // Process batched events on next tick
    process.nextTick(() => this.processBatchedEvents());
  }

  private processBatchedEvents(): void {
    if (this.destroyed || this.batchedEventQueue.size === 0) return;

    for (const [eventType, events] of this.batchedEventQueue) {
      if (events.length > 0) {
        // For state updates, only send the latest one
        if (eventType === 'state-update') {
          this.executePushState();
        } else {
          // For other events, send them all as a batch
          this.io.to(this.roomId).emit(`${eventType}-batch`, events);
        }
      }
    }

    this.batchedEventQueue.clear();
  }

  private clearAllTimeouts(): void {
    this.gameTimeouts.forEach((id) => clearTimeout(id));
    this.gameTimeouts.clear();
  }

  public destroy(): void {
    this.log('Destroying GameController and cleaning up resources');
    this.destroyed = true;
    this.clearAllTimeouts();

    // 🚀 PERFORMANCE: Comprehensive memory cleanup
    this.pendingStateUpdates.clear();
    this.batchedEventQueue.clear();

    // Clear all socket listeners to prevent memory leaks
    this.players.forEach((player) => {
      if (player.socketId) {
        const socket = this.io.sockets.sockets.get(player.socketId);
        if (socket) {
          socket.removeAllListeners();
        }
      }
    });

    this.players.clear();
    this.socketIdToPlayerId.clear();
  }

  // Add this log method for internal logging
  private log(...args: any[]): void {
    console.log(`[GameController][Room ${this.roomId}]`, ...args);
  }
}
