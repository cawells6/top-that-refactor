// tests/gameFlow.test.ts
import GameController from '../controllers/GameController';
import Player from '../models/Player'; // For type hints
import GameState from '../models/GameState'; // For type hints
import { Card } from '../src/types';      // For type hints
import {
  JOIN_GAME,
  JOINED,
  PLAYER_JOINED,
  LOBBY,
  START_GAME,
  STATE_UPDATE,
  NEXT_TURN,
} from '../src/shared/events';

// --- Type Definitions for Mocks ---
interface MockSocket {
  id: string;
  join: jest.Mock<void, [string]>;
  emit: jest.Mock<void, [string, any?]>;
  on: jest.Mock<void, [string, (data?: any, ack?: Function) => void]>;
  eventHandlers: Record<string, (data?: any, ack?: Function) => void>;
  simulateIncomingEvent: (event: string, data?: any, ack?: Function) => void;
  disconnect?: jest.Mock<void, []>;
}

interface MockIO {
  on: jest.Mock<void, [string, (socket: MockSocket) => void]>;
  to: jest.Mock<MockIO, [string]>;
  emit: jest.Mock<void, [string, any?]>;
}

interface PlayerJoinDataPayload {
  name: string;
  numCPUs?: number;
  id?: string;
}

// --- Mock Implementations ---
let globalMockSocket: MockSocket;

const mockIo: MockIO = {
  on: jest.fn((event, handler) => {
    if (event === 'connection') {
      handler(globalMockSocket);
    }
  }),
  to: jest.fn(function(this: MockIO, roomName: string) {
    return this;
  }),
  emit: jest.fn(),
};

describe('Game Flow - Single Player vs CPU (auto-start)', () => {
  let gameController: GameController;

  beforeEach(() => {
    globalMockSocket = {
      id: 'socket-id-1',
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn((event, handler) => {
        globalMockSocket.eventHandlers[event] = handler;
      }),
      eventHandlers: {},
      simulateIncomingEvent: (event, data, ack) => {
        if (globalMockSocket.eventHandlers[event]) {
          globalMockSocket.eventHandlers[event](data, ack);
        } else {
          // Optional: log if no handler is found for a simulated event
          // console.log(`No handler for simulated event: ${event}`);
        }
      },
      disconnect: jest.fn(),
    };
    mockIo.on.mockClear();
    mockIo.to.mockClear();
    mockIo.emit.mockClear();
    gameController = new GameController(mockIo as any);
  });

  test('Player joins, game auto-starts with 1 CPU, initial state is broadcast', () => {
    const playerData: PlayerJoinDataPayload = { name: 'Player1', numCPUs: 1, id: 'Player1-ID' };
    // Simulate the JOIN_GAME event from the client
    globalMockSocket.simulateIncomingEvent(JOIN_GAME, playerData);

    // Initial checks (Player1 should be added immediately by handleJoin)
    expect(gameController['gameState'].players).toContain(playerData.id);
    expect(gameController['players'].has(playerData.id!)).toBe(true);

    // The GameController's handleJoin calls handleStartGame (for auto-start),
    // which then calls pushState. pushState emits STATE_UPDATE.
    // We need to find the STATE_UPDATE call that indicates the game has started.
    const stateUpdateAfterAutoStart = mockIo.emit.mock.calls.find(call => call[0] === STATE_UPDATE && call[1]?.started === true);
    
    // If this fails, it means the expected STATE_UPDATE (with started:true) wasn't emitted.
    // Adding a console.log here can help see what *was* emitted if the test fails.
    if (!stateUpdateAfterAutoStart) {
        console.log('TEST_DEBUG: All mockIo.emit calls in auto-start test:', JSON.stringify(mockIo.emit.mock.calls, null, 2));
    }
    expect(stateUpdateAfterAutoStart).toBeDefined();

    // Now that we have (presumably) found the state update after game start:
    expect(gameController['gameState'].players).toContain('COMPUTER_1');
    expect(gameController['players'].has('COMPUTER_1')).toBe(true);

    const player1Instance = gameController['players'].get(playerData.id!);
    const cpu1Instance = gameController['players'].get('COMPUTER_1');
    expect(player1Instance!.hand.length).toBe(3);
    expect(cpu1Instance!.hand.length).toBe(3);
    // For 2 players (Player1 + COMPUTER_1), GameState.buildDeck uses 1 deck (52 cards)
    // Each gets 3 hand, 3 up, 3 down = 9 cards. Total 18 cards dealt.
    expect(gameController['gameState'].deck.length).toBe(52 - (2 * 9));

    const emittedState = stateUpdateAfterAutoStart![1]; // Asserted it's defined
    expect(emittedState.players.length).toBe(2);
    expect(emittedState.currentPlayer).toBe(playerData.id);

    const nextTurnArgs = mockIo.emit.mock.calls.find(call => call[0] === NEXT_TURN);
    expect(nextTurnArgs).toBeDefined();
    expect(nextTurnArgs![1]).toBe(playerData.id);
  });
});

