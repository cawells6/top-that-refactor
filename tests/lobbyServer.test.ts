// tests/lobbyServer.test.ts
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

import { JOINED, LOBBY_STATE_UPDATE, ERROR } from '../src/shared/events.js';
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
});

describe('Lobby joining', () => {
  test('first player join emits lobby state', () => {
    (gameController['publicHandleJoin'] as Function)(hostSocket, { name: 'Host', id: 'HOST_ID' });
    expect(hostSocket.emit).toHaveBeenCalledWith(JOINED, {
      id: 'HOST_ID',
      name: 'Host',
      roomId: 'test-room',
    });
    const lobbyCall = topLevelEmitMock.mock.calls.find((c) => c[0] === LOBBY_STATE_UPDATE);
    expect(lobbyCall).toBeDefined();
    if (lobbyCall) {
      expect(lobbyCall[1]).toEqual(
        expect.objectContaining({
          roomId: 'test-room',
          hostId: 'HOST_ID',
          players: expect.arrayContaining([
            expect.objectContaining({ id: 'HOST_ID', name: 'Host', status: 'host' }),
          ]),
        })
      );
    }
  });

  test('second player join updates lobby for all', () => {
    (gameController['publicHandleJoin'] as Function)(hostSocket, { name: 'Host', id: 'HOST_ID' });
    const secondSocket = createMockSocket('socket-b', topLevelEmitMock);
    if (mockIo.sockets && mockIo.sockets.sockets) {
      mockIo.sockets.sockets.set(secondSocket.id, secondSocket);
    }
    (gameController['publicHandleJoin'] as Function)(secondSocket, { name: 'Bob', id: 'BOB_ID' });
    const lobbyCalls = topLevelEmitMock.mock.calls.filter((c) => c[0] === LOBBY_STATE_UPDATE);
    expect(lobbyCalls.length).toBeGreaterThanOrEqual(2);
    const lastLobby = lobbyCalls[lobbyCalls.length - 1] as any;
    expect(lastLobby[1]).toEqual(
      expect.objectContaining({
        hostId: 'HOST_ID',
        players: expect.arrayContaining([
          expect.objectContaining({ id: 'HOST_ID' }),
          expect.objectContaining({ id: 'BOB_ID' }),
        ]),
      })
    );
  });

  test('cannot join after game start', () => {
    (gameController['publicHandleJoin'] as Function)(hostSocket, { name: 'Host', id: 'HOST_ID' });
    (gameController['handleStartGame'] as Function)({ computerCount: 1, socket: hostSocket });
    const lateSocket = createMockSocket('late-socket', topLevelEmitMock);
    let ackData: any;
    (gameController['publicHandleJoin'] as Function)(
      lateSocket,
      { name: 'Late', id: 'LATE_ID' },
      (res: any) => {
        ackData = res;
      }
    );
    expect(ackData).toEqual({ error: 'Invalid join payload: check name and player counts.' });
    expect(lateSocket.emit).not.toHaveBeenCalledWith(ERROR, expect.anything());
  });
});

describe('GameRoomManager', () => {
  test('joining unknown room returns error', () => {
    const manager = new GameRoomManager(mockIo as any);
    const socket = createMockSocket('joiner', topLevelEmitMock);
    let ackData: any;
    (manager as any)['handleClientJoinGame'](
      socket as any,
      { name: 'A', id: 'BAD999' },
      (res: any) => {
        ackData = res;
      }
    );
    expect(ackData).toEqual({ error: 'Invalid join payload: check name and player counts.' });
    expect(socket.emit).toHaveBeenCalledWith(
      ERROR,
      'Invalid join payload: check name and player counts.'
    );
  });
});
