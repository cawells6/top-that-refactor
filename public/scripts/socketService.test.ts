/**
 * @jest-environment jsdom
 */
/* eslint-disable import/order */ // TODO: Re-evaluate import order for this file

// Mocks for state, render, and uiManager modules must be defined before
// importing the module under test so that Jest applies them correctly.

// Mocks for state, render, and uiManager modules
jest.mock('./state.js', () => ({
  socket: {
    on: jest.fn(),
    emit: jest.fn(),
  },
  myId: null, // Set to null initially so showLobbyForm gets called
  currentRoom: null, // Set to null initially
  lastGameState: null,
  setMyId: jest.fn(),
  setCurrentRoom: jest.fn(),
  saveSession: jest.fn(),
  setLastGameState: jest.fn(),
  socketReady: Promise.resolve(),
}));

jest.mock('./render.js', () => ({
  renderGameState: jest.fn(),
  showCardEvent: jest.fn(),
}));

jest.mock('./uiManager.js', () => ({
  showLobbyForm: jest.fn(),
  showWaitingState: jest.fn(),
  showGameTable: jest.fn(),
  showError: jest.fn(),
}));

import * as render from './render.js';
import * as state from './state.js';
import * as uiManager from './uiManager.js';

// Import events from the shared file
import {
  JOINED,
  GAME_STARTED,
  STATE_UPDATE,
  SPECIAL_CARD_EFFECT,
  PILE_PICKED_UP,
  ERROR,
  SESSION_ERROR,
  // REJOIN
} from '@shared/events.ts';

// Import the module under test after mocks are set up
import { initializeSocketHandlers } from './socketService.js';

describe('socketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure state.myId and state.currentRoom are null before each test
    (state as any).myId = null;
    (state as any).currentRoom = null;
  });

  it('registers socket event handlers and calls UI functions', async () => {
    await initializeSocketHandlers();
    expect(state.socket.on).toHaveBeenCalledWith(
      'connect',
      expect.any(Function)
    );
    expect(state.socket.on).toHaveBeenCalledWith(
      GAME_STARTED,
      expect.any(Function)
    );
    expect(state.socket.on).toHaveBeenCalledWith(JOINED, expect.any(Function));
    expect(state.socket.on).toHaveBeenCalledWith(
      STATE_UPDATE,
      expect.any(Function)
    );
    expect(state.socket.on).toHaveBeenCalledWith(
      SPECIAL_CARD_EFFECT,
      expect.any(Function)
    );
    expect(state.socket.on).toHaveBeenCalledWith(
      PILE_PICKED_UP,
      expect.any(Function)
    );
    expect(state.socket.on).toHaveBeenCalledWith(
      SESSION_ERROR,
      expect.any(Function)
    );
    expect(state.socket.on).toHaveBeenCalledWith(
      ERROR,
      expect.any(Function)
    );
  });

  it('calls showLobbyForm if not rejoining on connect', async () => {
    // Make sure state.myId and state.currentRoom are null
    (state as any).myId = null;
    (state as any).currentRoom = null;

    await initializeSocketHandlers();

    // Simulate connect event
    const connectHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'connect'
    )[1];

    // Call the handler function
    connectHandler();

    // Verify showLobbyForm was called
    expect(uiManager.showLobbyForm).toHaveBeenCalled();
  });

  it('calls renderGameState and showGameTable on STATE_UPDATE', async () => {
    await initializeSocketHandlers();
    const stateUpdateHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === STATE_UPDATE
    )[1];
    const s = { started: true };
    stateUpdateHandler(s);
    expect(state.setLastGameState).toHaveBeenCalledWith(s);
    expect(render.renderGameState).toHaveBeenCalledWith(s, null);
    expect(uiManager.showGameTable).toHaveBeenCalled();
  });

  it('shows the game table when GAME_STARTED fires', async () => {
    await initializeSocketHandlers();
    const handler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === GAME_STARTED
    )[1];
    handler();
    expect(uiManager.showGameTable).toHaveBeenCalled();
  });

  it('calls showError on err event', async () => {
    await initializeSocketHandlers();
    document.body.classList.add('showing-game');
    const errHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === ERROR
    )[1];
    errHandler('fail!');
    expect(uiManager.showError).toHaveBeenCalledWith('fail!');
    expect(render.showCardEvent).toHaveBeenCalledWith(null, 'invalid');
  });

  it('resets session on session-error event', async () => {
    await initializeSocketHandlers();
    const sessionErrHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === SESSION_ERROR
    )[1];
    sessionErrHandler('bad session');
    expect(uiManager.showLobbyForm).toHaveBeenCalled();
    expect(uiManager.showError).toHaveBeenCalledWith('bad session');
    expect(state.setCurrentRoom).toHaveBeenCalledWith(null);
    expect(state.setMyId).toHaveBeenCalledWith(null);
    expect(state.saveSession).toHaveBeenCalled();
  });
});
