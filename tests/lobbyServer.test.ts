// tests/lobbyServer.test.ts
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

import { JOINED, LOBBY, ERROR } from '../src/shared/events.js';
import GameController, { GameRoomManager } from '../controllers/GameController.js';
import { createMockSocket, createMockIO, MockSocket, MockIO } from './testUtils.js';

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

// Helper to create a valid JoinGamePayload
import type { JoinGamePayload } from '../src/shared/types.js';
function makeJoinPayload({
  id = 'PLAYER_ID',
  playerName = 'Player',
  numHumans = 2,
  numCPUs = 0,
  roomId = 'test-room',
}: Partial<JoinGamePayload> = {}): JoinGamePayload {
  return { id, playerName, numHumans, numCPUs, roomId };
}

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
    (gameController['publicHandleJoin'] as Function)(secondSocket, secondPayload);
    const lobbyCalls = topLevelEmitMock.mock.calls.filter((c) => c[0] === LOBBY);
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
    (gameController['handleStartGame'] as Function)({ computerCount: 1, socket: hostSocket });
    const lateSocket = createMockSocket('late-socket', topLevelEmitMock);
    let ackData: any;
    const latePayload = makeJoinPayload({ id: 'LATE_ID', playerName: 'Late' });
    (gameController['publicHandleJoin'] as Function)(lateSocket, latePayload, (res: any) => {
      ackData = res;
    });
    expect(ackData).toEqual({ error: 'Game has already started. Cannot join.' });
    // No error event expected
  });
});

describe('GameRoomManager', () => {
  test('joining unknown room returns error', () => {
    const manager = new GameRoomManager(mockIo as any);
    const socket = createMockSocket('joiner', topLevelEmitMock);
    let ackData: any;
    const payload = makeJoinPayload({ id: 'BAD999', playerName: 'A' });
    (manager as any)['handleClientJoinGame'](socket as any, payload, (res: any) => {
      ackData = res;
    });
    expect(ackData).toEqual({ error: 'Room not found.' });
    // No error event expected
  });
});
