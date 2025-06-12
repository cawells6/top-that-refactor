import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import Lobby from './Lobby.js';

export default class LobbyManager {
  private static instance: LobbyManager;
  private lobbies: Map<string, Lobby>;
  private io: Server;

  private constructor(io: Server) {
    this.io = io;
    this.lobbies = new Map();
  }

  static getInstance(io?: Server): LobbyManager {
    if (!LobbyManager.instance) {
      if (!io) {
        throw new Error('LobbyManager requires io instance on first call');
      }
      LobbyManager.instance = new LobbyManager(io);
    }
    return LobbyManager.instance;
  }

  createLobby(): Lobby {
    const roomId = uuidv4().slice(0, 6);
    const lobby = new Lobby(roomId, this.io);
    this.lobbies.set(roomId, lobby);
    return lobby;
  }

  getLobby(roomId: string): Lobby | undefined {
    return this.lobbies.get(roomId);
  }

  removeLobby(roomId: string): void {
    this.lobbies.delete(roomId);
  }

  /**
   * Find the lobby that contains a socket ID.
   * Iterates through all lobbies rather than using a cache to
   * keep the logic straightforward.
   */
  findLobbyBySocketId(socketId: string): Lobby | undefined {
    for (const lobby of this.lobbies.values()) {
      if (lobby.players.has(socketId)) {
        return lobby;
      }
    }
    return undefined;
  }

  get allLobbies(): IterableIterator<Lobby> {
    return this.lobbies.values();
  }
}
