// tests/lobbyServer.test.ts
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

import {
  createMockSocket,
  createMockIO,
  MockSocket,
  MockIO,
} from './testUtils.js';
import GameController, {
  GameRoomManager,
} from '../controllers/GameController.js';
import { JOINED, LOBBY } from '../src/types/events.js';
import type { JoinGamePayload } from '../src/types/types.js';

// Helper to create a valid JoinGamePayload
function makeJoinPayload({
  id = 'PLAYER_ID',
  playerName = 'Player',
  numHumans = 2,
  numCPUs = 0,
  roomId = 'test-room',
}: Partial<JoinGamePayload> = {}): JoinGamePayload {
  return { id, playerName, numHumans, numCPUs, roomId };
}

let topLevelEmitMock: jest.Mock<any>;
let mockIo: MockIO;
let hostSocket: MockSocket;
let gameController: GameController;

beforeEach(() => {
  topLevelEmitMock = jest.fn();
  mockIo = createMockIO(topLevelEmitMock);
  hostSocket = createMockSocket('host-socket', topLevelEmitMock);
  if (mockIo.sockets && mockIo.sockets.sockets) {
    mockIo.sockets.sockets.set(hostSocket.id, hostSocket);
  }
  gameController = new GameController(mockIo as any, 'test-room');
  jest.clearAllMocks(); // Reset all mocks for isolation
});

describe('Lobby joining', () => {
  test('first player join emits lobby state', () => {
    const payload = makeJoinPayload({ id: 'HOST_ID', playerName: 'Host' });
    (gameController['publicHandleJoin'] as Function)(hostSocket, payload);
    expect(hostSocket.emit).toHaveBeenCalledWith(JOINED, {
      id: 'HOST_ID',
      name: 'Host',
      roomId: 'test-room',
    });
    const lobbyCall = topLevelEmitMock.mock.calls.find((c) => c[0] === LOBBY);
    expect(lobbyCall).toBeDefined();
    if (lobbyCall) {
      expect(lobbyCall[1]).toEqual(
        expect.objectContaining({
          roomId: 'test-room',
          players: expect.arrayContaining([
            expect.objectContaining({ id: 'HOST_ID', name: 'Host' }),
          ]),
        })
      );
    }
  });

  test('second player join updates lobby for all', () => {
    const hostPayload = makeJoinPayload({ id: 'HOST_ID', playerName: 'Host' });
    (gameController['publicHandleJoin'] as Function)(hostSocket, hostPayload);
    const secondSocket = createMockSocket('socket-b', topLevelEmitMock);
    if (mockIo.sockets && mockIo.sockets.sockets) {
      mockIo.sockets.sockets.set(secondSocket.id, secondSocket);
    }
    const secondPayload = makeJoinPayload({ id: 'BOB_ID', playerName: 'Bob' });
    (gameController['publicHandleJoin'] as Function)(
      secondSocket,
      secondPayload
    );
    const lobbyCalls = topLevelEmitMock.mock.calls.filter(
      (c) => c[0] === LOBBY
    );
    expect(lobbyCalls.length).toBeGreaterThanOrEqual(2);
    const lastLobby = lobbyCalls[lobbyCalls.length - 1] as any;
    expect(lastLobby[1]).toEqual(
      expect.objectContaining({
        players: expect.arrayContaining([
          expect.objectContaining({ id: 'HOST_ID' }),
          expect.objectContaining({ id: 'BOB_ID' }),
        ]),
      })
    );
  });

  test('cannot join after game start', () => {
    const hostPayload = makeJoinPayload({ id: 'HOST_ID', playerName: 'Host' });
    (gameController['publicHandleJoin'] as Function)(hostSocket, hostPayload);
    (gameController['handleStartGame'] as Function)({
      computerCount: 1,
      socket: hostSocket,
    });
    const lateSocket = createMockSocket('late-socket', topLevelEmitMock);
    let ackData: any;
    const latePayload = makeJoinPayload({ id: 'LATE_ID', playerName: 'Late' });
    (gameController['publicHandleJoin'] as Function)(
      lateSocket,
      latePayload,
      (res: any) => {
        ackData = res;
      }
    );
    expect(ackData).toEqual({
      error: 'Game has already started. Cannot join.',
    });
    // No error event expected
  });
});

