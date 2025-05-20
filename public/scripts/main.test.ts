/** @jest-environment jsdom */

// Mock dependencies
jest.mock(
  './state.js',
  () => ({
    socket: { on: jest.fn(), emit: jest.fn(), id: 'mock-socket-id' },
    myId: null,
    currentRoom: null,
    setMyId: jest.fn(),
    setCurrentRoom: jest.fn(),
    saveSession: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  './render.js',
  () => ({
    renderGameState: jest.fn(),
    renderLobby: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  './uiManager.js',
  () => ({
    showLobbyForm: jest.fn(),
    showWaitingState: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  './events.js',
  () => ({
    initializePageEventListeners: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  './socketService.js',
  () => ({
    initializeSocketHandlers: jest.fn(),
  }),
  { virtual: true }
);

describe('Client Main Script (main.ts)', () => {
  it('should attempt to connect with Socket.IO when loaded', async () => {
    jest.resetModules();
    const stateModule = await import('./state.js');
    await import('./main.js');
    const { socket } = stateModule;
    expect(socket.on).toHaveBeenCalledWith('connect', expect.any(Function));
  });
});
