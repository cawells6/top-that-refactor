// tests/lobbyServer.test.ts
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

import GameController, { GameRoomManager } from '../controllers/GameController.js';
import LobbyManager from '../models/LobbyManager.js';
import { JOINED, LOBBY_STATE_UPDATE, ERROR } from '../src/shared/events.js';

interface MockSocket {
  id: string;
  join: jest.Mock<any>;
  emit: jest.Mock<any>;
  on: jest.Mock<any>;
  removeAllListeners: jest.Mock<any>;
  eventHandlers: Record<string, (data?: any, ack?: Function) => void>;
  simulateIncomingEvent: (event: string, data?: any, ack?: Function) => void;
  disconnect: jest.Mock<any>;
}

interface MockIO {
  on: jest.Mock<any>;
  to: jest.Mock<any>;
  emit: jest.Mock<any>;
  sockets: { sockets: Map<string, MockSocket> };
}

let topLevelEmitMock: jest.Mock<any>;
let mockIo: MockIO;
let hostSocket: MockSocket;
let gameController: GameController;

function createMockSocket(id: string): MockSocket {
  const handlers: Record<string, (data?: any, ack?: Function) => void> = {};
  return {
    id,
    join: jest.fn(),
    emit: jest.fn((event: string, payload?: any) => {
      topLevelEmitMock(event, payload);
    }),
    on: jest.fn((event: string, handler: (data?: any, ack?: Function) => void) => {
      handlers[event] = handler;
    }),
    removeAllListeners: jest.fn(),
    eventHandlers: handlers,
    simulateIncomingEvent: (event: string, data?: any, ack?: Function) => {
      if (handlers[event]) handlers[event](data, ack);
    },
    disconnect: jest.fn(),
  };
}

beforeEach(() => {
  topLevelEmitMock = jest.fn();
  mockIo = {
    on: jest.fn(),
    to: jest.fn((_id: string) => {
      return { emit: jest.fn((event: string, payload?: any) => topLevelEmitMock(event, payload)) };
    }),
    emit: jest.fn((event: string, payload?: any) => topLevelEmitMock(event, payload)),
    sockets: { sockets: new Map() },
  };
  hostSocket = createMockSocket('host-socket');
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
    const secondSocket = createMockSocket('socket-b');
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
    const lateSocket = createMockSocket('late-socket');
    let ackData: any;
    (gameController['publicHandleJoin'] as Function)(
      lateSocket,
      { name: 'Late', id: 'LATE_ID' },
      (res: any) => {
        ackData = res;
      }
    );
    expect(ackData).toEqual({ error: 'Game has already started. Cannot join.' });
    expect(lateSocket.emit).not.toHaveBeenCalledWith(ERROR, expect.anything());
  });
});

describe('GameRoomManager', () => {
  test('joining unknown room returns error', () => {
    const manager = new GameRoomManager(mockIo as any);
    const socket = createMockSocket('joiner');
    let ackData: any;
    (manager as any)['handleClientJoinGame'](
      socket as any,
      { name: 'A', id: 'BAD999' },
      (res: any) => {
        ackData = res;
      }
    );
    expect(ackData).toEqual({ error: 'Room not found.' });
    expect(socket.emit).toHaveBeenCalledWith(ERROR, 'Room not found.');
  });
});

describe('Lobby validations', () => {
  let lobbyManager: LobbyManager;
  beforeEach(() => {
    (LobbyManager as any).instance = undefined;
    lobbyManager = LobbyManager.getInstance(mockIo as any);
  });

  test('prevents duplicate joins', () => {
    const lobby = lobbyManager.createLobby();
    const err1 = lobby.addPlayer(hostSocket as any, 'Host');
    expect(err1).toBeUndefined();
    const err2 = lobby.addPlayer(hostSocket as any, 'Host');
    expect(err2).toBe('Player already in lobby.');
  });

  test('prevents joining when lobby is full', () => {
    const lobby = lobbyManager.createLobby();
    const sockets = [
      hostSocket,
      createMockSocket('s2'),
      createMockSocket('s3'),
      createMockSocket('s4'),
    ];
    sockets.forEach((s, i) => {
      lobby.addPlayer(s as any, `P${i}`);
    });
    const extra = createMockSocket('s5');
    const err = lobby.addPlayer(extra as any, 'Extra');
    expect(err).toBe('Lobby is full.');
  });
});
