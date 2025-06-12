import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import Lobby from './Lobby.js';

export default class LobbyManager {
  private static instance: LobbyManager | null = null;
  private lobbies: Map<string, Lobby> = new Map();
  private io: Server;

  private constructor(io: Server) {
    this.io = io;
  }

  static getInstance(io?: Server): LobbyManager {
    if (!LobbyManager.instance) {
      if (!io) {
        throw new Error('LobbyManager requires a Socket.IO server instance');
      }
      LobbyManager.instance = new LobbyManager(io);
    }
    return LobbyManager.instance;
  }

  createLobby(): Lobby {
    const roomId = uuidv4().slice(0, 6);
    const lobby = new Lobby(roomId);
    this.lobbies.set(roomId, lobby);
    return lobby;
  }

  getLobby(roomId: string): Lobby | undefined {
    return this.lobbies.get(roomId);
  }

  findLobbyBySocketId(id: string): Lobby | undefined {
    for (const lobby of this.lobbies.values()) {
      if (lobby.players.has(id)) {
        return lobby;
      }
    }
    return undefined;
  }

  removeLobby(roomId: string): void {
    this.lobbies.delete(roomId);
  }
}
