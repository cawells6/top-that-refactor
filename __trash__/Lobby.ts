import { Server, Socket } from 'socket.io';

import Player from './Player.js';
import GameController from '../controllers/GameController.js';
import { LOBBY_STATE_UPDATE, GAME_STARTED } from '../src/shared/events.js';

export interface LobbyPlayer {
  id: string;
  name: string;
  ready: boolean;
}

export default class Lobby {
  public roomId: string;
  private io: Server;
  public players: Map<string, Player>;
  public hostId: string | null;
  private sockets: Map<string, Socket>;
  private gameController: GameController | null;

  constructor(roomId: string, io: Server) {
    this.roomId = roomId;
    this.io = io;
    this.players = new Map();
    this.hostId = null;
    this.sockets = new Map();
    this.gameController = null;
  }

  addPlayer(socket: Socket, playerName: string): void {
    const player = new Player(socket.id);
    player.name = playerName;
    player.socketId = socket.id;
    this.players.set(socket.id, player);
    this.sockets.set(socket.id, socket);
    if (!this.hostId) this.hostId = socket.id;
    socket.join(this.roomId);
    this.broadcastLobbyState();
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);
    this.sockets.delete(socketId);
    if (socketId === this.hostId) {
      const first = this.players.keys().next().value;
      this.hostId = first || null;
    }
    this.broadcastLobbyState();
  }

  private broadcastLobbyState(): void {
    const state = {
      roomId: this.roomId,
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        ready: p.ready,
      })),
      hostId: this.hostId,
    };
    this.io.to(this.roomId).emit(LOBBY_STATE_UPDATE, state);
  }

  setPlayerReady(socketId: string, ready: boolean): void {
    const player = this.players.get(socketId);
    if (player) {
      player.ready = ready;
      this.broadcastLobbyState();
      this.checkIfReadyToStart();
    }
  }

  private checkIfReadyToStart(): void {
    const allReady = Array.from(this.players.values()).every((p) => p.ready);
    if (allReady && this.players.size > 0) {
      this.startGame();
    }
  }

  private startGame(): void {
    this.gameController = new GameController(this.io, this.roomId);
    for (const [socketId, player] of this.players.entries()) {
      const socket = this.sockets.get(socketId);
      if (socket) {
        this.gameController.publicHandleJoin(socket, { id: player.id, name: player.name });
      }
    }
    const hostSocket = this.hostId ? this.sockets.get(this.hostId) : undefined;
    this.gameController
      .startGame(0, hostSocket)
      .then(() => {
        this.io.to(this.roomId).emit(GAME_STARTED);
        return null;
      })
      .catch((err) => {
        console.error('Failed to start game:', err);
      });
  }
}
