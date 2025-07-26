/** @jest-environment jsdom */
import { handleJoinLink } from '../public/scripts/handleJoinLink.ts';

describe('handleJoinLink', () => {
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

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
    document.body.className = '';
    window.history.replaceState({}, document.title, '/');
  });

  it('should handle join link in URL and emit JOIN_GAME', async () => {
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=ROOM123');
    const setCurrentRoom = jest.fn();
    const socket = {
      connected: true, // Make socket appear connected
      emit: jest.fn((event, data, callback) => {
        // Simulate successful acknowledgment
        if (typeof callback === 'function') {
          setTimeout(() => callback({ success: true }), 0);
        }
      }),
    };

    handleJoinLink({ setCurrentRoom, socket, window, document });
    expect(setCurrentRoom).toHaveBeenCalledWith('ROOM123');

    // Wait for async emitJoinGame to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(socket.emit).toHaveBeenCalledWith(
      'join-game',
      expect.objectContaining({ roomId: 'ROOM123', playerName: 'Guest' }),
      expect.any(Function)
    );
    expect(window.location.search).toBe('');
  });

  it('should not run join link logic if already in-session', () => {
    setupMainDOM();
    document.body.classList.add('in-session');
    window.history.replaceState({}, document.title, '/?room=ROOM456');
    const setCurrentRoom = jest.fn();
    const socket = { emit: jest.fn() };
    handleJoinLink({ setCurrentRoom, socket, window, document });
    expect(setCurrentRoom).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('should do nothing if no room param in URL', () => {
    setupMainDOM();
    window.history.replaceState({}, document.title, '/');
    const setCurrentRoom = jest.fn();
    const socket = { emit: jest.fn() };
    handleJoinLink({ setCurrentRoom, socket, window, document });
    expect(setCurrentRoom).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('should do nothing if room param is empty', () => {
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=');
    const setCurrentRoom = jest.fn();
    const socket = { emit: jest.fn() };
    handleJoinLink({ setCurrentRoom, socket, window, document });
    expect(setCurrentRoom).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('should handle room param with whitespace and trim', async () => {
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=%20ROOM789%20');
    const setCurrentRoom = jest.fn();
    const socket = {
      connected: true, // Make socket appear connected
      emit: jest.fn((event, data, callback) => {
        if (typeof callback === 'function') {
          setTimeout(() => callback({ success: true }), 0);
        }
      }),
    };
    handleJoinLink({ setCurrentRoom, socket, window, document });
    // Should not trim, should use as-is
    expect(setCurrentRoom).toHaveBeenCalledWith(' ROOM789 ');

    // Wait for async emitJoinGame to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(socket.emit).toHaveBeenCalledWith(
      'join-game',
      expect.objectContaining({ roomId: ' ROOM789 ', playerName: 'Guest' }),
      expect.any(Function)
    );
  });

  it('should handle room param with special characters', async () => {
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=R%40%23%24%25');
    const setCurrentRoom = jest.fn();
    const socket = {
      connected: true, // Make socket appear connected
      emit: jest.fn((event, data, callback) => {
        if (typeof callback === 'function') {
          setTimeout(() => callback({ success: true }), 0);
        }
      }),
    };
    handleJoinLink({ setCurrentRoom, socket, window, document });
    expect(setCurrentRoom).toHaveBeenCalledWith('R@#$%');

    // Wait for async emitJoinGame to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(socket.emit).toHaveBeenCalledWith(
      'join-game',
      expect.objectContaining({ roomId: 'R@#$%', playerName: 'Guest' }),
      expect.any(Function)
    );
  });

  it('should handle multiple room params (first wins)', async () => {
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=FIRST&room=SECOND');
    const setCurrentRoom = jest.fn();
    const socket = {
      connected: true, // Make socket appear connected
      emit: jest.fn((event, data, callback) => {
        if (typeof callback === 'function') {
          setTimeout(() => callback({ success: true }), 0);
        }
      }),
    };
    handleJoinLink({ setCurrentRoom, socket, window, document });
    expect(setCurrentRoom).toHaveBeenCalledWith('FIRST');

    // Wait for async emitJoinGame to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(socket.emit).toHaveBeenCalledWith(
      'join-game',
      expect.objectContaining({ roomId: 'FIRST', playerName: 'Guest' }),
      expect.any(Function)
    );
  });

  it('should call window.history.replaceState with correct args', () => {
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=ROOMX');
    const setCurrentRoom = jest.fn();
    const socket = { emit: jest.fn() };
    const spy = jest.spyOn(window.history, 'replaceState');
    handleJoinLink({ setCurrentRoom, socket, window, document });
    expect(spy).toHaveBeenCalledWith(
      {},
      document.title,
      window.location.pathname
    );
    spy.mockRestore();
  });

  it('should not throw if setCurrentRoom or socket.emit throws', () => {
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=ROOMERR');
    const setCurrentRoom = jest.fn(() => {
      throw new Error('fail');
    });
    const socket = {
      emit: jest.fn(() => {
        throw new Error('fail');
      }),
    };
    expect(() =>
      handleJoinLink({ setCurrentRoom, socket, window, document })
    ).not.toThrow();
  });

  it('should do nothing if document.body is missing', () => {
    const origBody = document.body;
    // @ts-ignore
    delete document.body;
    window.history.replaceState({}, document.title, '/?room=ROOMZ');
    const setCurrentRoom = jest.fn();
    const socket = { emit: jest.fn() };
    expect(() =>
      handleJoinLink({ setCurrentRoom, socket, window, document })
    ).not.toThrow();
    // @ts-ignore
    document.body = origBody;
  });
});
