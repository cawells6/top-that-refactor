/** @jest-environment jsdom */

/**
 * Best Practice: For tests that expect the DOM, always call setupMainDOM() before requiring main.js.
 * For tests that intentionally test missing DOM, mock InSessionLobbyModal to avoid constructor errors.
 */

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
    // Best Practice: Always call setupMainDOM() before requiring main.js for DOM-dependent tests.
    jest.resetModules();
    jest.doMock('../public/scripts/state.js', () => getStateMock(), { virtual: true });
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=ROOM123');
    await jest.isolateModulesAsync(async () => {
      require('../public/scripts/main.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await Promise.resolve();
    });
    const stateModule = jest.requireMock('../public/scripts/state.js');
    expect(stateModule.setCurrentRoom).toHaveBeenCalledWith('ROOM123');
    expect(stateModule.socket.emit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ roomId: 'ROOM123', playerName: 'Guest' })
    );
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
    jest.doMock('../public/scripts/state.js', () => getStateMock(), { virtual: true });
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=%20ROOM%20%40%23%24');
    await jest.isolateModulesAsync(async () => {
      require('../public/scripts/main.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await Promise.resolve();
    });
    const stateModule = jest.requireMock('../public/scripts/state.js');
    expect(stateModule.setCurrentRoom).toHaveBeenCalledWith(' ROOM @#$');
    expect(stateModule.socket.emit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ roomId: ' ROOM @#$', playerName: 'Guest' })
    );
  });

  it('should use first room param if multiple present', async () => {
    jest.resetModules();
    jest.doMock('../public/scripts/state.js', () => getStateMock(), { virtual: true });
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=FIRST&room=SECOND');
    await jest.isolateModulesAsync(async () => {
      require('../public/scripts/main.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await Promise.resolve();
    });
    const stateModule = jest.requireMock('../public/scripts/state.js');
    expect(stateModule.setCurrentRoom).toHaveBeenCalledWith('FIRST');
    expect(stateModule.socket.emit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ roomId: 'FIRST', playerName: 'Guest' })
    );
  });

  it('should not throw if DOM is missing elements', async () => {
    jest.resetModules();
    jest.doMock('../public/scripts/state.js', () => getStateMock(), { virtual: true });
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
