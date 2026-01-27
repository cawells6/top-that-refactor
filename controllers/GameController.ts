import type { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import GameState from '../models/GameState.js';
import Player from '../models/Player.js';
import { getRandomAvatar } from '../src/shared/avatars.js';
import {
  JOIN_GAME,
  JOINED,
  STATE_UPDATE,
  REJOIN,
  START_GAME,
  NEXT_TURN,
  GAME_OVER,
  CARD_PLAYED,
  PILE_PICKED_UP,
  ERROR as ERROR_EVENT,
  SESSION_ERROR,
  PLAY_CARD,
  PICK_UP_PILE,
  LOBBY_STATE_UPDATE,
  PLAYER_READY,
  ANIMATIONS_COMPLETE,
  DEBUG_RESET_GAME,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '../src/shared/events.ts';
import {
  Card,
  ClientStatePlayer,
  GameStateData,
  InSessionLobbyState,
  JoinGamePayload,
  JoinGameResponse,
  RejoinData,
} from '../src/shared/types.js';
import { handleSpecialCard } from '../utils/CardLogic.js';
import { isSpecialCard, normalizeCardValue } from '../utils/cardUtils.js';

const SERVER_LOGS_ENABLED =
  process.env.TOPTHAT_VERBOSE === '1' ||
  process.env.TOPTHAT_SERVER_LOGS === '1';

function serverLog(...args: unknown[]): void {
  if (!SERVER_LOGS_ENABLED) return;
  console.log(...args);
}

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// interface PlayerJoinData {
//   id?: string;
//   name?: string;
//   numHumans?: number;
//   numCPUs?: number;
// }

interface StartGameOptions {
  computerCount?: number;
  socket?: TypedSocket;
}

interface PlayData {
  cardIndices: number[];
}

export class GameRoomManager {
  private io: TypedServer;
  private rooms: Map<string, GameController>;
  private cleanupInterval: NodeJS.Timeout;

  constructor(io: Server) {
    this.io = io as unknown as TypedServer;
    this.rooms = new Map();
    this.io.on('connection', (socket: Socket) => {
      const typedSocket = socket as unknown as TypedSocket;
      serverLog(`[SERVER] Socket connected: ${socket.id}`);

      typedSocket.on(
        JOIN_GAME,
        (playerData: JoinGamePayload, ack?: (response: JoinGameResponse) => void) => {
          serverLog(
            `[SERVER] Received JOIN_GAME from ${socket.id}:`,
            playerData
          );
          this.handleClientJoinGame(typedSocket, playerData, ack);
        }
      );

      typedSocket.on(
        REJOIN,
        (rejoinData: RejoinData, ack?: (response: JoinGameResponse) => void) => {
          if (!rejoinData || !rejoinData.roomId || !rejoinData.playerId) {
            if (typeof ack === 'function') {
              ack({ success: false, error: 'Invalid rejoin data.' });
            }
            typedSocket.emit(SESSION_ERROR, 'Invalid rejoin data.');
            return;
          }

          const normalizedRoomId = this.normalizeRoomId(rejoinData.roomId);
          const controller = this.rooms.get(normalizedRoomId);
          if (controller) {
            controller.publicHandleRejoin(
              typedSocket,
              normalizedRoomId,
              rejoinData.playerId,
              ack
            );
          } else {
            if (typeof ack === 'function') {
              ack({ success: false, error: 'Room not found' });
            }
            typedSocket.emit(SESSION_ERROR, 'Room not found for rejoin.');
          }
        }
      );
    });

    this.cleanupInterval = setInterval(() => {
      for (const [roomId, controller] of this.rooms.entries()) {
        const hasActivePlayers = Array.from(
          controller['players'].values()
        ).some((p) => !p.disconnected);
        if (!hasActivePlayers && !controller['gameState'].started) {
          this.rooms.delete(roomId);
        }
      }
    }, 60000);
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  private handleClientJoinGame(
    socket: TypedSocket,
    playerData: JoinGamePayload,
    ack?: (
      response: JoinGameResponse
    ) => void
  ): void {
    serverLog(
      `[SERVER] Processing JOIN_GAME for socket ${socket.id}, data:`,
      playerData
    );

    // Use playerData.roomId instead of playerData.id
    let roomId = playerData.roomId
      ? this.normalizeRoomId(playerData.roomId)
      : undefined;
    let controller: GameController | undefined;

    if (roomId) {
      controller = this.rooms.get(roomId);
      if (!controller) {
        serverLog(
          `[SERVER] Room ${roomId} not found for JOIN_GAME from ${socket.id}`
        );
        if (typeof ack === 'function') {
          serverLog(
            `[SERVER] Sending error response to ${socket.id}: Room not found`
          );
          ack({ success: false, error: 'Room not found.' });
        }
        socket.emit(SESSION_ERROR, 'Room not found.');
        return;
      }
    }

    if (!controller) {
      roomId = this.generateRoomId();
      serverLog(
        `[SERVER] Creating new room ${roomId} for JOIN_GAME from ${socket.id}`
      );
      controller = new GameController(this.io, roomId);
      this.rooms.set(roomId, controller);
    }

    // Pass a copy of playerData without the room identifier so the controller
    // assigns the joining player's ID from the socket.
    const joinData = { ...playerData, id: undefined };
    serverLog(
      `[SERVER] Calling publicHandleJoin for room ${roomId}, socket ${socket.id}`
    );
    controller.publicHandleJoin(socket, joinData, ack);
  }

  private normalizeRoomId(roomId: string): string {
    return roomId.trim().toUpperCase();
  }

  private generateRoomId(): string {
    let roomId = '';
    do {
      roomId = uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();
    } while (this.rooms.has(roomId));
    return roomId;
  }
}

export default class GameController {
  private io: TypedServer;
  private gameState: GameState;
  private players: Map<string, Player>;
  private socketIdToPlayerId: Map<string, string>;
  private roomId: string;
  private expectedHumanCount: number;
  private expectedCpuCount: number;
  private hostId: string | null = null;
  private isProcessingTurn: boolean = false;
  private gameTimeouts: Set<NodeJS.Timeout> = new Set();
  private pendingComputerTurns: Set<string> = new Set();
  private turnLock: boolean = false;
  private openingCpuFallbackTimeout: NodeJS.Timeout | null = null;

  // Transition State Management
  private isTurnTransitioning: boolean = false;
  private transitionTimeout: NodeJS.Timeout | null = null;
  private readonly turnTransitionDelayMs = 400; // The requested 400ms delay

  private readonly cpuTurnDelayMs = 2000;
  private readonly cpuSpecialDelayMs = 3000;
  constructor(io: TypedServer, roomId: string) {
    this.io = io;
    this.roomId = roomId;
    this.gameState = new GameState();
    this.players = new Map<string, Player>();
    this.socketIdToPlayerId = new Map<string, string>();
    this.expectedHumanCount = 1;
    this.expectedCpuCount = 0;
  }

  public attachSocketEventHandlers(socket: TypedSocket): void {
    this.log(`Attaching event handlers for socket ${socket.id}`);

    socket.removeAllListeners(START_GAME);
    socket.removeAllListeners(PLAY_CARD);
    socket.removeAllListeners(PICK_UP_PILE);
    socket.removeAllListeners(PLAYER_READY);
    socket.removeAllListeners(DEBUG_RESET_GAME);
    socket.removeAllListeners('disconnect');

    socket.on(START_GAME, () => this.handleStartGame({ socket }));
    socket.on(PLAY_CARD, (data: PlayData) => this.handlePlayCard(socket, data));
    socket.on(PICK_UP_PILE, () => this.handlePickUpPile(socket));
    socket.on(ANIMATIONS_COMPLETE, () => this.handleAnimationsComplete(socket));
    socket.on(PLAYER_READY, ({ isReady }: { isReady: boolean }) => {
      const playerId = this.socketIdToPlayerId.get(socket.id);
      if (playerId) {
        const player = this.players.get(playerId);
        if (player) {
          if (player.id !== this.hostId) {
            player.status = isReady ? 'ready' : 'joined';
          }
          this.pushLobbyState();
          this.checkIfGameCanStart();
        }
      }
    });
    socket.on(DEBUG_RESET_GAME, () => this.log('DEBUG_RESET_GAME received (no-op)'));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  private pushLobbyState(): void {
    const lobbyPlayers = Array.from(this.players.values()).map((p: Player) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar, // Include avatar
      status: p.status,
      isComputer: p.isComputer, // Include bot information
      isSpectator: p.isSpectator,
    }));

    const lobbyState: InSessionLobbyState = {
      roomId: this.roomId,
      hostId: this.hostId,
      players: lobbyPlayers,
      started: this.gameState.started, // Add started property
      expectedHumanCount: this.expectedHumanCount,
      expectedCpuCount: this.expectedCpuCount,
    };

    // console.log('[SERVER] Emitting LOBBY_STATE_UPDATE:', lobbyState);
    this.io.to(this.roomId).emit(LOBBY_STATE_UPDATE, lobbyState);
  }

  /**
   * Determine if all human players are ready and start the game automatically.
   * The host is considered ready by default.
   */
  private checkIfGameCanStart(): void {
    this.log('[checkIfGameCanStart] Called');
    if (this.expectedHumanCount <= 0) {
      this.log(
        '[checkIfGameCanStart] Expected human count is 0 or less, returning'
      );
      return;
    }
    const humanPlayers = this.getHumanPlayers();
    const allHumansReady = humanPlayers.every(
      (p) => p.status === 'host' || p.status === 'ready'
    );
    this.log(
      `[checkIfGameCanStart] Human players: ${humanPlayers.length}, Expected: ${this.expectedHumanCount}, All ready: ${allHumansReady}, Started: ${this.gameState.started}`
    );
    // Check if we have all expected human players and they're ready
    if (
      humanPlayers.length === this.expectedHumanCount &&
      allHumansReady &&
      !this.gameState.started
    ) {
      this.log(
        `[checkIfGameCanStart] Starting game with ${this.expectedCpuCount} CPUs`
      );
      this.handleStartGame({ computerCount: this.expectedCpuCount });
    }
  }

  public publicHandleJoin(
    socket: TypedSocket,
    playerData: JoinGamePayload,
    ack?: (response: JoinGameResponse) => void
  ): void {
    serverLog(
      `[SERVER] publicHandleJoin for socket ${socket.id}, data:`,
      playerData
    );
    this.attachSocketEventHandlers(socket);
    this.handleJoin(socket, playerData, ack);
  }

  public publicHandleRejoin(
    socket: TypedSocket,
    roomId: string,
    playerId: string,
    ack?: (response: JoinGameResponse) => void
  ): void {
    this.attachSocketEventHandlers(socket);
    this.handleRejoin(socket, roomId, playerId, ack);
  }

  private handleRejoin(
    socket: TypedSocket,
    roomId: string,
    playerId: string,
    ack?: (response: JoinGameResponse) => void
  ): void {
    if (roomId !== this.roomId) {
      if (typeof ack === 'function') {
        ack({ success: false, error: 'Invalid room for rejoin.' });
      }
      socket.emit(SESSION_ERROR, 'Invalid room for rejoin.');
      return;
    }
    const player = this.players.get(playerId);
    if (player) {
      socket.join(this.roomId);
      player.socketId = socket.id;
      player.disconnected = false;
      this.socketIdToPlayerId.set(socket.id, playerId);
      this.syncPlayersWithGameState();

      if (
        !this.ensureValidState('handleRejoin', {}, () => {
          if (typeof ack === 'function') {
            ack({ success: false, error: 'Invalid game state.' });
          }
        })
      ) {
        return;
      }

      socket.emit(JOINED, {
        success: true,
        roomId: this.roomId,
        playerId: player.id,
      });
      this.log(`Emitted JOINED to rejoining player ${player.name}`);

      this.pushState();
      this.pushLobbyState();
      this.log(
        `Pushed state and lobby info to room ${this.roomId} after rejoin.`
      );
      if (typeof ack === 'function') {
        ack({ success: true, roomId: this.roomId, playerId: player.id });
      }
    } else {
      this.log(`Rejoin failed: Player ${playerId} not found in this room.`);
      if (typeof ack === 'function') {
        ack({
          success: false,
          error: `Player ${playerId} not found for rejoin.`,
        });
      }
      socket.emit(SESSION_ERROR, `Player ${playerId} not found for rejoin.`);
    }
  }

  private handleJoin(
    socket: TypedSocket,
    playerData: JoinGamePayload,
    ack?: (response: JoinGameResponse) => void
  ): void {
    const isHostJoining = this.players.size === 0;
    const isSpectator = playerData.spectator === true;

    // --- Payload validation (always require a name) ---
    if (
      typeof playerData.playerName !== 'string' ||
      !playerData.playerName.trim()
    ) {
      if (typeof ack === 'function') {
        ack({ success: false, error: 'Invalid join payload: please provide a name.' });
      }
      return;
    }

    // --- Only validate player counts for the host creating a room ---
    if (isHostJoining) {
      const minHumans = isSpectator ? 0 : 1;
      if (
        typeof playerData.numHumans !== 'number' ||
        typeof playerData.numCPUs !== 'number' ||
        playerData.numHumans < minHumans ||
        playerData.numCPUs < 0 ||
        playerData.numHumans + playerData.numCPUs < 2 ||
        playerData.numHumans + playerData.numCPUs > this.gameState.maxPlayers
      ) {
        if (typeof ack === 'function') {
          ack({ success: false, error: 'Invalid join payload: check name and player counts.' });
        }
        return;
      }
    }

    // console.log('[SERVER] handleJoin: playerData', playerData);
    let id = playerData.id || socket.id;
    let name =
      typeof playerData.playerName === 'string' && playerData.playerName.trim()
        ? playerData.playerName.trim()
        : `Player-${id.substring(0, 4)}`;
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
      this.log('[DEBUG] Emitting ERROR_EVENT: duplicate join');
      callAck({ success: false, error: `Player ID '${id}' is already active in a game.` });
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
                callAck({ success: true, roomId: this.roomId, playerId: id });
              } else {
                callAck({ success: false, error: rejoinAck.error || 'Rejoin failed' });
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
      this.log('[DEBUG] Emitting ERROR_EVENT: game already started');
      if (typeof ack === 'function') {
        ack({ success: false, error: 'Game has already started. Cannot join.' });
      }
      return;
    }

    if (!isHostJoining) {
      const currentHumanCount = this.getHumanPlayers().length;
      if (!isSpectator && currentHumanCount >= this.expectedHumanCount) {
        this.log(
          `Room '${this.roomId}' already has ${currentHumanCount} human players (expected ${this.expectedHumanCount}). Rejecting join for ${name}.`
        );
        if (typeof ack === 'function') {
          ack({ success: false, error: 'Room is full.' });
        }
        return;
      }
    }
    const activePlayerCount = this.getActivePlayers().length;
    if (!isSpectator && activePlayerCount >= this.gameState.maxPlayers) {
      this.log(
        `Game room is full. Player '${name}' cannot join. Emitting ERROR_EVENT.`
      );
      this.log('[DEBUG] Emitting ERROR_EVENT: room full');
      callAck({ success: false, error: 'Game room is full.' });
      return;
    }

    this.log(`Adding player '${name}' (ID: ${id}) to game state.`);
    if (!isSpectator) {
      this.gameState.addPlayer(id);
    }
    const player = new Player(id);
    player.name = name;
    player.avatar = playerData.avatar || getRandomAvatar().icon;
    player.socketId = socket.id;
    player.isSpectator = isSpectator;
    if (this.players.size === 0) {
      this.hostId = id;
      player.status = 'host';
      // Set expected player counts from payload if provided
      if (
        typeof playerData.numHumans === 'number' &&
        playerData.numHumans >= 0 &&
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

    socket.join(this.roomId);
    this.syncPlayersWithGameState();
    if (
      !this.ensureValidState('handleJoin', {}, () => {
        if (typeof ack === 'function') {
          ack({ success: false, error: 'Invalid game state.' });
        }
      })
    ) {
      return;
    }
    this.log(
      `Player '${name}' (Socket ID: ${socket.id}) joined room '${this.roomId}'. Emitting JOINED.`
    );
    serverLog('[SERVER] Emitting JOINED to socket', socket.id, {
      success: true,
      roomId: this.roomId,
      playerId: player.id,
    });
    socket.emit(JOINED, {
      success: true,
      roomId: this.roomId,
      playerId: player.id,
    });
    if (typeof ack === 'function') {
      serverLog(`[SERVER] Calling JOIN_GAME ack for socket ${socket.id}`);
      ack({ success: true, roomId: this.roomId, playerId: player.id });
    }

    // Keep the in-session lobby modal in sync for all players.
    this.pushLobbyState();

    // Always push state after join, even if not enough players
    this.pushState();

    // Auto-start if the expected human count is already satisfied.
    this.checkIfGameCanStart();
  }

  private async handleStartGame(opts: StartGameOptions): Promise<void> {
    this.clearAllTimeouts();
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

    this.syncPlayersWithGameState({
      ensureHostFirst: Boolean(requestingSocket),
    });
    if (requestingSocket) {
      this.log(
        `Reordered players so host is first: ${this.gameState.players.join(', ')}`
      );
    }

    const currentHumanPlayers = this.getHumanPlayers().length;
    const activePlayerCount = this.getActivePlayers().length;

    this.log(
      `Current human players: ${currentHumanPlayers}. Desired CPUs: ${computerCount}. Total players before adding CPUs: ${activePlayerCount}`
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
      if (this.getActivePlayers().length >= this.gameState.maxPlayers) {
        this.log('Max players reached, cannot add more CPUs.');
        break;
      }
      const cpuId = `COMPUTER_${i + 1}`;
      if (!this.players.has(cpuId)) {
        // Track existing player names to avoid duplicates
        const usedNames = new Set<string>();
        this.players.forEach((p) => {
          if (p.name) usedNames.add(p.name);
        });

        const cpuPlayer = new Player(cpuId);

        // Randomize Bot Identity (name comes from filename-based label)
        const usedAvatarIds = new Set<string>();
        this.players.forEach((p) => {
          if (!p.avatar) return;
          const match = /\/([^/]+)\.png$/i.exec(p.avatar);
          if (match?.[1]) usedAvatarIds.add(match[1]);
        });

        const randomAvatar = getRandomAvatar(usedAvatarIds);
        cpuPlayer.name = randomAvatar.label;
        cpuPlayer.avatar = randomAvatar.icon;

        cpuPlayer.isComputer = true;
        this.players.set(cpuId, cpuPlayer);
        this.log(
          `Added CPU player ${cpuId}. Total players now: ${this.players.size}`
        );
      }
    }
    this.log(
      `Finished adding CPUs. Total players in this.players: ${this.players.size}. Players in gameState: ${this.gameState.players.length}`
    );

    this.syncPlayersWithGameState({
      ensureHostFirst: Boolean(requestingSocket),
    });

    if (
      !this.ensureValidState('handleStartGame:pre-start', {}, () => {
        const errorMsg = 'Invalid game state. Start aborted.';
        this.log(`Start game failed: ${errorMsg}`);
        if (requestingSocket) requestingSocket.emit(ERROR_EVENT, errorMsg);
      })
    ) {
      return;
    }

    this.gameState.startGameInstance();
    this.log(
      `Game instance started. Players in gameState after start: ${this.gameState.players.join(', ')}`
    );

    if (
      !this.ensureValidState(
        'handleStartGame:post-start',
        { requiresStarted: true },
        () => {
          const errorMsg = 'Invalid game state after start. Start aborted.';
          this.log(`Start game failed: ${errorMsg}`);
          this.gameState.started = false;
          if (requestingSocket) requestingSocket.emit(ERROR_EVENT, errorMsg);
        }
      )
    ) {
      return;
    }

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

    if (this.gameState.deck && this.gameState.deck.length > 0) {
      const starterCard = this.gameState.deck.pop();
      if (starterCard) {
        const normalizedValue = normalizeCardValue(starterCard.value);
        this.gameState.addToPile(starterCard);
        if (normalizedValue !== 'five') {
          this.gameState.lastRealCard = starterCard;
        }
      }
    }

    this.gameState.started = true;

    const playerCount = this.gameState.players.length;
    // Deterministic starting player (keeps tests stable and aligns with host-first ordering).
    this.gameState.currentPlayerIndex = 0;

    const firstPlayerId =
      this.gameState.players[this.gameState.currentPlayerIndex];
    this.log(
      `Game started successfully. First player: ${firstPlayerId} (index ${this.gameState.currentPlayerIndex}/${playerCount}). Emitting NEXT_TURN and pushing state.`
    );

    this.pushState();
    this.io.to(this.roomId).emit(NEXT_TURN, { currentPlayerId: firstPlayerId });

    // Keep lobby state in sync after start so clients can hide the modal.
    this.pushLobbyState();

    // Note: CPU turns are scheduled when client emits 'animations-complete' event
    // This ensures CPU waits for dealing animation + "LET'S GO!" overlay to finish

    // Failsafe: if no client ever emits ANIMATIONS_COMPLETE (e.g., animation is skipped
    // or errors), the game can stall forever on a CPU's opening turn.
    const firstPlayer = this.players.get(firstPlayerId);
    if (firstPlayer?.isComputer) {
      this.scheduleOpeningCpuFallback(firstPlayerId);
    }
  }

  /**
   * Public wrapper around the private start logic so external callers (like the Lobby)
   * can trigger the game start without exposing the full internal options type.
   */
  public startGame(computerCount = 0, socket?: TypedSocket): Promise<void> {
    return this.handleStartGame({ computerCount, socket });
  }

  private ensureValidState(
    context: string,
    options: { requiresStarted?: boolean } = {},
    onInvalid?: () => void
  ): boolean {
    if (this.validateState(context, options)) {
      return true;
    }
    if (onInvalid) {
      onInvalid();
    }
    return false;
  }

  private getActivePlayers(): Player[] {
    return Array.from(this.players.values()).filter((p) => !p.isSpectator);
  }

  private getHumanPlayers(): Player[] {
    return this.getActivePlayers().filter((p) => !p.isComputer);
  }

  private syncPlayersWithGameState(
    options: { ensureHostFirst?: boolean } = {}
  ): void {
    const currentPlayerId =
      this.gameState.currentPlayerIndex >= 0 &&
      this.gameState.currentPlayerIndex < this.gameState.players.length
        ? this.gameState.players[this.gameState.currentPlayerIndex]
        : undefined;

    const activePlayerIds = this.getActivePlayers().map((p) => p.id);
    const orderedPlayerIds = this.gameState.players.filter((id) =>
      activePlayerIds.includes(id)
    );
    for (const id of activePlayerIds) {
      if (!orderedPlayerIds.includes(id)) {
        orderedPlayerIds.push(id);
      }
    }

    if (options.ensureHostFirst && this.hostId) {
      const hostIndex = orderedPlayerIds.indexOf(this.hostId);
      if (hostIndex > 0) {
        orderedPlayerIds.splice(hostIndex, 1);
        orderedPlayerIds.unshift(this.hostId);
      }
    }

    this.gameState.players = orderedPlayerIds;

    if (this.gameState.players.length === 0) {
      this.gameState.currentPlayerIndex = -1;
      return;
    }

    if (currentPlayerId && this.gameState.players.includes(currentPlayerId)) {
      this.gameState.currentPlayerIndex =
        this.gameState.players.indexOf(currentPlayerId);
      return;
    }

    if (
      this.gameState.currentPlayerIndex < 0 ||
      this.gameState.currentPlayerIndex >= this.gameState.players.length
    ) {
      this.gameState.currentPlayerIndex = 0;
    }
  }

  private validateState(
    context: string,
    options: { requiresStarted?: boolean } = {}
  ): boolean {
    const errors: string[] = [];
    const playerIds = this.gameState.players;
    const uniqueCount = new Set(playerIds).size;

    if (uniqueCount !== playerIds.length) {
      errors.push('duplicate player IDs in gameState');
    }
    if (playerIds.length > this.gameState.maxPlayers) {
      errors.push('player count exceeds maxPlayers');
    }
    const missingPlayers = playerIds.filter((id) => !this.players.has(id));
    if (missingPlayers.length > 0) {
      errors.push(`missing player data for ${missingPlayers.join(', ')}`);
    }
    if (this.players.size > 0 && !this.hostId) {
      errors.push('hostId missing while players exist');
    }
    if (this.hostId && !this.players.has(this.hostId)) {
      errors.push('hostId not found in players map');
    }
    const hostPlayer = this.hostId ? this.players.get(this.hostId) : undefined;
    if (
      this.hostId &&
      this.gameState.players.length > 0 &&
      !hostPlayer?.isSpectator &&
      !playerIds.includes(this.hostId)
    ) {
      errors.push('hostId missing from gameState players');
    }
    if (options.requiresStarted) {
      if (!this.gameState.started) {
        errors.push('game not started');
      }
      if (playerIds.length < 2) {
        errors.push('not enough players for started game');
      }
      if (
        this.gameState.currentPlayerIndex < 0 ||
        this.gameState.currentPlayerIndex >= playerIds.length
      ) {
        errors.push('currentPlayerIndex out of bounds');
      }
      if (!this.gameState.deck) {
        errors.push('deck missing for started game');
      }
    }

    if (errors.length > 0) {
      this.log(`[STATE VALIDATION] ${context}: ${errors.join(' | ')}`);
      return false;
    }
    return true;
  }

  private handlePlayCard(
    socket: TypedSocket,
    { cardIndices }: PlayData
  ): void {
    const playerId = this.socketIdToPlayerId.get(socket.id);
    this.log(
      `Handling play card request from socket ${socket.id} (Player ID: ${playerId}). Indices: ${cardIndices}`
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

    // --- GUARD: Block input during turn transition ---
    if (this.isTurnTransitioning) {
      socket.emit(ERROR_EVENT, 'Turn is changing, please wait.');
      return;
    }

    if (
      this.gameState.players[this.gameState.currentPlayerIndex] !== playerId
    ) {
      socket.emit(ERROR_EVENT, 'Not your turn.');
      return;
    }

    const requiredZone =
      player.hand.length > 0
        ? 'hand'
        : player.getUpCardCount() > 0
          ? 'upCards'
          : player.downCards.length > 0
            ? 'downCards'
            : null;
    if (!requiredZone) {
      socket.emit(ERROR_EVENT, 'No cards available to play.');
      return;
    }

    const zone = requiredZone;

    if (!cardIndices || cardIndices.length === 0) {
      socket.emit(ERROR_EVENT, 'No cards selected to play.');
      return;
    }

    if (
      (zone === 'upCards' || zone === 'downCards') &&
      cardIndices.length !== 1
    ) {
      socket.emit(ERROR_EVENT, 'Can only play one card from this stack.');
      return;
    }

    const cardsToPlay: Card[] = [];
    let sourceZone: Array<Card | null> | Card[] | undefined;
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
      const card = sourceZone[index] as Card | null | undefined;
      if (!card) {
        socket.emit(ERROR_EVENT, 'Selected card slot is empty.');
        return;
      }
      cardsToPlay.push(card);
    }

    this.handlePlayCardInternal(player, cardIndices, zone, cardsToPlay);
  }

  /**
   * Helper to handle the "beat" between turns.
   * This immediately shows the played card (via pushState), then waits, then advances the turn.
   */
  private processTurnTransition(
    delayMs: number,
    nextTurnOptions: { cpuDelayMs?: number } = {}
  ): void {
    this.isTurnTransitioning = true;
    // 1. Show the card on the pile immediately
    this.pushState();

    // 2. Wait for the delay
    if (this.transitionTimeout) clearTimeout(this.transitionTimeout);
    this.transitionTimeout = setTimeout(() => {
      this.transitionTimeout = null;
      this.isTurnTransitioning = false;

      // 3. Advance the game state to the next player
      this.handleNextTurn(nextTurnOptions);

      // 4. Update state again so everyone sees the new current player
      this.pushState();
    }, delayMs);
  }

  private handlePlayCardInternal(
    player: Player,
    cardIndices: number[],
    zone: 'hand' | 'upCards' | 'downCards',
    cardsToPlay: Card[]
  ): void {
    if (
      !this.ensureValidState('handlePlayCardInternal', {
        requiresStarted: true,
      })
    ) {
      return;
    }
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
    const normalizedFirstValue = normalizeCardValue(cardsToPlay[0].value);
    const fourOfKindPlayed =
      cardsToPlay.length >= 4 &&
      normalizedFirstValue !== null &&
      normalizedFirstValue !== undefined &&
      cardsToPlay.every(
        (card) => normalizeCardValue(card.value) === normalizedFirstValue
      );
    if (!isValid) {
      // Logic: If playing Up/Down card, and it's invalid:
      // 1. If they have OTHER valid cards in that zone, force them to play those (Error).
      // 2. If they have NO valid cards in that zone, allow the 'fail' (Pick up pile + card).

      const isUpOrDown = zone === 'upCards' || zone === 'downCards';

      if (isUpOrDown) {
        // Check if they *could* have made a valid move
        // (For downCards, we assume 'false' because you can't know what they are)
        const hasBetterMove =
          zone === 'upCards' && this.hasValidPlay(player, 'upCards');

        if (hasBetterMove) {
          // Reject: You typically can't burn a card if you have a legal move available
          const playerSocket = player.socketId
            ? this.io.sockets.sockets.get(player.socketId)
            : null;
          if (playerSocket)
            playerSocket.emit(ERROR_EVENT, 'You have a valid play available!');
          return;
        }

        // ALLOW THE FAIL:
        // 1. Identify the card they tried to play
        let failedCard: Card | null = null;

        if (zone === 'upCards') {
          // Remove from Up Cards
          const nextUpCards = [...player.upCards];
          failedCard = nextUpCards[cardIndices[0]];
          nextUpCards[cardIndices[0]] = null; // Clear slot
          player.setUpCards(nextUpCards);
        } else {
          // Remove from Down Cards (reveal it)
          failedCard = player.playDownCard(cardIndices[0]) ?? cardsToPlay[0];
        }

        // 2. Collect Pile + Failed Card
        const pickupCards = [...this.gameState.pile];
        if (failedCard) pickupCards.push(failedCard);

        // 3. Give to Player & Clear Board
        player.pickUpPile(pickupCards);
        this.gameState.clearPile({ toDiscard: false });

        // 4. Notify & Transition

        this.io.to(this.roomId).emit(PILE_PICKED_UP, {
          playerId: player.id,
          pileSize: pickupCards.length,
        });
        this.log(`Invalid ${zone} play by ${player.id}. Forced pickup.`);

        // Trigger turn transition
        this.processTurnTransition(1600);
        return;
      }

      // Existing logic for Hand/other invalid plays (reject them)
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
            this.pushState();
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
      const nextUpCards = [...player.upCards];
      for (const index of cardIndices) {
        if (index >= 0 && index < nextUpCards.length) {
          nextUpCards[index] = null;
        }
      }
      player.setUpCards(nextUpCards);
    } else if (zone === 'downCards') {
      player.playDownCard(cardIndices[0]);
    }

    cardsToPlay.forEach((card) => {
      const normalizedValue = normalizeCardValue(card.value);
      const playedCardForPile: Card = { ...card, copied: undefined };
      this.gameState.addToPile(playedCardForPile);

      if (normalizedValue !== 'five') {
        this.gameState.lastRealCard = playedCardForPile;
      }
    });

    this.io
      .to(this.roomId)
      .emit(CARD_PLAYED, {
        playerId: player.id,
        cards: cardsToPlay,
        newPileSize: this.gameState.pile.length,
        pileTop:
          this.gameState.pile.length > 0
            ? this.gameState.pile[this.gameState.pile.length - 1]
            : null,
      });
    this.log(
      `Emitted CARD_PLAYED for player ${player.id}. Cards: ${JSON.stringify(cardsToPlay)}`
    );

    const { pileClearedBySpecial } = handleSpecialCard(
      this.io as unknown as Server,
      this.gameState,
      player,
      cardsToPlay,
      this.roomId,
      { fourOfKindPlayed }
    );

    const specialEffectTriggered =
      fourOfKindPlayed || isSpecialCard(cardsToPlay[0]?.value);

    if (player.hasEmptyHand() && player.hasEmptyUp() && player.hasEmptyDown()) {
      this.log(
        `Player ${player.id} (${player.name}) has played all cards. Game Over!`
      );
      this.io
        .to(this.roomId)
        .emit(GAME_OVER, { winnerId: player.id, winnerName: player.name });
      this.gameState.endGameInstance();
      this.clearAllTimeouts();
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
        `Player ${player.id} burned the pile. Passing turn to next player (Pile Empty).`
      );
    }

    this.log('Proceeding to next turn via transition.');
    // Trigger the delayed transition
    this.processTurnTransition(this.turnTransitionDelayMs, {
      cpuDelayMs: specialEffectTriggered ? this.cpuSpecialDelayMs : undefined,
    });
  }

  private handlePickUpPile(socket: TypedSocket): void {
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

    const requiredZone =
      player.hand.length > 0
        ? 'hand'
        : player.getUpCardCount() > 0
          ? 'upCards'
          : player.downCards.length > 0
            ? 'downCards'
            : null;
    if (!requiredZone) {
      socket.emit(ERROR_EVENT, 'No cards available to play.');
      return;
    }
    if (requiredZone === 'downCards') {
      socket.emit(ERROR_EVENT, 'You must play a down card.');
      return;
    }
    if (this.hasValidPlay(player, requiredZone)) {
      socket.emit(ERROR_EVENT, 'You have a playable card.');
      return;
    }

    this.handlePickUpPileInternal(player);
  }

  private handlePickUpPileInternal(player: Player): void {
    if (
      !this.ensureValidState('handlePickUpPileInternal', {
        requiresStarted: true,
      })
    ) {
      return;
    }
    this.log(
      `Internal pick up pile for player ${player.id} (${player.name}). Pile size: ${this.gameState.pile.length}`
    );
    if (this.gameState.pile.length === 0) {
      this.log(
        `Player ${player.id} tried to pick up an empty pile. This shouldn't typically happen unless it's a forced pickup after an invalid downcard play on an empty pile.`
      );
    } else {
      // Player picks up the entire discard pile (gameState.pile)
      const pileCount = this.gameState.pile.length;
      player.pickUpPile([...this.gameState.pile]);
      this.gameState.clearPile({ toDiscard: false });

      // Draw one card from draw pile to start the play pile again
      if (this.gameState.deck && this.gameState.deck.length > 0) {
        const newStartCard = this.gameState.deck.pop();
        if (newStartCard) {
          this.gameState.addToPile(newStartCard);
          const normalizedValue = normalizeCardValue(newStartCard.value);
          if (normalizedValue !== 'five') {
            this.gameState.lastRealCard = newStartCard;
          }
          this.log(
            `Player ${player.id} picked up ${pileCount} cards. Drew new card (${newStartCard.value} of ${newStartCard.suit}) from draw pile to play pile. Draw pile now has ${this.gameState.deck.length} cards.`
          );
        }
      } else {
        this.log(
          `Player ${player.id} picked up ${pileCount} cards. No cards left in deck to start discard pile. New hand size: ${player.hand.length}`
        );
      }

      // Notify clients so they can animate the pickup before the next state render.
      this.io.to(this.roomId).emit(PILE_PICKED_UP, {
        playerId: player.id,
        pileSize: pileCount,
      });
    }

    // Process transition with longer delay after pile pickup so clients can see the
    // blank beat + deck flip animation before the next player highlight.
    this.processTurnTransition(1600);
  }

  private hasValidPlay(player: Player, zone: 'hand' | 'upCards'): boolean {
    const cardsInZone =
      zone === 'hand'
        ? player.hand
        : player.upCards.filter((card): card is Card => Boolean(card));
    if (cardsInZone.length === 0) {
      return false;
    }
    if (zone === 'upCards') {
      return cardsInZone.some((card) => this.gameState.isValidPlay([card]));
    }

    const groups = new Map<string, Card[]>();
    for (const card of cardsInZone) {
      const key = String(normalizeCardValue(card.value) ?? card.value);
      const existing = groups.get(key);
      if (existing) {
        existing.push(card);
      } else {
        groups.set(key, [card]);
      }
    }

    for (const group of groups.values()) {
      if (this.gameState.isValidPlay(group)) {
        return true;
      }
    }
    return false;
  }

  private handleNextTurn(options: { cpuDelayMs?: number } = {}): void {
    if (!this.ensureValidState('handleNextTurn', { requiresStarted: true })) {
      return;
    }
    if (!this.gameState.started) {
      this.log('Attempted to advance turn, but game has not started.');
      return;
    }
    if (this.turnLock) {
      this.log('Turn advance ignored: turn lock active.');
      return;
    }
    this.turnLock = true;
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
      this.io.to(this.roomId).emit(NEXT_TURN, { currentPlayerId: nextPlayerId });
      this.turnLock = false;
      return;
    }

    if (nextPlayer.disconnected) {
      this.log(
        `Next player ${nextPlayerId} (${nextPlayer.name}) is disconnected. Skipping turn.`
      );
      this.turnLock = false;
      this.handleNextTurn();
      return;
    }

    this.io.to(this.roomId).emit(NEXT_TURN, { currentPlayerId: nextPlayerId });
    this.log(
      `Emitted NEXT_TURN for player ${nextPlayerId} (${nextPlayer.name})`
    );

    if (nextPlayer.isComputer) {
      this.log(`Next player ${nextPlayerId} is a CPU. Scheduling their turn.`);
      this.scheduleComputerTurn(
        nextPlayer,
        options.cpuDelayMs ?? this.cpuTurnDelayMs
      );
    }
    this.turnLock = false;
  }

  private handleAnimationsComplete(socket: TypedSocket): void {
    const playerId = this.socketIdToPlayerId.get(socket.id);
    if (!playerId) {
      this.log('[handleAnimationsComplete] No player ID found for socket');
      return;
    }

    const player = this.players.get(playerId);
    if (!player) {
      this.log('[handleAnimationsComplete] Player record missing for socket');
      return;
    }

    if (!this.gameState.started) {
      this.log(
        '[handleAnimationsComplete] Game has not started; ignoring animation completion'
      );
      return;
    }

    this.log('[handleAnimationsComplete] Client animations finished');

    // Any client reporting animations complete means it's safe to drop the startup failsafe.
    this.clearOpeningCpuFallback();

    const currentPlayerId =
      this.gameState.players[this.gameState.currentPlayerIndex];
    const currentPlayer = this.players.get(currentPlayerId);

    if (!currentPlayer) {
      this.log(
        '[handleAnimationsComplete] No current player found when animations completed'
      );
      return;
    }

    if (!currentPlayer.isComputer) {
      this.log(
        '[handleAnimationsComplete] Current player is human; no CPU scheduling needed'
      );
      return;
    }

    this.log(
      `[handleAnimationsComplete] Scheduling CPU turn for ${currentPlayerId} in 1 second`
    );
    this.scheduleComputerTurn(currentPlayer, 1000);
  }

  private playComputerTurn(computerPlayer: Player): void {
    if (
      !this.gameState.started ||
      this.gameState.players[this.gameState.currentPlayerIndex] !==
        computerPlayer.id ||
      this.isProcessingTurn
    ) {
      this.log(
        `CPU ${computerPlayer.id} turn skipped: not their turn, game not started, or turn already in progress.`
      );
      return;
    }

    this.isProcessingTurn = true;

    try {
      const requiredZone =
        computerPlayer.hand.length > 0
          ? 'hand'
          : computerPlayer.getUpCardCount() > 0
            ? 'upCards'
            : computerPlayer.downCards.length > 0
              ? 'downCards'
              : null;

      if (!requiredZone) {
        return;
      }

      if (requiredZone === 'hand') {
        const bestPlay = this.findBestPlayForComputer(computerPlayer, 'hand');
        if (bestPlay) {
          this.handlePlayCardInternal(
            computerPlayer,
            bestPlay.indices,
            bestPlay.zone,
            bestPlay.cards
          );
        } else {
          this.handlePickUpPileInternal(computerPlayer);
        }
      } else if (requiredZone === 'upCards') {
        const bestPlay = this.findBestPlayForComputer(
          computerPlayer,
          'upCards',
          {
            singleCardOnly: true,
          }
        );
        if (bestPlay) {
          this.handlePlayCardInternal(
            computerPlayer,
            bestPlay.indices,
            bestPlay.zone,
            bestPlay.cards
          );
        } else {
          this.handlePickUpPileInternal(computerPlayer);
        }
      } else {
        const downIndex = Math.floor(
          Math.random() * computerPlayer.downCards.length
        );
        const downCardToPlay = computerPlayer.downCards[downIndex];
        if (downCardToPlay) {
          this.handlePlayCardInternal(
            computerPlayer,
            [downIndex],
            'downCards',
            [downCardToPlay]
          );
        }
      }
    } catch (error) {
      this.log(`Error in CPU turn for ${computerPlayer.id}: ${error}`);
      // Try to continue the game
      this.handleNextTurn();
    } finally {
      // Always clear the flag
      this.isProcessingTurn = false;
    }
  }

  private scheduleComputerTurn(player: Player, delay: number): void {
    if (this.pendingComputerTurns.has(player.id)) {
      return;
    }
    this.pendingComputerTurns.add(player.id);
    const timeoutId = setTimeout(() => {
      this.gameTimeouts.delete(timeoutId);
      this.pendingComputerTurns.delete(player.id);
      this.playComputerTurn(player);
    }, delay);
    this.gameTimeouts.add(timeoutId);
  }

  private clearOpeningCpuFallback(): void {
    if (!this.openingCpuFallbackTimeout) return;
    clearTimeout(this.openingCpuFallbackTimeout);
    this.gameTimeouts.delete(this.openingCpuFallbackTimeout);
    this.openingCpuFallbackTimeout = null;
  }

  private scheduleOpeningCpuFallback(expectedCpuPlayerId: string): void {
    this.clearOpeningCpuFallback();

    // ~10s covers the opening deal + overlay; only used if ANIMATIONS_COMPLETE never arrives.
    const FALLBACK_DELAY_MS = 12000;

    const timeoutId = setTimeout(() => {
      this.gameTimeouts.delete(timeoutId);
      if (this.openingCpuFallbackTimeout === timeoutId) {
        this.openingCpuFallbackTimeout = null;
      }

      if (!this.gameState.started) return;
      if (
        this.gameState.currentPlayerIndex < 0 ||
        this.gameState.currentPlayerIndex >= this.gameState.players.length
      ) {
        return;
      }

      const currentPlayerId =
        this.gameState.players[this.gameState.currentPlayerIndex];
      if (currentPlayerId !== expectedCpuPlayerId) return;

      const currentPlayer = this.players.get(currentPlayerId);
      if (!currentPlayer || !currentPlayer.isComputer) return;

      this.log(
        `[OpeningCpuFallback] No ANIMATIONS_COMPLETE received; starting CPU turn for ${currentPlayerId}`
      );
      this.scheduleComputerTurn(currentPlayer, 0);
    }, FALLBACK_DELAY_MS);

    this.openingCpuFallbackTimeout = timeoutId;
    this.gameTimeouts.add(timeoutId);
  }

  private clearAllTimeouts(): void {
    this.gameTimeouts.forEach((id) => clearTimeout(id));
    this.gameTimeouts.clear();
    this.pendingComputerTurns.clear();
    this.openingCpuFallbackTimeout = null;

    // Clear transition timeout if active
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
    this.isTurnTransitioning = false;
  }

  private findBestPlayForComputer(
    player: Player,
    zone: 'hand' | 'upCards',
    options: { singleCardOnly?: boolean } = {}
  ): { cards: Card[]; indices: number[]; zone: 'hand' | 'upCards' } | null {
    const cardsInZone = zone === 'hand' ? player.hand : player.upCards;
    let hasPlayableCard = false;
    if (zone === 'hand') {
      hasPlayableCard = cardsInZone.length > 0;
    } else {
      hasPlayableCard = cardsInZone.some((card) => Boolean(card));
    }
    if (!hasPlayableCard) return null;

    const optionsList: {
      cards: Card[];
      indices: number[];
      zone: 'hand' | 'upCards';
    }[] = [];

    if (!options.singleCardOnly) {
      const grouped = new Map<string, { cards: Card[]; indices: number[] }>();
      for (let i = 0; i < cardsInZone.length; i++) {
        const card = cardsInZone[i] as Card | null;
        if (!card) {
          continue;
        }
        const key = String(normalizeCardValue(card.value) ?? card.value);
        const existing = grouped.get(key);
        if (existing) {
          existing.cards.push(card);
          existing.indices.push(i);
        } else {
          grouped.set(key, { cards: [card], indices: [i] });
        }
      }

      for (const group of grouped.values()) {
        if (group.cards.length > 1 && this.gameState.isValidPlay(group.cards)) {
          optionsList.push({
            cards: group.cards,
            indices: group.indices,
            zone,
          });
        }
      }
    }

    for (let i = 0; i < cardsInZone.length; i++) {
      const card = cardsInZone[i] as Card | null;
      if (!card) {
        continue;
      }
      if (this.gameState.isValidPlay([card])) {
        optionsList.push({ cards: [card], indices: [i], zone });
      }
    }

    if (optionsList.length === 0) {
      return null;
    }

    const choiceIndex = Math.floor(Math.random() * optionsList.length);
    return optionsList[choiceIndex];
  }

  private handleDisconnect(socket: TypedSocket): void {
    const playerId = this.socketIdToPlayerId.get(socket.id);
    if (playerId) {
      const player = this.players.get(playerId);
      if (player) {
        if (!this.gameState.started) {
          this.socketIdToPlayerId.delete(socket.id);
          this.players.delete(playerId);
          this.gameState.removePlayer(playerId);

          if (this.hostId === playerId) {
            this.hostId = null;
            const nextHost = Array.from(this.players.values()).find(
              (p: Player) => !p.disconnected
            );
            if (nextHost) {
              this.hostId = nextHost.id;
              nextHost.status = 'host';
            }
          }

          this.players.forEach((p) => {
            if (p.id !== this.hostId && p.status === 'host') {
              p.status = 'joined';
            }
          });

          this.syncPlayersWithGameState();
          if (!this.ensureValidState('handleDisconnect:pre-lobby-update')) {
            return;
          }
          this.pushState();
          this.pushLobbyState();
          return;
        }

        player.disconnected = true;
        this.socketIdToPlayerId.delete(socket.id);

        const activePlayers = Array.from(this.players.values()).filter(
          (p: Player) => !p.disconnected
        );
        if (activePlayers.length === 0 && this.gameState.started) {
          this.gameState.endGameInstance();
          this.clearAllTimeouts();
        } else if (
          this.gameState.started &&
          playerId === this.gameState.players[this.gameState.currentPlayerIndex]
        ) {
          this.handleNextTurn();
          return;
        }
      }
    }
    this.syncPlayersWithGameState();
    if (!this.ensureValidState('handleDisconnect:post-update')) {
      return;
    }
    this.pushState();
    this.pushLobbyState();
  }

  private pushState(): void {
    const currentPlayerId =
      this.gameState.started &&
      this.gameState.players.length > 0 &&
      this.gameState.currentPlayerIndex >= 0 &&
      this.gameState.currentPlayerIndex < this.gameState.players.length
        ? this.gameState.players[this.gameState.currentPlayerIndex]
        : undefined;

    const gamePlayers = this.getActivePlayers();
    const stateForEmit: GameStateData = {
      players: gamePlayers.map((player: Player): ClientStatePlayer => {
        const isSelf =
          player.socketId &&
          this.io.sockets.sockets.get(player.socketId) !== undefined;
        const hiddenDownCards = player.downCards.map(
          () => ({ value: '?', suit: '?', back: true }) as Card
        );
        return {
          id: player.id,
          name: player.name,
          avatar: player.avatar, // Include avatar
          hand: isSelf || player.isComputer ? player.hand : undefined,
          handCount: player.hand.length,
          upCards: player.upCards,
          upCount: player.getUpCardCount(),
          downCards: hiddenDownCards,
          downCount: player.downCards.length,
          disconnected: player.disconnected,
          isComputer: player.isComputer,
        };
      }),
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
              downCards: p.downCards?.map(
                () => ({ value: '?', suit: '?', back: true }) as Card
              ),
            })),
          };
          targetSocket.emit(STATE_UPDATE, personalizedState);
        }
      }
    });
  }

  // Add this log method for internal logging
  private log(...args: any[]): void {
    const logsEnabled =
      process.env.TOPTHAT_VERBOSE === '1' ||
      process.env.TOPTHAT_SERVER_LOGS === '1';
    if (!logsEnabled) return;
    console.log(`[GameController][Room ${this.roomId}]`, ...args);
  }
}
