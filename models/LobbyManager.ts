import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface PlayerInfo {
  socket: Socket;
  name: string;
  ready: boolean;
}

export class Lobby {
  public roomId: string;
  public players: Map<string, PlayerInfo> = new Map();
  private manager: LobbyManager;

  constructor(roomId: string, manager: LobbyManager) {
    this.roomId = roomId;
    this.manager = manager;
  }

  addPlayer(socket: Socket, name: string): void {
    socket.join(this.roomId);
    this.players.set(socket.id, { socket, name, ready: false });
  }

  setPlayerReady(socketId: string, ready: boolean): void {
    const p = this.players.get(socketId);
    if (p) {
      p.ready = ready;
    }
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);
    if (this.players.size === 0) {
      this.manager.removeLobby(this.roomId);
    }
  }
}

export default class LobbyManager {
  private static instance: LobbyManager | null = null;
  public lobbies: Map<string, Lobby> = new Map();

  private constructor(private io: Server) {}

  static getInstance(io: Server): LobbyManager {
    if (!LobbyManager.instance) {
      LobbyManager.instance = new LobbyManager(io);
    }
    return LobbyManager.instance;
  }

  createLobby(): Lobby {
    const roomId = uuidv4().slice(0, 6);
    const lobby = new Lobby(roomId, this);
    this.lobbies.set(roomId, lobby);
    return lobby;
  }

  getLobby(roomId: string): Lobby | undefined {
    return this.lobbies.get(roomId);
  }

  removeLobby(roomId: string): void {
    this.lobbies.delete(roomId);
  }

  findLobbyBySocketId(socketId: string): Lobby | undefined {
    for (const lobby of this.lobbies.values()) {
      if (lobby.players.has(socketId)) return lobby;
    }
    return undefined;
  }
}
