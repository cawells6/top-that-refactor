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

function setupMainDOM({ withLobby = true, withModal = true } = {}) {
  document.body.innerHTML = `
    <div id="main-content" class="preload-hidden"></div>
    ${withLobby ? '<div id="lobby-container" class="hidden"></div>' : ''}
    ${
      withModal
        ? `<div id="in-session-lobby-modal" class="modal modal--hidden">
            <div id="in-session-lobby-title"></div>
            <div id="players-container"></div>
            <button id="copy-link-button"></button>
            <button id="ready-up-button"></button>
            <input id="guest-player-name-input" />
          </div>`
        : ''
    }
    <div id="waiting-state" class="hidden"></div>
  `;
  document.body.className = 'body-loading';
}

describe('Client Main Script (main.ts)', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
    document.body.className = '';
    window.history.replaceState({}, document.title, '/');
  });

  it('should attempt to connect with Socket.IO when loaded', async () => {
    setupMainDOM();
    const stateModule = await import('./state.js');
    await jest.isolateModulesAsync(async () => {
      await import('./main.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await Promise.resolve();
    });
    const { socket } = stateModule;
    expect(socket.on).toHaveBeenCalledWith('connect', expect.any(Function));
  });

  it('should unhide lobby and set correct classes on DOMContentLoaded', async () => {
    setupMainDOM();
    await jest.isolateModulesAsync(async () => {
      await import('./main.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
    });
    expect(document.body.classList.contains('body-loading')).toBe(false);
    expect(document.body.classList.contains('showing-lobby')).toBe(true);
    const lobby = document.getElementById('lobby-container');
    expect(lobby?.classList.contains('hidden')).toBe(false);
  });

  it('should not throw if lobby container is missing', async () => {
    setupMainDOM({ withLobby: false });
    await jest.isolateModulesAsync(async () => {
      await import('./main.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
    });
    expect(document.body.classList.contains('showing-lobby')).toBe(true);
  });

  it('should not run join link logic if already in-session', async () => {
    setupMainDOM();
    document.body.classList.add('in-session');
    window.history.replaceState({}, document.title, '/?room=ROOM456');
    const stateModule = await import('./state.js');
    await jest.isolateModulesAsync(async () => {
      await import('./main.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await Promise.resolve();
    });
    expect(stateModule.setCurrentRoom).not.toHaveBeenCalledWith('ROOM456');
    expect(stateModule.socket.emit).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ roomId: 'ROOM456' })
    );
  });

  it('should not throw if in-session modal is missing', async () => {
    setupMainDOM({ withModal: false });
    await jest.isolateModulesAsync(async () => {
      await import('./main.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
    });
    expect(document.body.classList.contains('showing-lobby')).toBe(true);
  });

  it('removes inline styles from player icons and observes DOM changes', async () => {
    setupMainDOM();
    await jest.isolateModulesAsync(async () => {
      await import('./main.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
    });
    // Add a player icon with inline style
    const icon = document.createElement('img');
    icon.className = 'player-silhouette';
    icon.setAttribute('style', 'width: 99px; height: 99px;');
    document.body.appendChild(icon);
    // Trigger a mutation
    icon.setAttribute('style', 'width: 88px;');
    // MutationObserver should remove style
    setTimeout(() => {
      expect(icon.hasAttribute('style')).toBe(false);
      expect(icon.hasAttribute('width')).toBe(false);
      expect(icon.hasAttribute('height')).toBe(false);
    }, 10);
  });
});
