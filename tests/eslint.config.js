// tests/gameFlow.test.ts
import GameController from '../controllers/GameController.js';
import {
  // JOIN_GAME and START_GAME not used directly since we're calling handleJoin/handleStartGame
  JOINED,
  LOBBY,
  STATE_UPDATE,
  NEXT_TURN,
} from '../src/shared/events.js';

// --- Type Definitions for Mocks ---
interface MockSocket {
  id: string;
  join: jest.Mock<void, [string]>;
  emit: jest.Mock<void, [string, any?]>; // Ensure this matches the expected signature
  on: jest.Mock<void, [string, (data?: any, ack?: Function) => void]>;
  removeAllListeners: jest.Mock<void, []>;
  eventHandlers: Record<string, (data?: any, ack?: Function) => void>;
  simulateIncomingEvent: (event: string, data?: any, ack?: Function) => void;
  disconnect?: jest.Mock<void, []>;
}

interface MockIOWithEmit {
  emit: jest.Mock<void, [string, any?]>;
}

interface MockIO {
  on: jest.Mock<void, [string, (socket: MockSocket) => void]>;
  to: jest.Mock<MockIOWithEmit, [string]>;
  emit: jest.Mock<void, [string, any?]>;
  sockets: {
    sockets: Map<string, MockSocket>;
  };
}

interface PlayerJoinDataPayload {
  name: string;
  numCPUs?: number;
  id?: string;
}

// --- Mock Implementations ---
let globalMockSocket: MockSocket;

const topLevelEmitMock = jest.fn<void, [string, any?]>(); // Explicitly type topLevelEmitMock

