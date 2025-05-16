// tests/lobbyForm.test.js
/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { fireEvent } from '@testing-library/dom';

// Mock the socket and JOIN_GAME event
const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockSocket = { emit: mockEmit, on: mockOn };

// Mock state module
jest.mock('../public/scripts/state.js', () => ({
  socket: { emit: jest.fn(), on: jest.fn() },
  loadSession: jest.fn(),
  $: jest.fn(),
  getCopyLinkBtn: jest.fn(),
  getRulesButton: jest.fn(),
  getRulesModal: jest.fn(),
  getBackToLobbyButton: jest.fn()
}));

// Mock JOIN_GAME event name
jest.mock('../src/shared/events.js', () => ({
  JOIN_GAME: 'join-game',
  START_GAME: 'start-game'
}));

// Import the script under test (after mocks)
import '../public/scripts/events.js';
import { JOIN_GAME } from '../src/shared/events.js';
import * as state from '../public/scripts/state.js';

describe('Lobby Form Submission', () => {
  let lobbyForm, nameInput, numHumansInput, numCPUsInput, submitButton, nameInputError, playerCountError;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="lobby-form">
        <input type="text" id="name-input" />
        <div id="name-input-error" class="error-message hidden"></div>
        <input type="number" id="total-players-input" value="1" />
        <input type="number" id="cpu-players-input" value="0" />
        <button id="join-game-button" type="submit">Play Game</button>
        <div id="player-count-error" class="error-message hidden"></div>
      </form>
    `;
    lobbyForm = document.getElementById('lobby-form');
    nameInput = document.getElementById('name-input');
    numHumansInput = document.getElementById('total-players-input');
    numCPUsInput = document.getElementById('cpu-players-input');
    submitButton = document.getElementById('join-game-button');
    nameInputError = document.getElementById('name-input-error');
    playerCountError = document.getElementById('player-count-error');
    // Patch state.socket
    state.socket.emit = mockEmit;
    state.socket.on = mockOn;
    mockEmit.mockClear();
    mockOn.mockClear();
    // Ensure event listeners are attached
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  it('shows error if name is empty', () => {
    nameInput.value = '';
    fireEvent.submit(lobbyForm);
    expect(nameInputError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if name is too short', () => {
    nameInput.value = 'A';
    fireEvent.submit(lobbyForm);
    expect(nameInputError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if total players < 1', () => {
    nameInput.value = 'Chris';
    numHumansInput.value = '0';
    fireEvent.submit(lobbyForm);
    expect(playerCountError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if total players + cpus < 2', () => {
    nameInput.value = 'Chris';
    numHumansInput.value = '1';
    numCPUsInput.value = '0';
    fireEvent.submit(lobbyForm);
    expect(playerCountError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('shows error if total players + cpus > 4', () => {
    nameInput.value = 'Chris';
    numHumansInput.value = '3';
    numCPUsInput.value = '2';
    fireEvent.submit(lobbyForm);
    expect(playerCountError).not.toHaveClass('hidden');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('emits JOIN_GAME with correct data and disables button on valid input', () => {
    nameInput.value = 'Chris';
    numHumansInput.value = '2';
    numCPUsInput.value = '2';
    fireEvent.submit(lobbyForm);
    expect(playerCountError).toHaveClass('hidden');
    expect(mockEmit).toHaveBeenCalledWith(JOIN_GAME, {
      name: 'Chris',
      numHumans: 2,
      numCPUs: 2
    });
    expect(submitButton.disabled).toBe(true);
  });
});
