import GameController from '../controllers/GameController.js';
import { 
  JOIN_GAME, 
  JOINED, 
  PLAYER_JOINED,
  LOBBY,
  STATE_UPDATE,
  START_GAME
} from '../src/shared/events.js';

describe('Game flow tests', () => {
  let io, sockets, controller;
  
  // Socket.IO mock setup
  beforeEach(() => {
    sockets = {};
    io = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'connection') {
          // Store the callback to simulate connections later
          io.connectionCallback = callback;
        }
      }),
      // Add missing required Socket.IO Server properties
      sockets: { emit: jest.fn() },
      engine: {},
      httpServer: {},
      path: () => '/',
      adapter: {},
      // Add any other required properties used by your GameController
    };
    
    // @ts-ignore - We're using a simplified mock of Socket.IO server
    controller = new GameController(io);
  });
  
  test('JOIN → lobby → START_GAME flow emits STATE_UPDATE without errors', () => {
    // Create mock sockets
    const socket1 = createMockSocket('socket1');
    const socket2 = createMockSocket('socket2');
    
    // Simulate connections
    io.connectionCallback(socket1);
    io.connectionCallback(socket2);
    
    // Test JOIN_GAME for player1
    socket1.emit(JOIN_GAME, 'player1');
    
    // Verify socket1 received JOINED event with correct data
    expect(socket1.emit).toHaveBeenCalledWith(JOINED, {
      id: 'player1',
      roomId: 'game-room'
    });
    
    // Verify socket1 joined the room
    expect(socket1.join).toHaveBeenCalledWith('game-room');
    
    // Verify PLAYER_JOINED was emitted to the room
    expect(io.to).toHaveBeenCalledWith('game-room');
    expect(io.emit).toHaveBeenCalledWith(PLAYER_JOINED, ['player1']);
    
    // Verify LOBBY data was emitted
    expect(io.to).toHaveBeenCalledWith('game-room');
    expect(io.emit).toHaveBeenCalledWith(LOBBY, {
      roomId: 'game-room',
      players: ['player1'],
      maxPlayers: 4
    });
    
    // Test JOIN_GAME for player2
    socket2.emit(JOIN_GAME, 'player2');
    
    // Verify socket2 received JOINED event
    expect(socket2.emit).toHaveBeenCalledWith(JOINED, {
      id: 'player2',
      roomId: 'game-room'
    });
    
    // Start the game
    socket1.emit(START_GAME);
    
    // Verify STATE_UPDATE was emitted with game state
    expect(io.to).toHaveBeenCalledWith('game-room');
    expect(io.emit).toHaveBeenCalledWith(STATE_UPDATE, expect.objectContaining({
      players: expect.any(Array),
      currentPlayer: expect.any(String)
    }));
  });
  
  // Helper function to create mock socket
  function createMockSocket(id) {
    const socket = {
      id,
      emit: jest.fn(),
      on: jest.fn(),
      join: jest.fn()
    };
    
    // Store handlers for events
    const handlers = {};
    
    // Override on method to store handlers
    socket.on = jest.fn((event, handler) => {
      handlers[event] = handler;
    });
    
    // Add emit method to trigger stored handlers
    socket.emit = jest.fn((event, ...args) => {
      if (event && handlers[event]) {
        handlers[event](...args);
      }
    });
    
    sockets[id] = socket;
    return socket;
  }
});
