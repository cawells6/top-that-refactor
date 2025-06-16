// tests/gameFlow.test.ts
import { jest, describe, it, beforeEach, expect } from '@jest/globals';

import GameController from '../controllers/GameController.js';

// Use string literals for event names to avoid import errors
const JOINED = 'joined';
const LOBBY = 'lobby';
const STATE_UPDATE = 'state-update';
const NEXT_TURN = 'next-turn';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const START_GAME = 'start-game';

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
  numHumans?: number;
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
  to: jest.fn(function (_id: string): MockIOWithEmit {
    const specificEmitMock = jest.fn((event: string, payload?: any) => {
      topLevelEmitMock(event, payload);
    });
    return { emit: specificEmitMock };
  }),
  emit: jest.fn((event: string, payload?: any) => {
    topLevelEmitMock(event, payload);
  }),
  sockets: {
    sockets: new Map<string, MockSocket>(),
  },
};

describe('Game Flow - All Bots (instant start)', () => {
  let gameController: GameController;
  beforeEach(() => {
    topLevelEmitMock.mockClear();
    globalMockSocket = {
      id: 'host-socket',
      join: jest.fn(),
      emit: jest.fn((event: string, payload?: any) => {
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
    gameController = new GameController(mockIo as any, 'test-room');
  });
  it('Host sets 1 human and 3 bots, game starts immediately', async () => {
    const hostData = { name: 'Host', numHumans: 1, numCPUs: 3, id: 'HOST_ID' };
    (gameController['publicHandleJoin'] as Function)(globalMockSocket, hostData);
    // Wait for async game start
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(gameController['gameState'].started).toBe(true);
    expect(gameController['gameState'].players.length).toBe(4);
    for (const pid of gameController['gameState'].players) {
      const p = gameController['players'].get(pid);
      expect(p.hand.length).toBe(3);
      expect(p.upCards.length).toBe(3);
      expect(p.downCards.length).toBe(3);
    }
  });
});

describe('Game Flow - Single Player vs CPU (instant start)', () => {
  let gameController: GameController;
  beforeEach(() => {
    topLevelEmitMock.mockClear();
    globalMockSocket = {
      id: 'socket-id-1',
      join: jest.fn(),
      emit: jest.fn((event: string, payload?: any) => {
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
    gameController = new GameController(mockIo as any, 'test-room');
  });
  it('Host joins, sets 1 human and 1 CPU, game starts instantly, all players get 9 cards', async () => {
    const hostData = { name: 'Host', numHumans: 1, numCPUs: 1, id: 'HOST_ID' };
    (gameController['publicHandleJoin'] as Function)(globalMockSocket, hostData);
    // Wait for async game start
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(gameController['gameState'].started).toBe(true);
    expect(gameController['gameState'].players.length).toBe(2);
    for (const pid of gameController['gameState'].players) {
      const p = gameController['players'].get(pid);
      expect(p.hand.length).toBe(3);
      expect(p.upCards.length).toBe(3);
      expect(p.downCards.length).toBe(3);
    }
  });
});

describe('Game Flow - Lobby with Extra Human', () => {
  let gameController: GameController;

  beforeEach(() => {
    topLevelEmitMock.mockClear();

    globalMockSocket = {
      id: 'socket-lobby',
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      eventHandlers: {},
      simulateIncomingEvent: () => {},
      disconnect: jest.fn(),
    } as unknown as MockSocket;

    if (mockIo.sockets && mockIo.sockets.sockets) {
      mockIo.sockets.sockets.clear();
      mockIo.sockets.sockets.set(globalMockSocket.id, globalMockSocket);
    }

    mockIo.on.mockClear();
    mockIo.to.mockClear();
    gameController = new GameController(mockIo as any, 'test-room');
  });

  test('No auto-start when expecting another human', () => {
    const playerData: PlayerJoinDataPayload = {
      name: 'Host',
      numHumans: 2,
      numCPUs: 1,
      id: 'HOST_ID',
    };

    (gameController['publicHandleJoin'] as Function)(globalMockSocket, playerData);

    expect(gameController['gameState'].started).toBe(false);
    expect(gameController['players'].has('COMPUTER_1')).toBe(false);
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
    gameController = new GameController(mockIo as any, 'test-room');
  });
  test('Host joins (no auto-CPUs), Player2 joins, Host starts game (no explicit CPUs)', () => {
    const originalHostSocketId = globalMockSocket.id;
    if (mockIo.sockets.sockets.has(originalHostSocketId)) {
      mockIo.sockets.sockets.delete(originalHostSocketId);
    }

    globalMockSocket.id = 'socket-A';
    globalMockSocket.emit = jest.fn((event: string, payload?: any) => {
      topLevelEmitMock(event, payload);
    });
    // Ensure the GameController can find this socket by its new ID
    if (mockIo.sockets && mockIo.sockets.sockets) {
      // Ensure sockets map exists
      mockIo.sockets.sockets.set(globalMockSocket.id, globalMockSocket);
    }

    const playerAData: PlayerJoinDataPayload = { name: 'PlayerA', numCPUs: 0, id: 'PlayerA-ID' };
    (gameController['publicHandleJoin'] as Function)(globalMockSocket, playerAData);
    // Check that a JOINED event with the correct payload was emitted (allowing for extra events)
    const joinedCallHost = globalMockSocket.emit.mock.calls.find(
      (call: any) =>
        call[0] === JOINED &&
        call[1]?.id === playerAData.id &&
        call[1]?.name === playerAData.name &&
        call[1]?.roomId === 'test-room'
    );
    expect(joinedCallHost).toBeDefined();
    expect(gameController['gameState'].players).toEqual([playerAData.id]);
    let stateUpdateCallHost = topLevelEmitMock.mock.calls.find(
      (call: any) => call[0] === STATE_UPDATE && (call[1] as StatePayload)?.started === false
    );
    expect(stateUpdateCallHost).toBeDefined();
    if (stateUpdateCallHost)
      expect((stateUpdateCallHost[1] as StatePayload).players.length).toBe(1);
    // Only clear mocks after all assertions
    topLevelEmitMock.mockClear();
    globalMockSocket.emit.mockClear();

    const playerBJoinSocket: MockSocket = {
      id: 'socket-B',
      join: jest.fn(),
      emit: jest.fn((event: string, payload?: any) => {
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
      (call: any) =>
        call[0] === JOINED &&
        call[1]?.id === playerBData.id &&
        call[1]?.name === playerBData.name &&
        call[1]?.roomId === 'test-room'
    );
    expect(joinedCallB).toBeDefined();
    expect(gameController['gameState'].players).toEqual([playerAData.id, playerBData.id]);
    // Check that a LOBBY event with the correct payload was emitted (allow for extra events)
    // Debug: print all calls to topLevelEmitMock
    // eslint-disable-next-line no-console
    console.log('topLevelEmitMock calls:', JSON.stringify(topLevelEmitMock.mock.calls, null, 2));
    // Check that a LOBBY event with the correct payload was emitted (allow for extra events)
    const lobbyCall = topLevelEmitMock.mock.calls.some(
      (call) => {
        // Debug: print each call
        // eslint-disable-next-line no-console
        console.log('Checking call:', call[0], call[1]);
        return (
          call[0] === LOBBY &&
          call[1] &&
          Array.isArray(call[1].players) &&
          call[1].players.some((p: any) => p.id === playerAData.id && p.name === playerAData.name) &&
          call[1].players.some((p: any) => p.id === playerBData.id && p.name === playerBData.name)
        );
      }
    );
    expect(lobbyCall).toBe(true);
    let stateUpdateCallPlayer2 = topLevelEmitMock.mock.calls.find(
      (call) =>
        call[0] === STATE_UPDATE &&
        (call[1] as StatePayload)?.started === false &&
        (call[1] as StatePayload)?.players.length === 2
    );
    expect(stateUpdateCallPlayer2).toBeDefined();
    if (stateUpdateCallPlayer2)
      expect((stateUpdateCallPlayer2[1] as StatePayload).players.length).toBe(2);
    topLevelEmitMock.mockClear();
    globalMockSocket.emit.mockClear();

    // Check if gameState.started is false before trying to start the game
    expect(gameController['gameState'].started).toBe(false);

    globalMockSocket.id = 'socket-A';
    // Call the controller's startGame logic directly instead of simulating the event
    (gameController['handleStartGame'] as Function)({ computerCount: 0, socket: globalMockSocket });

    // After starting, the gameState.deck should be initialized with cards
    expect(gameController['gameState'].started).toBe(true);
    expect(gameController['gameState'].deck).not.toBeNull();
    expect(gameController['gameState'].deck!.length).toBe(52 - 2 * 9);
    const playerA_Instance = gameController['players'].get('PlayerA-ID');
    const playerB_Instance = gameController['players'].get('PlayerB-ID');
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

describe('Game Flow - Only host can start the game', () => {
  let gameController: GameController;
  beforeEach(() => {
    topLevelEmitMock.mockClear();
    globalMockSocket = {
      id: 'host-socket',
      join: jest.fn(),
      emit: jest.fn((event: string, payload?: any) => {
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
    gameController = new GameController(mockIo as any, 'test-room');
  });
  test('Non-host cannot start the game', () => {
    const hostData = { name: 'Host', numHumans: 2, numCPUs: 1, id: 'HOST_ID' };
    (gameController['publicHandleJoin'] as Function)(globalMockSocket, hostData);
    // Simulate a non-host joining
    const playerSocket = { ...globalMockSocket, id: 'player-socket' };
    const playerData = { name: 'Player', id: 'PLAYER_ID' };
    (gameController['publicHandleJoin'] as Function)(playerSocket, playerData);
    // Non-host tries to start the game
    (gameController['handleStartGame'] as Function)({ computerCount: 1, socket: playerSocket });
    // Game should NOT start
    expect(gameController['gameState'].started).toBe(false);
  });
});

describe('E2E Game Flow - Full Session', () => {
  let gameController: GameController;
  let hostSocket: MockSocket;
  let playerSocket: MockSocket;
  let cpuId = 'COMPUTER_1';
  beforeEach(() => {
    topLevelEmitMock.mockClear();
    // Host
    hostSocket = {
      id: 'host-socket',
      join: jest.fn(),
      emit: jest.fn((event: string, payload?: any) => topLevelEmitMock(event, payload)),
      on: jest.fn((event: string, handler: (data?: any, ack?: Function) => void) => {
        hostSocket.eventHandlers[event as string] = handler;
      }),
      removeAllListeners: jest.fn(),
      eventHandlers: {},
      simulateIncomingEvent: (event, data, ack) => {
        if (hostSocket.eventHandlers[event as string]) {
          hostSocket.eventHandlers[event as string](data, ack);
        }
      },
      disconnect: jest.fn(),
    };
    // Player
    playerSocket = {
      id: 'player-socket',
      join: jest.fn(),
      emit: jest.fn((event: string, payload?: any) => topLevelEmitMock(event, payload)),
      on: jest.fn((event: string, handler: (data?: any, ack?: Function) => void) => {
        playerSocket.eventHandlers[event as string] = handler;
      }),
      removeAllListeners: jest.fn(),
      eventHandlers: {},
      simulateIncomingEvent: (event, data, ack) => {
        if (playerSocket.eventHandlers[event as string]) {
          playerSocket.eventHandlers[event as string](data, ack);
        }
      },
      disconnect: jest.fn(),
    };
    mockIo.sockets.sockets.clear();
    mockIo.sockets.sockets.set(hostSocket.id, hostSocket);
    mockIo.sockets.sockets.set(playerSocket.id, playerSocket);
    mockIo.on.mockClear();
    mockIo.to.mockClear();
    gameController = new GameController(mockIo as any, 'e2e-room');
  });
  it('plays a full game: lobby → start → play → win', async () => {
    // 1. Host joins and sets up 2 humans, 1 CPU
    (gameController['publicHandleJoin'] as Function)(hostSocket, { name: 'Host', numHumans: 2, numCPUs: 1, id: 'HOST_ID' });
    (gameController['publicHandleJoin'] as Function)(playerSocket, { name: 'Alice', id: 'ALICE_ID' });
    // 2. Host starts the game
    (gameController['handleStartGame'] as Function)({ computerCount: 1, socket: hostSocket });
    // 3. All players should have 9 cards (3 hand, 3 up, 3 down)
    const ids = gameController['gameState'].players;
    ids.forEach(pid => {
      const p = gameController['players'].get(pid);
      expect(p.hand.length).toBe(3);
      expect(p.upCards.length).toBe(3);
      expect(p.downCards.length).toBe(3);
    });
    // 4. Simulate a round of valid plays (host, then Alice, then CPU)
    // For simplicity, play the first card from hand for each
    for (let round = 0; round < 3; round++) {
      const currentId = gameController['gameState'].players[gameController['gameState'].currentPlayerIndex];
      const player = gameController['players'].get(currentId);
      if (!player) continue;
      // Find the socket for this player (host, Alice, or CPU)
      let socket: MockSocket | undefined = undefined;
      if (currentId === 'HOST_ID') socket = hostSocket;
      else if (currentId === 'ALICE_ID') socket = playerSocket;
      // CPU: skip socket, call internal directly
      if (player.isComputer) {
        // Simulate a valid play for CPU
        const handIdx = player.hand.length > 0 ? 0 : null;
        if (handIdx !== null) {
          gameController['handlePlayCardInternal'](player, [handIdx], 'hand', [player.hand[handIdx]]);
        }
      } else if (socket) {
        // Simulate play from hand
        (gameController['handlePlayCard'] as Function)(socket, { cardIndices: [0], zone: 'hand' });
      }
    }
    // 5. Simulate host playing all cards to win
    const host = gameController['players'].get('HOST_ID');
    if (host) {
      // Play all hand, up, and down cards
      while (host.hand.length > 0) {
        (gameController['handlePlayCard'] as Function)(hostSocket, { cardIndices: [0], zone: 'hand' });
      }
      while (host.upCards.length > 0) {
        (gameController['handlePlayCard'] as Function)(hostSocket, { cardIndices: [0], zone: 'upCards' });
      }
      while (host.downCards.length > 0) {
        (gameController['handlePlayCard'] as Function)(hostSocket, { cardIndices: [0], zone: 'downCards' });
      }
    }
    // 6. Check for GAME_OVER event and winner
    const gameOverCall = topLevelEmitMock.mock.calls.find(call => call[0] === 'game-over');
    expect(gameOverCall).toBeDefined();
    if (gameOverCall) {
      expect(gameOverCall[1]).toMatchObject({ winnerId: 'HOST_ID' });
    }
    // 7. Optionally, restart: end game, rejoin, start again (not implemented here)
  });
});