describe('Game Flow - Manual Start by Host', () => {
  let gameController: GameController;

  beforeEach(() => {
    globalMockSocket = {
      id: 'host-socket-id',
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn((event, handler) => { globalMockSocket.eventHandlers[event] = handler; }),
      eventHandlers: {},
      simulateIncomingEvent: (event, data, ack) => {
        if (globalMockSocket.eventHandlers[event]) {
          globalMockSocket.eventHandlers[event](data, ack);
        }
      },
      disconnect: jest.fn(),
    };
    mockIo.on.mockClear();
    mockIo.to.mockClear();
    mockIo.emit.mockClear();
    gameController = new GameController(mockIo as any);
  });

  test('Host joins (no auto-CPUs), Player2 joins, Host starts game (no explicit CPUs)', () => {
    globalMockSocket.id = 'socket-A';
    const playerAData: PlayerJoinDataPayload = { name: 'PlayerA', numCPUs: 0, id: 'PlayerA-ID' };
    (gameController['handleJoin'] as Function)(globalMockSocket, playerAData);

    expect(globalMockSocket.emit).toHaveBeenCalledWith(JOINED, { id: playerAData.id, roomId: 'game-room' });
    expect(gameController['gameState'].players).toEqual([playerAData.id]);
    let stateUpdateCallHost = mockIo.emit.mock.calls.find(call => call[0] === STATE_UPDATE && call[1]?.started === false);
    expect(stateUpdateCallHost).toBeDefined();
    if(stateUpdateCallHost) expect(stateUpdateCallHost[1].players.length).toBe(1);
    mockIo.emit.mockClear();
    globalMockSocket.emit.mockClear();

    globalMockSocket.id = 'socket-B';
    const playerBData: PlayerJoinDataPayload = { name: 'PlayerB', numCPUs: 0, id: 'PlayerB-ID' };
    (gameController['handleJoin'] as Function)(globalMockSocket, playerBData);

    expect(globalMockSocket.emit).toHaveBeenCalledWith(JOINED, { id: playerBData.id, roomId: 'game-room' });
    expect(gameController['gameState'].players).toEqual([playerAData.id, playerBData.id]);
    expect(mockIo.emit).toHaveBeenCalledWith(LOBBY, expect.objectContaining({
      players: expect.arrayContaining([
        expect.objectContaining({ id: playerAData.id, name: playerAData.name }),
        expect.objectContaining({ id: playerBData.id, name: playerBData.name }),
      ]),
    }));
    let stateUpdateCallPlayer2 = mockIo.emit.mock.calls.find(call => call[0] === STATE_UPDATE && call[1]?.started === false && call[1]?.players.length === 2);
    expect(stateUpdateCallPlayer2).toBeDefined();
    if(stateUpdateCallPlayer2) expect(stateUpdateCallPlayer2[1].players.length).toBe(2);
    mockIo.emit.mockClear();
    globalMockSocket.emit.mockClear();

    globalMockSocket.id = 'socket-A';
    globalMockSocket.simulateIncomingEvent(START_GAME, { computerCount: 0 });

    expect(gameController['gameState'].deck.length).toBe(52 - (2 * 9));
    const playerA_Instance = gameController['players'].get(playerAData.id!);
    const playerB_Instance = gameController['players'].get(playerBData.id!);
    expect(playerA_Instance!.hand.length).toBe(3);
    expect(playerB_Instance!.hand.length).toBe(3);

    const stateUpdateCallStart = mockIo.emit.mock.calls.find(call => call[0] === STATE_UPDATE && call[1]?.started === true);
    expect(stateUpdateCallStart).toBeDefined();
    if(stateUpdateCallStart) {
        expect(stateUpdateCallStart[1].players.length).toBe(2);
        expect(stateUpdateCallStart[1].currentPlayer).toBe(playerAData.id);
    }

    const nextTurnCall = mockIo.emit.mock.calls.find(call => call[0] === NEXT_TURN);
    expect(nextTurnCall).toBeDefined();
    if(nextTurnCall) expect(nextTurnCall[1]).toBe(playerAData.id);
  });
});