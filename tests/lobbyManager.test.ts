import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Socket } from 'socket.io';
import LobbyManager from '../models/LobbyManager.js';

function createMockSocket(id: string): Socket {
  return { id, join: jest.fn() } as unknown as Socket;
}

describe('LobbyManager and Lobby', () => {
  beforeEach(() => {
    (LobbyManager as any).instance = null;
  });

  test('create lobby and add player', () => {
    const manager = LobbyManager.getInstance({} as any);
    const lobby = manager.createLobby();
    const socket = createMockSocket('s1');
    lobby.addPlayer(socket, 'Alice');
    expect(lobby.players.size).toBe(1);
    const player = lobby.players.get('s1');
    expect(player).toEqual(expect.objectContaining({ name: 'Alice', ready: false }));
  });

  test('find lobby by socket id', () => {
    const manager = LobbyManager.getInstance({} as any);
    const lobby = manager.createLobby();
    const socket = createMockSocket('s1');
    lobby.addPlayer(socket, 'Alice');
    const found = manager.findLobbyBySocketId('s1');
    expect(found).toBe(lobby);
  });

  test('remove lobby', () => {
    const manager = LobbyManager.getInstance({} as any);
    const lobby = manager.createLobby();
    manager.removeLobby(lobby.roomId);
    expect(manager.getLobby(lobby.roomId)).toBeUndefined();
  });
});
