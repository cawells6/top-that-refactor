// tests/gameFlow.test.ts
import GameController from '../controllers/GameController.js';

// Use string literals for event names to avoid import errors
const JOINED = 'joined';
const LOBBY = 'lobby';
const STATE_UPDATE = 'state-update';
const NEXT_TURN = 'next-turn';
const START_GAME = 'start-game';
import { jest, describe, test, beforeEach, expect } from '@jest/globals';

// --- Type Definitions for Mocks ---
interface MockSocket {
  id: string;
  join: any;
  emit: any;
  on: any;
  removeAllListeners: any;
  eventHandlers: Record<string, (data?: any, ack?: Function) => void>;
  simulateIncomingEvent: (event: string, data?: any, ack?: Function) => void;
  disconnect?: any;
}

interface MockIOWithEmit {
  emit: any;
}

interface MockIO {
  on: any;
  to: any;
  emit: any;
  sockets: {
    sockets: Map<string, MockSocket>;
  };
}

interface PlayerJoinDataPayload {
  name: string;
  numCPUs?: number;
  id?: string;
}

// Add a type for state payloads emitted in tests
interface StatePayload {
  players: any[];
  currentPlayerId: string;
  started: boolean;
}

// --- Mock Implementations ---
let globalMockSocket: MockSocket;

const topLevelEmitMock = jest.fn();

const mockIo: MockIO = {
  on: jest.fn((event: string, handler: (socket: MockSocket) => void) => {
    if (event === 'connection') {
      if (globalMockSocket && mockIo.sockets && mockIo.sockets.sockets) {
        mockIo.sockets.sockets.set(globalMockSocket.id, globalMockSocket);
      }
      if (handler && globalMockSocket) {
        handler(globalMockSocket);
      }
    }
  }),
  to: jest.fn(function (id: string): MockIOWithEmit {
    // id can be roomName or socketId
    console.log(`DEBUG_TEST: mockIo.to CALLED WITH: '${id}'`);
    const specificEmitMock = jest.fn((event: string, payload?: any) => {
      console.log(
        `DEBUG_TEST: mockIo.to('${id}').emit CALLED -> event: '${event}', payload:`,
        payload !== undefined ? JSON.stringify(payload) : 'undefined'
      );
      topLevelEmitMock(event, payload);
    });
    return { emit: specificEmitMock };
  }),
  emit: jest.fn((event: string, payload?: any) => {
    // For direct io.emit
    console.log(
      `DEBUG_TEST: mockIo.emit CALLED -> event: '${event}', payload:`,
      payload !== undefined ? JSON.stringify(payload) : 'undefined'
    );
    topLevelEmitMock(event, payload);
  }),
  sockets: {
    sockets: new Map<string, MockSocket>(),
  },
};

describe('Game Flow - Single Player vs CPU (manual start)', () => {
  let gameController: GameController;

  beforeEach(() => {
    topLevelEmitMock.mockClear();

    globalMockSocket = {
      id: 'socket-id-1',
      join: jest.fn(),
      emit: jest.fn((event: string, payload?: any) => {
        console.log(
          `DEBUG_TEST: globalMockSocket.emit CALLED -> event: '${event}', payload:`,
          payload !== undefined ? JSON.stringify(payload) : 'undefined'
        );
        topLevelEmitMock(event, payload);
      }),
      on: jest.fn((event: string, handler: (data?: any, ack?: Function) => void) => {
        globalMockSocket.eventHandlers[event as string] = handler;
      }),
      removeAllListeners: jest.fn(),
      eventHandlers: {},
      simulateIncomingEvent: (event, data, ack) => {
        if (globalMockSocket.eventHandlers[event as string]) {
          globalMockSocket.eventHandlers[event as string](data, ack);
        }
      },
      disconnect: jest.fn(),
    };

    if (mockIo.sockets && mockIo.sockets.sockets) {
      mockIo.sockets.sockets.clear();
      mockIo.sockets.sockets.set(globalMockSocket.id, globalMockSocket);
    }

    mockIo.on.mockClear();
    mockIo.to.mockClear();
    // Pass a dummy roomId for tests (required by GameController constructor)
    gameController = new GameController(mockIo as any, 'test-room');
  });

  test('Player joins, then host starts game with 1 CPU', () => {
    const playerData: PlayerJoinDataPayload = { name: 'Player1', numCPUs: 1, id: 'Player1-ID' };
    // Simulate player joining (should result in lobby state, not started game)
    (gameController['publicHandleJoin'] as Function)(globalMockSocket, playerData);

    // After join, game should NOT be started yet (lobby state)
    expect(gameController['gameState'].started).toBe(false);
    expect(gameController['gameState'].players).toContain(playerData.id);
    expect(gameController['players'].has(playerData.id!)).toBe(true);
    // No CPUs yet
    expect(gameController['players'].has('COMPUTER_1')).toBe(false);

    // Now simulate the host starting the game (as the UI would do after lobby)
    (gameController as any).handleStartGame({ computerCount: 1, socket: globalMockSocket });

    // After start, CPUs should be present and game should be started
    expect(gameController['gameState'].started).toBe(true);
    expect(gameController['gameState'].players).toContain('COMPUTER_1');
    expect(gameController['players'].has('COMPUTER_1')).toBe(true);

    // Find the state update with started: true
    const stateUpdateAfterStart = topLevelEmitMock.mock.calls.find(
      (call) => call[0] === STATE_UPDATE && (call[1] as any)?.started === true
    );
    expect(stateUpdateAfterStart).toBeDefined();
    const emittedState = stateUpdateAfterStart![1] as any;
    expect(emittedState.players.length).toBe(2);
    expect(emittedState.currentPlayerId).toBe(playerData.id);

    // Check that NEXT_TURN was emitted for the human
    const nextTurnArgs = topLevelEmitMock.mock.calls.find((call) => call[0] === NEXT_TURN);
    expect(nextTurnArgs).toBeDefined();
    expect(nextTurnArgs![1]).toBe(playerData.id);

    // Check hands were dealt
    const player1Instance = gameController['players'].get(playerData.id!);
    const cpu1Instance = gameController['players'].get('COMPUTER_1');
    expect(player1Instance!.hand.length).toBe(3);
    expect(cpu1Instance!.hand.length).toBe(3);
    expect(gameController['gameState'].deck!.length).toBe(52 - 2 * 9);
  });
});