const mockIo: MockIO = {
  on: jest.fn((event, handler) => {
    if (event === 'connection') {
      if (globalMockSocket && mockIo.sockets && mockIo.sockets.sockets) {
        mockIo.sockets.sockets.set(globalMockSocket.id, globalMockSocket);
      }
      if (handler && globalMockSocket) {
        // Ensure handler and globalMockSocket are defined
        handler(globalMockSocket);
      }
    }
  }),
  to: jest.fn(function (id: string): MockIOWithEmit {
    // id can be roomName or socketId
    console.log(`DEBUG_TEST: mockIo.to CALLED WITH: '${id}'`);
    const specificEmitMock = jest.fn<void, [string, any?]>((event: string, payload?: any) => {
      console.log(
        `DEBUG_TEST: mockIo.to('${id}').emit CALLED -> event: '${event}', payload:`,
        payload !== undefined ? JSON.stringify(payload) : 'undefined'
      );
      topLevelEmitMock(event, payload);
    });
    return { emit: specificEmitMock };
  }),
  emit: jest.fn<void, [string, any?]>((event: string, payload?: any) => {
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
      emit: jest.fn((event, payload) => {
        console.log(
          `DEBUG_TEST: globalMockSocket.emit CALLED -> event: '${event}', payload:`,
          payload !== undefined ? JSON.stringify(payload) : 'undefined'
        );
        topLevelEmitMock(event, payload);
      }),
      on: jest.fn((event, handler) => {
        globalMockSocket.eventHandlers[event] = handler;
      }),
      removeAllListeners: jest.fn(),
      eventHandlers: {},
      simulateIncomingEvent: (event, data, ack) => {
        if (globalMockSocket.eventHandlers[event]) {
          globalMockSocket.eventHandlers[event](data, ack);
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
    // Call the controller's join logic directly since our mock socket does not
    // automatically wire event handlers in these tests
    (gameController['publicHandleJoin'] as Function)(globalMockSocket, playerData);

    const numCPUsInTest = playerData.numCPUs || 0;
    console.log(
      'TEST_DEBUG: gameController.players.size after JOIN_GAME:',
      gameController['players'].size
    );
    console.log('TEST_DEBUG: numCPUsInTest (from playerData):', numCPUsInTest);
    console.log(
      'TEST_DEBUG: gameController.gameState.started after JOIN_GAME:',
      gameController['gameState'].started
    );
    const autoStartConditionInTest =
      gameController['players'].size === 1 &&
      numCPUsInTest > 0 &&
      !gameController['gameState'].started;
    console.log('TEST_DEBUG: Calculated autoStartCondition in test:', autoStartConditionInTest);

    expect(gameController['gameState'].players).toContain(playerData.id);
    expect(gameController['players'].has(playerData.id!)).toBe(true);

    const stateUpdateAfterAutoStart = topLevelEmitMock.mock.calls.find(
      (call) => call[0] === STATE_UPDATE && call[1]?.started === true
    );

    if (!stateUpdateAfterAutoStart) {
      console.log(
        'TEST_DEBUG: All topLevelEmitMock calls in manual-start test:',
        JSON.stringify(topLevelEmitMock.mock.calls, null, 2)
      );
    }
    expect(stateUpdateAfterAutoStart).toBeDefined();
    console.log(
      'TEST_DEBUG: stateUpdateAfterAutoStart[1] in test:',
      JSON.stringify(stateUpdateAfterAutoStart?.[1], null, 2)
    ); // ADD THIS LINE

    expect(gameController['gameState'].players).toContain('COMPUTER_1');
    expect(gameController['players'].has('COMPUTER_1')).toBe(true);

    const player1Instance = gameController['players'].get(playerData.id!);
    const cpu1Instance = gameController['players'].get('COMPUTER_1');
    expect(player1Instance!.hand.length).toBe(3);
    expect(cpu1Instance!.hand.length).toBe(3);
    expect(gameController['gameState'].deck!.length).toBe(52 - 2 * 9);

    const emittedState = stateUpdateAfterAutoStart![1];
    expect(emittedState.players.length).toBe(2);
    expect(emittedState.currentPlayerId).toBe(playerData.id); // CHANGED THIS LINE from .currentPlayer to .currentPlayerId

    const nextTurnArgs = topLevelEmitMock.mock.calls.find((call) => call[0] === NEXT_TURN);
    expect(nextTurnArgs).toBeDefined();
    expect(nextTurnArgs![1]).toBe(playerData.id);
  });
});

describe('Game Flow - Manual Start by Host', () => {
  let gameController: GameController;

  beforeEach(() => {
    topLevelEmitMock.mockClear();

    globalMockSocket = {
      id: 'host-socket-id',
      join: jest.fn(),
      emit: jest.fn((event, payload) => {
        console.log(
          `DEBUG_TEST: globalMockSocket.emit CALLED -> event: '${event}', payload:`,
          payload !== undefined ? JSON.stringify(payload) : 'undefined'
        );
        topLevelEmitMock(event, payload);
      }),
      on: jest.fn((event, handler) => {
        globalMockSocket.eventHandlers[event] = handler;
      }),
      removeAllListeners: jest.fn(),
      eventHandlers: {},
      simulateIncomingEvent: (event, data, ack) => {
        if (globalMockSocket.eventHandlers[event]) {
          globalMockSocket.eventHandlers[event](data, ack);
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
    globalMockSocket.emit = jest.fn((event, payload) => {
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

    expect(globalMockSocket.emit).toHaveBeenCalledWith(JOINED, {
      id: playerAData.id,
      name: playerAData.name,
      roomId: 'test-room',
    });
    expect(gameController['gameState'].players).toEqual([playerAData.id]);
    let stateUpdateCallHost = topLevelEmitMock.mock.calls.find(
      (call) => call[0] === STATE_UPDATE && call[1]?.started === false
    );
    expect(stateUpdateCallHost).toBeDefined();
    if (stateUpdateCallHost) expect(stateUpdateCallHost[1].players.length).toBe(1);
    topLevelEmitMock.mockClear();
    globalMockSocket.emit.mockClear();

    const playerBJoinSocket: MockSocket = {
      id: 'socket-B',
      join: jest.fn(),
      emit: jest.fn((event, payload) => {
        console.log(
          `DEBUG_TEST: playerBJoinSocket.emit (socket-B) CALLED -> event: '${event}', payload:`,
          payload !== undefined ? JSON.stringify(payload) : 'undefined'
        );
        topLevelEmitMock(event, payload);
      }),
      on: jest.fn((event, handler) => {
        (playerBJoinSocket.eventHandlers as any)[event] = handler;
      }),
      removeAllListeners: jest.fn(),
      eventHandlers: {},
      simulateIncomingEvent: (event, data, ack) => {
        if ((playerBJoinSocket.eventHandlers as any)[event]) {
          (playerBJoinSocket.eventHandlers as any)[event](data, ack);
        }
      },
      disconnect: jest.fn(),
    };
    mockIo.sockets.sockets.set(playerBJoinSocket.id, playerBJoinSocket);

    const playerBData: PlayerJoinDataPayload = { name: 'PlayerB', numCPUs: 0, id: 'PlayerB-ID' };
    (gameController['publicHandleJoin'] as Function)(playerBJoinSocket, playerBData);

    expect(playerBJoinSocket.emit).toHaveBeenCalledWith(JOINED, {
      id: playerBData.id,
      name: playerBData.name,
      roomId: 'test-room',
    });
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
        call[0] === STATE_UPDATE && call[1]?.started === false && call[1]?.players.length === 2
    );
    expect(stateUpdateCallPlayer2).toBeDefined();
    if (stateUpdateCallPlayer2) expect(stateUpdateCallPlayer2[1].players.length).toBe(2);
    topLevelEmitMock.mockClear();
    globalMockSocket.emit.mockClear();

    // Check if gameState.started is false before trying to start the game
    expect(gameController['gameState'].started).toBe(false);

    globalMockSocket.id = 'socket-A';
    globalMockSocket.simulateIncomingEvent(START_GAME, { computerCount: 0 });
    await Promise.resolve();

    // After starting, the gameState.deck should be initialized with cards
    expect(gameController['gameState'].deck).not.toBeNull();
    expect(gameController['gameState'].deck!.length).toBe(52 - 2 * 9);
    const playerA_Instance = gameController['players'].get(playerAData.id!);
    const playerB_Instance = gameController['players'].get(playerBData.id!);
    expect(playerA_Instance!.hand.length).toBe(3);
    expect(playerB_Instance!.hand.length).toBe(3);

    const stateUpdateCallStart = topLevelEmitMock.mock.calls.find(
      (call) => call[0] === STATE_UPDATE && call[1]?.started === true
    );
    expect(stateUpdateCallStart).toBeDefined();
    if (stateUpdateCallStart) {
      expect(stateUpdateCallStart[1].players.length).toBe(2);
      expect(stateUpdateCallStart[1].currentPlayerId).toBe(playerAData.id); // Changed from currentPlayer to currentPlayerId
    }

    const nextTurnCall = topLevelEmitMock.mock.calls.find((call) => call[0] === NEXT_TURN);
    expect(nextTurnCall).toBeDefined();
    if (nextTurnCall) expect(nextTurnCall[1]).toBe(playerAData.id);
  });
});