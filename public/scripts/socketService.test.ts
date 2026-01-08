/**
 * @jest-environment jsdom
 */
/* eslint-disable import/order */ // TODO: Re-evaluate import order for this file

// Mocks for state, render, and uiManager modules must be defined before
// importing the module under test so that Jest applies them correctly.

// Mocks for state, render, and uiManager modules
jest.mock('./state.js', () => {
  const stateMock = {
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
    getLastGameState: jest.fn(),
    socketReady: Promise.resolve(),
  } as any;

  stateMock.setLastGameState.mockImplementation((value: unknown) => {
    stateMock.lastGameState = value;
  });

  stateMock.setMyId.mockImplementation((value: unknown) => {
    stateMock.myId = value;
  });

  stateMock.setCurrentRoom.mockImplementation((value: unknown) => {
    stateMock.currentRoom = value;
  });

  stateMock.getLastGameState.mockImplementation(() => stateMock.lastGameState);

  return stateMock;
});

jest.mock('./render.js', () => ({
  renderGameState: jest.fn(),
  showCardEvent: jest.fn(),
  renderPlayedCards: jest.fn(),
  resetHandTracking: jest.fn(),
  animateCardFromPlayer: jest.fn(),
  waitForFlyingCard: jest.fn(() => Promise.resolve()),
  blankDrawPileFor: jest.fn(),
  animateVictory: jest.fn(),
  animateDeckToPlayPile: jest.fn(),
  logCardPlayed: jest.fn(),
  logPileTaken: jest.fn(),
  logPlayToDraw: jest.fn(),
  logSpecialEffect: jest.fn(),
  logTurnChange: jest.fn(),
  logGameStart: jest.fn(),
  logGameOver: jest.fn(),
}));

jest.mock('./uiManager.js', () => ({
  showLobbyForm: jest.fn(),
  showWaitingState: jest.fn(),
  showGameTable: jest.fn(),
  showError: jest.fn(),
}));

jest.mock('./uiHelpers.js', () => ({
  showToast: jest.fn(),
}));

import * as render from './render.js';
import * as state from './state.js';
import * as uiManager from './uiManager.js';
import { showToast } from './uiHelpers.js';

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
    (state as any).lastGameState = null;
    document.body.className = '';

    (state.setMyId as jest.Mock).mockImplementation((value: unknown) => {
      (state as any).myId = value;
    });

    (state.setCurrentRoom as jest.Mock).mockImplementation((value: unknown) => {
      (state as any).currentRoom = value;
    });

    (state.setLastGameState as jest.Mock).mockImplementation((value: unknown) => {
      (state as any).lastGameState = value;
    });

    (state.getLastGameState as jest.Mock).mockImplementation(() => (state as any).lastGameState);
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

  it('recovers from ERROR event during gameplay', async () => {
    await initializeSocketHandlers();
    document.body.classList.add('showing-game');
    state.setMyId('PLAYER_1');
    expect((state as any).myId).toBe('PLAYER_1');
    const lastState = { pile: [], currentPlayer: 'PLAYER_1' } as any;
    (state as any).lastGameState = lastState;
    (state.getLastGameState as jest.Mock).mockReturnValue(lastState);
    const errHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === ERROR
    )[1];
    errHandler('fail!');
    expect(render.showCardEvent).toHaveBeenCalledWith(null, 'invalid');
    expect(state.getLastGameState).toHaveBeenCalled();
    const lastCallResult = (state.getLastGameState as jest.Mock).mock.results.at(-1)?.value;
    expect(lastCallResult).toBe(lastState);
    expect(showToast).not.toHaveBeenCalled();
    expect(uiManager.showLobbyForm).not.toHaveBeenCalled();
  });

  it('resets session on session-error event', async () => {
    await initializeSocketHandlers();
    const sessionErrHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === SESSION_ERROR
    )[1];
    sessionErrHandler('bad session');
    expect(uiManager.showLobbyForm).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('bad session', 'error');
    expect(state.setCurrentRoom).toHaveBeenCalledWith(null);
    expect(state.setMyId).toHaveBeenCalledWith(null);
    expect(state.saveSession).toHaveBeenCalled();
  });
});
