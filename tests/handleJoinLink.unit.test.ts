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

  it('should handle join link in URL and emit JOIN_GAME', () => {
    setupMainDOM();
    window.history.replaceState({}, document.title, '/?room=ROOM123');
    const setCurrentRoom = jest.fn();
    const socket = { emit: jest.fn() };
    handleJoinLink({ setCurrentRoom, socket, window, document });
    expect(setCurrentRoom).toHaveBeenCalledWith('ROOM123');
    expect(socket.emit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ roomId: 'ROOM123', playerName: 'Guest' })
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
});
