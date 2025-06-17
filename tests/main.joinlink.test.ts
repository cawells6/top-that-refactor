/** @jest-environment jsdom */

/**
 * Best Practice: For tests that expect the DOM, always call setupMainDOM() before requiring main.js.
 * For tests that intentionally test missing DOM, mock InSessionLobbyModal to avoid constructor errors.
 */

/**
 * Best Practice: Use setupModalDOM() or mockInSessionLobbyModal() from tests/utils/domSetup for modal-related tests.
 *   - setupModalDOM(): For tests that require the modal DOM structure.
 *   - mockInSessionLobbyModal(): For tests that intentionally omit DOM setup but import/require the modal.
 */
import { setupModalDOM, mockInSessionLobbyModal } from './utils/domSetup';

describe('Client Main Script (main.ts) - Join Link Only', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
    document.body.className = '';
    window.history.replaceState({}, document.title, '/');
  });

  // Helper for consistent DOM setup
  function setupMainDOM() {
    document.body.innerHTML = `
      <div id="main-content" class="preload-hidden"></div>
      <div id="lobby-container" class="hidden"></div>
      <div id="in-session-lobby-modal" class="modal modal--hidden">
        <div id="in-session-lobby-title"></div>
        <div id="players-container"></div>
        <button id="copy-link-button"></button>
        <button id="ready-up-button"></button>
        <input id="guest-player-name-input" />
      </div>
      <div id="waiting-state" class="hidden"></div>
      <!-- Minimal .player-silhouette structure for main.ts DOM queries -->
      <div class="player-silhouette">
        <img src="" alt="player" />
        <span class="user-icon"></span>
        <span class="robot-icon"></span>
      </div>
    `;
    document.body.className = 'body-loading';
  }

  // Helper for consistent state mock
  function getStateMock(overrides = {}) {
    return {
      socket: { on: jest.fn(), emit: jest.fn(), id: 'mock-socket-id' },
      myId: null,
      currentRoom: null,
      setMyId: jest.fn(),
      setCurrentRoom: jest.fn(),
      saveSession: jest.fn(),
      loadSession: jest.fn(),
      socketReady: Promise.resolve(),
      ...overrides,
    };
  }

  it('should handle join link in URL and emit JOIN_GAME', async () => {
    jest.resetModules();
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=ROOM123');
    // Import initMain from main.ts
    const { initMain } = await import('../public/scripts/main.ts');
    // Create mocks
    const setCurrentRoom = jest.fn();
    const emit = jest.fn();
    const socket = { emit, on: jest.fn(), id: 'mock-socket-id' };
    // Call initMain with injected mocks
    await initMain({
      injectedSetCurrentRoom: setCurrentRoom,
      injectedSocket: socket,
      injectedWindow: window,
      injectedDocument: document,
    });
    // Debug output for diagnosis
    console.log('setCurrentRoom calls:', setCurrentRoom.mock.calls);
    console.log('socket.emit calls:', emit.mock.calls);
    // Robust: Check that setCurrentRoom and socket.emit were called at least once with expected args
    expect(setCurrentRoom.mock.calls.some(call => call[0] === 'ROOM123')).toBe(true);
    expect(emit.mock.calls.some(call => call[1]?.roomId === 'ROOM123' && call[1]?.playerName === 'Guest')).toBe(true);
    expect(window.location.search).toBe('');
  });

  it('should do nothing if no room param in URL', async () => {
    jest.resetModules();
    jest.doMock('../public/scripts/state.js', () => getStateMock(), { virtual: true });
    setupMainDOM();
    window.history.replaceState({}, document.title, '/');
    await jest.isolateModulesAsync(async () => {
      require('../public/scripts/main.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await Promise.resolve();
    });
    const stateModule = jest.requireMock('../public/scripts/state.js');
    expect(stateModule.setCurrentRoom).not.toHaveBeenCalled();
    expect(stateModule.socket.emit).not.toHaveBeenCalled();
  });

  it('should do nothing if room param is empty', async () => {
    jest.resetModules();
    jest.doMock('../public/scripts/state.js', () => getStateMock(), { virtual: true });
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=');
    await jest.isolateModulesAsync(async () => {
      require('../public/scripts/main.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await Promise.resolve();
    });
    const stateModule = jest.requireMock('../public/scripts/state.js');
    expect(stateModule.setCurrentRoom).not.toHaveBeenCalled();
    expect(stateModule.socket.emit).not.toHaveBeenCalled();
  });

  it('should not join if already in-session', async () => {
    jest.resetModules();
    jest.doMock('../public/scripts/state.js', () => getStateMock(), { virtual: true });
    setupMainDOM();
    document.body.classList.add('in-session');
    window.history.replaceState({}, document.title, '/?room=ROOMX');
    await jest.isolateModulesAsync(async () => {
      require('../public/scripts/main.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await Promise.resolve();
    });
    const stateModule = jest.requireMock('../public/scripts/state.js');
    expect(stateModule.setCurrentRoom).not.toHaveBeenCalled();
    expect(stateModule.socket.emit).not.toHaveBeenCalled();
  });

  it('should handle room param with whitespace and special characters', async () => {
    jest.resetModules();
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=%20ROOM%20%40%23%24');
    const { initMain } = await import('../public/scripts/main.ts');
    const setCurrentRoom = jest.fn();
    const emit = jest.fn();
    const socket = { emit, on: jest.fn(), id: 'mock-socket-id' };
    await initMain({
      injectedSetCurrentRoom: setCurrentRoom,
      injectedSocket: socket,
      injectedWindow: window,
      injectedDocument: document,
    });
    expect(setCurrentRoom.mock.calls.some(call => call[0] === ' ROOM @#$')).toBe(true);
    expect(emit.mock.calls.some(call => call[1]?.roomId === ' ROOM @#$' && call[1]?.playerName === 'Guest')).toBe(true);
  });

  it('should use first room param if multiple present', async () => {
    jest.resetModules();
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=FIRST&room=SECOND');
    const { initMain } = await import('../public/scripts/main.ts');
    const setCurrentRoom = jest.fn();
    const emit = jest.fn();
    const socket = { emit, on: jest.fn(), id: 'mock-socket-id' };
    await initMain({
      injectedSetCurrentRoom: setCurrentRoom,
      injectedSocket: socket,
      injectedWindow: window,
      injectedDocument: document,
    });
    expect(setCurrentRoom.mock.calls.some(call => call[0] === 'FIRST')).toBe(true);
    expect(emit.mock.calls.some(call => call[1]?.roomId === 'FIRST' && call[1]?.playerName === 'Guest')).toBe(true);
  });

  it('should not throw if DOM is missing elements', async () => {
    jest.resetModules();
    jest.doMock('../public/scripts/state.js', () => getStateMock(), { virtual: true });
    // Best Practice: Mock InSessionLobbyModal to avoid constructor errors when DOM is missing
    jest.doMock(
      '../public/scripts/components/InSessionLobbyModal.js',
      () => ({ InSessionLobbyModal: jest.fn() }),
      { virtual: true }
    );
    document.body.innerHTML = '';
    window.history.replaceState({}, document.title, '/?room=ROOMSAFE');
    await expect(
      jest.isolateModulesAsync(async () => {
        require('../public/scripts/main.js');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        await Promise.resolve();
      })
    ).resolves.not.toThrow();
  });

  it('should not throw if socketReady rejects', async () => {
    jest.resetModules();
    jest.doMock(
      '../public/scripts/state.js',
      () => getStateMock({ socketReady: Promise.reject(new Error('fail')) }),
      { virtual: true }
    );
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=ROOMFAIL');
    await expect(
      jest.isolateModulesAsync(async () => {
        require('../public/scripts/main.js');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        await Promise.resolve();
      })
    ).resolves.not.toThrow();
  });

  it('should handle missing DOM gracefully', async () => {
    // Best Practice: For tests that intentionally omit DOM setup, mock InSessionLobbyModal to avoid constructor errors.
    jest.resetModules();
    jest.doMock(
      '../public/scripts/components/InSessionLobbyModal.js',
      () => ({ InSessionLobbyModal: jest.fn() }),
      { virtual: true }
    );
    window.history.replaceState({}, document.title, '/?room=ROOM123');
    await expect(
      jest.isolateModulesAsync(async () => {
        require('../public/scripts/main.js');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        await Promise.resolve();
      })
    ).resolves.not.toThrow();
  });
});
