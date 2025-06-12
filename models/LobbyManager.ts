import { Server } from 'socket.io';

import Lobby from './Lobby.js';

/**
 * Singleton manager responsible for creating and tracking all active lobbies.
 */
export default class LobbyManager {
  private static instance: LobbyManager | null = null;
  private lobbies: Map<string, Lobby> = new Map();
  private io: Server;

  private constructor(io: Server) {
    this.io = io;
  }

  static getInstance(io: Server): LobbyManager {
    if (!LobbyManager.instance) {
      LobbyManager.instance = new LobbyManager(io);
    }
    return LobbyManager.instance;
  }

  /** Create a new lobby and store it internally. */
  createLobby(): Lobby {
    const lobby = new Lobby(this.io);
    this.lobbies.set(lobby.roomId, lobby);
    return lobby;
  }

  /** Retrieve a lobby by its room id. */
  getLobby(roomId: string): Lobby | undefined {
    return this.lobbies.get(roomId);
  }

  /** Remove a lobby when all players disconnect. */
  removeLobby(roomId: string): void {
    this.lobbies.delete(roomId);
  }

  /** Find the lobby that contains the given socket id. */
  findLobbyBySocketId(socketId: string): Lobby | undefined {
    for (const lobby of this.lobbies.values()) {
      if (lobby.players.has(socketId)) {
        return lobby;
      }
    }
    return undefined;
  }
}