describe('GameRoomManager', () => {
  test('joining unknown room returns error', () => {
    const manager = new GameRoomManager(mockIo as any);
    const socket = createMockSocket('joiner', topLevelEmitMock);
    let ackData: any;
    const payload = makeJoinPayload({ id: 'BAD999', playerName: 'A' });
    (manager as any)['handleClientJoinGame'](
      socket as any,
      payload,
      (res: any) => {
        ackData = res;
      }
    );
    expect(ackData).toEqual({ error: 'Room not found.' });
    // No error event expected
  });
});

describe('Lobby joining edge cases', () => {
  test('joining with missing playerName returns error', () => {
    const payload = { ...makeJoinPayload(), playerName: undefined };
    let ackData: any;
    (gameController['publicHandleJoin'] as Function)(
      hostSocket,
      payload,
      (res: any) => {
        ackData = res;
      }
    );
    expect(ackData).toEqual({ error: expect.any(String) });
  });

  test('joining with duplicate id does not create new player', () => {
    const payload = makeJoinPayload({ id: 'DUP_ID', playerName: 'A' });
    (gameController['publicHandleJoin'] as Function)(hostSocket, payload);
    const secondSocket = createMockSocket('socket-c', topLevelEmitMock);
    if (mockIo.sockets && mockIo.sockets.sockets) {
      mockIo.sockets.sockets.set(secondSocket.id, secondSocket);
    }
    const dupPayload = makeJoinPayload({ id: 'DUP_ID', playerName: 'B' });
    (gameController['publicHandleJoin'] as Function)(secondSocket, dupPayload);
    // Only one player with DUP_ID should exist
    const players = (gameController as any).players;
    let count = 0;
    players.forEach((p: any) => {
      if (p.id === 'DUP_ID') count++;
    });
    expect(count).toBe(1);
  });

  test('joining with special characters in name/roomId works', () => {
    const specialName = 'N@me!#%';
    const specialRoom = 'R@@M!';
    const payload = makeJoinPayload({
      id: 'SPECIAL_ID',
      playerName: specialName,
      roomId: specialRoom,
    });
    const specialSocket = createMockSocket('special-socket', topLevelEmitMock);
    if (mockIo.sockets && mockIo.sockets.sockets) {
      mockIo.sockets.sockets.set(specialSocket.id, specialSocket);
    }
    (gameController['publicHandleJoin'] as Function)(specialSocket, payload);
    const players = (gameController as any).players;
    const found = Array.from(players.values()).find(
      (p: any) => p.name === specialName
    );
    expect(found).toBeDefined();
  });

  test('joining with custom numHumans/numCPUs is respected', () => {
    const payload = makeJoinPayload({
      id: 'HUMAN_ID',
      playerName: 'Human',
      numHumans: 2, // valid for default maxPlayers
      numCPUs: 1, // valid for default maxPlayers
    });
    (gameController['publicHandleJoin'] as Function)(hostSocket, payload);
    expect((gameController as any).expectedHumanCount).toBe(2);
    expect((gameController as any).expectedCpuCount).toBe(1);
  });

  test('ack callback is called with correct data on success', () => {
    const payload = makeJoinPayload({ id: 'ACK_ID', playerName: 'Ack' });
    let ackData: any;
    (gameController['publicHandleJoin'] as Function)(
      hostSocket,
      payload,
      (res: any) => {
        ackData = res;
      }
    );
    expect(ackData).toEqual(
      expect.objectContaining({ roomId: 'test-room', playerId: 'ACK_ID' })
    );
  });

  test('ack callback is called with error on invalid join', () => {
    const payload = { ...makeJoinPayload(), playerName: undefined };
    let ackData: any;
    (gameController['publicHandleJoin'] as Function)(
      hostSocket,
      payload,
      (res: any) => {
        ackData = res;
      }
    );
    expect(ackData).toEqual({ error: expect.any(String) });
  });

  test('player can leave and rejoin, lobby state updates', () => {
    const payload = makeJoinPayload({ id: 'REJOIN_ID', playerName: 'Rejoin' });
    (gameController['publicHandleJoin'] as Function)(hostSocket, payload);
    // Simulate disconnect
    const players = (gameController as any).players;
    const player = players.get('REJOIN_ID');
    player.disconnected = true;
    // Rejoin
    (gameController['publicHandleRejoin'] as Function)(
      hostSocket,
      'test-room',
      'REJOIN_ID'
    );
    expect(player.disconnected).toBe(false);
  });
});
