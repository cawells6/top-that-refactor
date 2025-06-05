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
  setMyId: jest.fn(),
  setCurrentRoom: jest.fn(),
  saveSession: jest.fn(),
  socketReady: Promise.resolve(),
}));

jest.mock('./render.js', () => ({
  renderGameState: jest.fn(),
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

// Import the module under test after mocks are set up
import { initializeSocketHandlers } from './socketService.js';

const JOINED = 'joined';
const PLAYER_JOINED = 'player-joined';
const LOBBY = 'lobby';
const STATE_UPDATE = 'state-update';
// const REJOIN = 'rejoin';

describe('socketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure state.myId and state.currentRoom are null before each test
    (state as any).myId = null;
    (state as any).currentRoom = null;
  });

  it('registers socket event handlers and calls UI functions', async () => {
    await initializeSocketHandlers();
    expect(state.socket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(state.socket.on).toHaveBeenCalledWith(JOINED, expect.any(Function));
    expect(state.socket.on).toHaveBeenCalledWith(PLAYER_JOINED, expect.any(Function));
    expect(state.socket.on).toHaveBeenCalledWith(LOBBY, expect.any(Function));
    expect(state.socket.on).toHaveBeenCalledWith(STATE_UPDATE, expect.any(Function));
    expect(state.socket.on).toHaveBeenCalledWith('err', expect.any(Function));
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

  it('calls showWaitingState on LOBBY event', async () => {
    await initializeSocketHandlers();
    const lobbyHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === LOBBY
    )[1];
    const data = { roomId: 'R', players: [{ id: '1' }], maxPlayers: 4 };
    lobbyHandler(data);
    expect(uiManager.showWaitingState).toHaveBeenCalledWith('R', 1, 4, data.players);
  });

  it('calls renderGameState and showGameTable on STATE_UPDATE', async () => {
    await initializeSocketHandlers();
    const stateUpdateHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === STATE_UPDATE
    )[1];
    const s = { started: true };
    stateUpdateHandler(s);
    expect(render.renderGameState).toHaveBeenCalledWith(s, null);
    expect(uiManager.showGameTable).toHaveBeenCalled();
  });

  it('calls showError on err event', async () => {
    await initializeSocketHandlers();
    const errHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'err'
    )[1];
    errHandler('fail!');
    expect(uiManager.showError).toHaveBeenCalledWith('fail!');
  });
});
