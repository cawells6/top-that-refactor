/**
 * @jest-environment jsdom
 */
import { initializeSocketHandlers } from './socketService.js';

// Mocks for state, render, and uiManager modules
jest.mock('./state', () => ({ // Removed .js
  socket: {
    on: jest.fn(),
    emit: jest.fn(),
  },
  myId: 'mockId',
  currentRoom: 'mockRoom',
  setMyId: jest.fn(),
  setCurrentRoom: jest.fn(),
  saveSession: jest.fn(),
}));
jest.mock('./render', () => ({ // Removed .js
  renderGameState: jest.fn(),
}));
jest.mock('./uiManager', () => ({ // Removed .js
  showLobbyForm: jest.fn(),
  showWaitingState: jest.fn(),
  showGameTable: jest.fn(),
  showError: jest.fn(),
}));

import * as state from './state.js';
import * as render from './render.js';
import * as uiManager from './uiManager.js';

const JOINED = 'joined';
const PLAYER_JOINED = 'player-joined';
const LOBBY = 'lobby';
const STATE_UPDATE = 'state-update';
// const REJOIN = 'rejoin';

describe('socketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers socket event handlers and calls UI functions', () => {
    initializeSocketHandlers();
    expect(state.socket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(state.socket.on).toHaveBeenCalledWith(JOINED, expect.any(Function));
    expect(state.socket.on).toHaveBeenCalledWith(PLAYER_JOINED, expect.any(Function));
    expect(state.socket.on).toHaveBeenCalledWith(LOBBY, expect.any(Function));
    expect(state.socket.on).toHaveBeenCalledWith(STATE_UPDATE, expect.any(Function));
    expect(state.socket.on).toHaveBeenCalledWith('err', expect.any(Function));
  });

  it('calls showLobbyForm if not rejoining on connect', () => {
    (state.myId as any) = null;
    (state.currentRoom as any) = null;
    initializeSocketHandlers();
    // Simulate connect event
    const connectHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'connect'
    )[1];
    connectHandler();
    expect(uiManager.showLobbyForm).toHaveBeenCalled();
  });

  it('calls showWaitingState on LOBBY event', () => {
    initializeSocketHandlers();
    const lobbyHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === LOBBY
    )[1];
    const data = { roomId: 'R', players: [{ id: '1' }], maxPlayers: 4 };
    lobbyHandler(data);
    expect(uiManager.showWaitingState).toHaveBeenCalledWith('R', 1, 4, data.players);
  });

  it('calls renderGameState and showGameTable on STATE_UPDATE', () => {
    initializeSocketHandlers();
    const stateUpdateHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === STATE_UPDATE
    )[1];
    const s = { started: true };
    stateUpdateHandler(s);
    expect(render.renderGameState).toHaveBeenCalledWith(s);
    expect(uiManager.showGameTable).toHaveBeenCalled();
  });

  it('calls showError on err event', () => {
    initializeSocketHandlers();
    const errHandler = (state.socket.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'err'
    )[1];
    errHandler('fail!');
    expect(uiManager.showError).toHaveBeenCalledWith('fail!');
  });
});
