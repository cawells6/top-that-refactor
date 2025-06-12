import { Socket, Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { InSessionLobbyState, LobbyPlayer } from '../src/shared/types.js';
import { LOBBY_STATE_UPDATE } from '../src/shared/events.js';

interface LobbyPlayerRecord extends LobbyPlayer {
  socketId: string;
}

export default class Lobby {
  public readonly roomId: string;
  public players: Map<string, LobbyPlayerRecord> = new Map();
  public hostId: string | null = null;

  constructor(private io: Server, roomId?: string) {
    this.roomId = roomId ?? uuidv4();
  }

  addPlayer(socket: Socket, name: string): void {
    const player: LobbyPlayerRecord = {
      id: socket.id,
      socketId: socket.id,
      name,
      status: this.hostId ? 'joined' : 'host',
      ready: this.hostId ? false : true,
    };
    if (!this.hostId) this.hostId = player.id;
    this.players.set(socket.id, player);
    socket.join(this.roomId);
    this.broadcastState();
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);
    if (this.hostId === socketId) {
      const next = Array.from(this.players.values())[0];
      this.hostId = next ? next.id : null;
      if (next) next.status = 'host';
    }
    this.broadcastState();
  }

  /**
   * Mark a player as ready or not ready in the lobby.
   * If the player is found, their `ready` property is updated.
   */
  setPlayerReady(socketId: string, ready: boolean): void {
    const player = this.players.get(socketId);
    if (player) {
      player.ready = ready;
      player.status = ready ? 'ready' : player.status;
    }
  }

  getState(): InSessionLobbyState {
    const players: LobbyPlayer[] = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      ready: p.ready,
    }));
    return {
      roomId: this.roomId,
      hostId: this.hostId,
      players,
    };
  }

  private broadcastState(): void {
    this.io.to(this.roomId).emit(LOBBY_STATE_UPDATE, this.getState());
  }
}
