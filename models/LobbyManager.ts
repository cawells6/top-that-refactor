import { Server, Socket } from 'socket.io';
import Lobby from './Lobby.js';

export default class LobbyManager {
  private static instance: LobbyManager | null = null;
  private lobbies: Map<string, Lobby> = new Map();

  private constructor(private io: Server) {}

  static getInstance(io: Server): LobbyManager {
    if (!LobbyManager.instance) {
      LobbyManager.instance = new LobbyManager(io);
    }
    return LobbyManager.instance;
  }

  createLobby(): Lobby {
    const lobby = new Lobby(this.io);
    this.lobbies.set(lobby.roomId, lobby);
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
      if (lobby.players.has(socketId)) {
        return lobby;
      }
    }
    return undefined;
  }
}
