import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import LobbyManager from '../models/LobbyManager.js';
import { Server, Socket } from 'socket.io';

interface MockSocket {
  id: string;
  join: jest.Mock;
  emit: jest.Mock;
  on: jest.Mock;
  disconnect: jest.Mock;
}

function createMockSocket(id: string): MockSocket {
  return {
    id,
    join: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    disconnect: jest.fn(),
  };
}

describe('LobbyManager', () => {
  let io: Partial<Server>;
  let lobbyManager: LobbyManager;

  beforeEach(() => {
    io = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    } as unknown as Server;
    // LobbyManager is a singleton; ensure each test gets a fresh instance
    lobbyManager = LobbyManager.getInstance(io as Server);
    // Clear all existing lobbies between tests
    for (const lobby of lobbyManager.lobbies.values()) {
      lobbyManager.removeLobby(lobby.roomId);
    }
  });

  it('createLobby returns a unique roomId', () => {
    const lobbyA = lobbyManager.createLobby();
    const lobbyB = lobbyManager.createLobby();
    expect(lobbyA.roomId).not.toBe(lobbyB.roomId);
  });

  it('joining with wrong ID fails', () => {
    lobbyManager.createLobby();
    const lobby = lobbyManager.getLobby('bad-id');
    expect(lobby).toBeUndefined();
  });

  it('removes a lobby when last player disconnects', () => {
    const lobby = lobbyManager.createLobby();
    const socket = createMockSocket('s1');
    lobby.addPlayer(socket as unknown as Socket, 'Alice');
    lobby.removePlayer('s1');
    expect(lobbyManager.getLobby(lobby.roomId)).toBeUndefined();
  });
});
