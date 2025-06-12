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
    socketReady: Promise.resolve(),
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

const realDebug = console.debug;
beforeEach(() => {
  console.debug = () => {};
});

afterAll(() => {
  console.debug = realDebug;
});

describe('Client Main Script (main.ts)', () => {
  it('should attempt to connect with Socket.IO when loaded', async () => {
    jest.resetModules();
    const stateModule = await import('./state.js');
    (window as any).MutationObserver = class {
      observe() {}
      disconnect() {}
    };
    await import('./main.js');
    // Provide required modal element for InSessionLobbyModal constructor
    const modal = document.createElement('div');
    modal.id = 'in-session-lobby-modal';
    modal.innerHTML = '<div id="players-container"></div>';
    document.body.appendChild(modal);
    // Manually dispatch DOMContentLoaded to trigger initialization
    document.dispatchEvent(new Event('DOMContentLoaded'));
    // Allow queued promises to resolve from async handlers
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.classList.contains('body-loading')).toBe(false);
  });
});