describe('Game Flow - Manual Start by Host', () => {
  let gameController: GameController;

  beforeEach(() => {
    topLevelEmitMock.mockClear();

    globalMockSocket = {
      id: 'host-socket-id',
      join: jest.fn(),
      emit: jest.fn((event: string, payload?: any) => {
        console.log(
          `DEBUG_TEST: globalMockSocket.emit CALLED -> event: '${event}', payload:`,
          payload !== undefined ? JSON.stringify(payload) : 'undefined'
        );
        topLevelEmitMock(event, payload);
      }),
      on: jest.fn((event: string, handler: (data?: any, ack?: Function) => void) => {
        globalMockSocket.eventHandlers[event as string] = handler;
      }),
      removeAllListeners: jest.fn(),
      eventHandlers: {},
      simulateIncomingEvent: (event, data, ack) => {
        if (globalMockSocket.eventHandlers[event as string]) {
          globalMockSocket.eventHandlers[event as string](data, ack);
        }
      },
      disconnect: jest.fn(),
    };

    if (mockIo.sockets && mockIo.sockets.sockets) {
      mockIo.sockets.sockets.clear();
      mockIo.sockets.sockets.set(globalMockSocket.id, globalMockSocket);
    }

    mockIo.on.mockClear();
    mockIo.to.mockClear();
    topLevelEmitMock.mockClear();
    // Pass a dummy roomId for tests (required by GameController constructor)
    gameController = new GameController(mockIo as any, 'test-room');
  });

  test('Host joins (no auto-CPUs), Player2 joins, Host starts game (no explicit CPUs)', async () => {
    topLevelEmitMock.mockClear();

    const originalHostSocketId = globalMockSocket.id;
    if (mockIo.sockets.sockets.has(originalHostSocketId)) {
      mockIo.sockets.sockets.delete(originalHostSocketId);
    }

    globalMockSocket.id = 'socket-A';
    globalMockSocket.emit = jest.fn((event: string, payload?: any) => {
      console.log(
        `DEBUG_TEST: globalMockSocket.emit (socket-A) CALLED -> event: '${event}', payload:`,
        payload !== undefined ? JSON.stringify(payload) : 'undefined'
      );
      topLevelEmitMock(event, payload);
    });
    // Ensure the GameController can find this socket by its new ID
    if (mockIo.sockets && mockIo.sockets.sockets) {
      // Ensure sockets map exists
      mockIo.sockets.sockets.set(globalMockSocket.id, globalMockSocket);
    }

    const playerAData: PlayerJoinDataPayload = { name: 'PlayerA', numCPUs: 0, id: 'PlayerA-ID' };
    (gameController['publicHandleJoin'] as Function)(globalMockSocket, playerAData);

    // Debug: print all calls to globalMockSocket.emit
    console.log('DEBUG: globalMockSocket.emit.mock.calls:', JSON.stringify(globalMockSocket.emit.mock.calls, null, 2));

    // Check that a JOINED event with the correct payload was emitted (allowing for extra events)
    const joinedCallHost = globalMockSocket.emit.mock.calls.find(
      (call: any) => call[0] === JOINED && call[1]?.id === playerAData.id && call[1]?.name === playerAData.name && call[1]?.roomId === 'test-room'
    );
    expect(joinedCallHost).toBeDefined();
    expect(gameController['gameState'].players).toEqual([playerAData.id]);
    let stateUpdateCallHost = topLevelEmitMock.mock.calls.find(
      (call: any) => call[0] === STATE_UPDATE && (call[1] as StatePayload)?.started === false
    );
    expect(stateUpdateCallHost).toBeDefined();
    if (stateUpdateCallHost) expect((stateUpdateCallHost[1] as StatePayload).players.length).toBe(1);
    // Only clear mocks after all assertions
    topLevelEmitMock.mockClear();
    globalMockSocket.emit.mockClear();

    const playerBJoinSocket: MockSocket = {
      id: 'socket-B',
      join: jest.fn(),
      emit: jest.fn((event: string, payload?: any) => {
        console.log(
          `DEBUG_TEST: playerBJoinSocket.emit (socket-B) CALLED -> event: '${event}', payload:`,
          payload !== undefined ? JSON.stringify(payload) : 'undefined'
        );
        topLevelEmitMock(event, payload);
      }),
      on: jest.fn((event: string, handler: (data?: any, ack?: Function) => void) => {
        (playerBJoinSocket.eventHandlers as any)[event as string] = handler;
      }),
      removeAllListeners: jest.fn(),
      eventHandlers: {},
      simulateIncomingEvent: (event, data, ack) => {
        if ((playerBJoinSocket.eventHandlers as any)[event as string]) {
          (playerBJoinSocket.eventHandlers as any)[event as string](data, ack);
        }
      },
      disconnect: jest.fn(),
    };
    mockIo.sockets.sockets.set(playerBJoinSocket.id, playerBJoinSocket);

    const playerBData: PlayerJoinDataPayload = { name: 'PlayerB', numCPUs: 0, id: 'PlayerB-ID' };
    (gameController['publicHandleJoin'] as Function)(playerBJoinSocket, playerBData);

    // Check that a JOINED event with the correct payload was emitted for player B
    const joinedCallB = playerBJoinSocket.emit.mock.calls.find(
      (call: any) => call[0] === JOINED && call[1]?.id === playerBData.id && call[1]?.name === playerBData.name && call[1]?.roomId === 'test-room'
    );
    expect(joinedCallB).toBeDefined();
    expect(gameController['gameState'].players).toEqual([playerAData.id, playerBData.id]);
    expect(topLevelEmitMock).toHaveBeenCalledWith(
      LOBBY,
      expect.objectContaining({
        players: expect.arrayContaining([
          expect.objectContaining({ id: playerAData.id, name: playerAData.name }),
          expect.objectContaining({ id: playerBData.id, name: playerBData.name }),
        ]),
      })
    );
    let stateUpdateCallPlayer2 = topLevelEmitMock.mock.calls.find(
      (call) =>
        call[0] === STATE_UPDATE && (call[1] as StatePayload)?.started === false && (call[1] as StatePayload)?.players.length === 2
    );
    expect(stateUpdateCallPlayer2).toBeDefined();
    if (stateUpdateCallPlayer2) expect((stateUpdateCallPlayer2[1] as StatePayload).players.length).toBe(2);
    topLevelEmitMock.mockClear();
    globalMockSocket.emit.mockClear();

    // Check if gameState.started is false before trying to start the game
    expect(gameController['gameState'].started).toBe(false);

    globalMockSocket.id = 'socket-A';
    // Call the controller's startGame logic directly instead of simulating the event
    (gameController['handleStartGame'] as Function)({ computerCount: 0, socket: globalMockSocket });

    // After starting, the gameState.deck should be initialized with cards
    expect(gameController['gameState'].deck).not.toBeNull();
    expect(gameController['gameState'].deck!.length).toBe(52 - 2 * 9);
    const playerA_Instance = gameController['players'].get(playerAData.id!);
    const playerB_Instance = gameController['players'].get(playerBData.id!);
    expect(playerA_Instance!.hand.length).toBe(3);
    expect(playerB_Instance!.hand.length).toBe(3);

    const stateUpdateCallStart = topLevelEmitMock.mock.calls.find(
      (call) => call[0] === STATE_UPDATE && (call[1] as StatePayload)?.started === true
    );
    expect(stateUpdateCallStart).toBeDefined();
    if (stateUpdateCallStart) {
      expect((stateUpdateCallStart[1] as StatePayload).players.length).toBe(2);
      expect((stateUpdateCallStart[1] as StatePayload).currentPlayerId).toBe(playerAData.id);
    }

    const nextTurnCall = topLevelEmitMock.mock.calls.find((call) => call[0] === NEXT_TURN);
    expect(nextTurnCall).toBeDefined();
    if (nextTurnCall) expect(nextTurnCall[1]).toBe(playerAData.id);
  });
});
