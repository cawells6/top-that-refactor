import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import { LOBBY_STATE_UPDATE } from '../src/shared/events.js';
import { LobbyPlayer, LobbyState } from '../src/shared/types.js';

/**
 * Represents a game lobby. Players join using their socket and
 * can mark themselves as ready. Whenever the lobby state changes
 * the updated state is emitted to all connected clients.
 */
export default class Lobby {
  public readonly roomId: string;
  public hostId: string | null = null;
  private io: Server;
  public players: Map<string, LobbyPlayer & { socket: Socket }>; // track socket

  constructor(io: Server, roomId?: string) {
    this.io = io;
    this.roomId = roomId ?? uuidv4().slice(0, 6).toUpperCase();
    this.players = new Map();
  }

  /** Add a player to the lobby and broadcast the updated state. */
  addPlayer(socket: Socket, name: string): void {
    const player: LobbyPlayer & { socket: Socket } = {
      id: socket.id,
      name,
      ready: false,
      socket,
    };
    this.players.set(socket.id, player);
    if (!this.hostId) {
      this.hostId = socket.id;
    }
    socket.join(this.roomId);
    this.pushState();
  }

  /** Update a player's ready status and notify clients. */
  setPlayerReady(socketId: string, ready: boolean): void {
    const player = this.players.get(socketId);
    if (player) {
      player.ready = ready;
      this.pushState();
    }
  }

  /** Remove a player from the lobby and broadcast changes. */
  removePlayer(socketId: string): void {
    const existed = this.players.delete(socketId);
    if (existed) {
      if (this.hostId === socketId) {
        const next = this.players.keys().next().value as string | undefined;
        this.hostId = next ?? null;
      }
      this.pushState();
    }
  }

  /**
   * Build a serialisable LobbyState object for the current lobby.
   */
  getState(): LobbyState {
    const players: LobbyPlayer[] = Array.from(this.players.values()).map(
      ({ socket: _socket, ...rest }) => rest
    );
    return {
      roomId: this.roomId,
      hostId: this.hostId,
      players,
    };
  }

  /** Emit the current lobby state to all players. */
  private pushState(): void {
    const state = this.getState();
    this.io.to(this.roomId).emit(LOBBY_STATE_UPDATE, state);
  }
}
