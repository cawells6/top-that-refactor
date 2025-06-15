// tests/lobbyForm.test.ts
/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { fireEvent } from '@testing-library/dom';

import { initializePageEventListeners } from '../public/scripts/events.js'; // Stays .js for now
import * as render from '../public/scripts/render.js';
import * as state from '../public/scripts/state.js'; // Stays .js for now
// Import the client-side script under test (AFTER mocks are set up)
// This file (public/scripts/events.js) has NOT been converted to TS yet.

const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockListeners = jest.fn(() => []); // Add listeners mock

// Mock the state module
// To avoid "Invalid variable access: document" in mock factory,
// we ensure `document` is accessed only when the mocked functions are called.
jest.mock('../public/scripts/state.js', () => {
  // This factory function runs *before* jsdom is fully set up for the test body.
  // So, `document` might not be available here directly.
  // We return functions that, when *called during the test*, will access the now-available `document`.
  return {
    socket: { emit: jest.fn(), on: jest.fn(), listeners: jest.fn(() => []) }, // Add listeners method
    loadSession: jest.fn(),
    saveSession: jest.fn(),
    $: jest.fn((selector: string) =>
      global.document ? global.document.querySelector(selector) : null
    ),
    getCopyLinkBtn: jest.fn(() =>
      global.document ? global.document.createElement('button') : null
    ),
    getRulesButton: jest.fn(() =>
      global.document ? global.document.createElement('button') : null
    ),
    getRulesModal: jest.fn(() => (global.document ? global.document.createElement('div') : null)),
    getBackToLobbyButton: jest.fn(() =>
      global.document ? global.document.createElement('button') : null
    ),
    setCurrentRoom: jest.fn(),
    setMyId: jest.fn(),
    setDesiredCpuCount: jest.fn(),
    getDesiredCpuCount: jest.fn(() => 0),
  };
});

jest.mock('../public/scripts/render.js', () => ({
  playArea: jest.fn(),
  lobbyLink: jest.fn(),
  renderGameState: jest.fn(),
}));

// Mock the shared events module
jest.mock('../src/shared/events', () => ({
  // Path to events.ts (without extension)
  __esModule: true, // Use if events.ts is an ES module
  JOIN_GAME: 'join-game',
  START_GAME: 'start-game',
  // Add other events if public/scripts/events.js (script under test) uses them from shared/events
}));

// Add this import to bring JOIN_GAME into scope for the test
import { JOIN_GAME } from '../src/shared/events.js';

// --- Helpers for DRY test setup and error clearing ---
function setupLobbyFormDOM() {
  document.body.innerHTML = `
    <form id="lobby-form">
      <input type="text" id="player-name-input" />
      <input type="text" id="join-code-input" />
      <div>
        <button id="humans-minus" type="button">-</button>
        <input type="number" id="total-players-input" value="1" />
        <button id="humans-plus" type="button">+</button>
      </div>
      <div>
        <button id="cpus-minus" type="button">-</button>
        <input type="number" id="cpu-players-input" value="0" />
        <button id="cpus-plus" type="button">+</button>
      </div>
      <span id="total-count"></span>
      <div id="lobby-validation-message"><div class="message-box-content"><p></p></div></div>
      <div class="lobby-buttons-row">
        <button id="setup-rules-button" type="button">RULES</button>
        <button id="setup-deal-button" type="button">LET'S PLAY</button>
        <button id="join-game-button" type="button">Join Game</button>
      </div>
    </form>
  `;
}

function getErrorBox() {
  return document.querySelector('.message-box-content') as HTMLElement;
}
function getErrorText() {
  return document.querySelector('#lobby-validation-message p') as HTMLElement;
}
function clearErrorBox() {
  const box = getErrorBox();
  if (box) box.classList.remove('active');
  const p = getErrorText();
  if (p) p.textContent = '';
}

describe('Lobby Form Submission', () => {
  let nameInput: HTMLInputElement;
  let numHumansInput: HTMLInputElement;
  let numCPUsInput: HTMLInputElement;
  let submitButton: HTMLButtonElement;
  let joinButton: HTMLButtonElement;
  let nameInputError: HTMLElement;
  let playerCountError: HTMLElement;

  beforeEach(async () => {
    jest.useFakeTimers();
    setupLobbyFormDOM();
    nameInput = document.getElementById('player-name-input') as HTMLInputElement;
    numHumansInput = document.getElementById('total-players-input') as HTMLInputElement;
    numCPUsInput = document.getElementById('cpu-players-input') as HTMLInputElement;
    submitButton = document.getElementById('setup-deal-button') as HTMLButtonElement;
    joinButton = document.getElementById('join-game-button') as HTMLButtonElement;
    nameInputError = getErrorText();
    playerCountError = getErrorText();
    if (state.socket) {
      (state.socket.emit as jest.Mock) = mockEmit;
      (state.socket.on as jest.Mock) = mockOn;
      (state.socket.listeners as jest.Mock) = mockListeners;
    }
    mockEmit.mockClear();
    mockOn.mockClear();
    clearErrorBox();
    await initializePageEventListeners();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Validation', () => {
    it('shows error if name is empty', () => {
      nameInput.value = '';
      fireEvent.click(submitButton);
      const msgBox = getErrorBox();
      expect(msgBox).toHaveClass('active');
      expect(nameInputError.textContent).toMatch(/valid name/i);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('shows error if name is too short (min length 2)', () => {
      nameInput.value = 'A';
      fireEvent.click(submitButton);
      const msgBox = getErrorBox();
      expect(msgBox).toHaveClass('active');
      expect(nameInputError.textContent).toMatch(/at least 2/);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('shows error if total players (humans + CPUs) < 2', () => {
      nameInput.value = 'Chris';
      numHumansInput.value = '1';
      numCPUsInput.value = '0';
      fireEvent.click(submitButton);
      const msgBox = getErrorBox();
      expect(msgBox).toHaveClass('active');
      expect(playerCountError.textContent).toMatch(/minimum of 2/i);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('shows error if total players (humans + CPUs) > 4', () => {
      nameInput.value = 'Chris';
      numHumansInput.value = '3';
      numCPUsInput.value = '2';
      fireEvent.click(submitButton);
      const msgBox = getErrorBox();
      expect(msgBox).toHaveClass('active');
      expect(playerCountError.textContent).toMatch(/maximum of 4/i);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('shows error if player name is only whitespace', () => {
      nameInput.value = '   ';
      fireEvent.click(submitButton);
      const msgBox = getErrorBox();
      expect(msgBox).toHaveClass('active');
      expect(msgBox.textContent).toMatch(/valid name/i);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('shows error when join code is invalid', () => {
      nameInput.value = 'Sam';
      const codeInput = document.getElementById('join-code-input') as HTMLInputElement;
      codeInput.value = '123';
      fireEvent.click(joinButton);
      const msgBox = getErrorBox();
      expect(msgBox).toHaveClass('active');
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('shows error if join code is missing when joining', () => {
      nameInput.value = 'Sam';
      const codeInput = document.getElementById('join-code-input') as HTMLInputElement;
      codeInput.value = '';
      fireEvent.click(joinButton);
      const msgBox = getErrorBox();
      expect(msgBox).toHaveClass('active');
      expect(msgBox.textContent).toMatch(/valid 6 character code/i);
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('Form actions', () => {
    it('starts a CPU game locally when only bots are selected', () => {
      nameInput.value = 'ChrisP';
      numHumansInput.value = '1';
      numCPUsInput.value = '1';
      fireEvent.click(submitButton);
      const msgBox = getErrorBox();
      expect(msgBox.classList.contains('active')).toBe(false);
      expect(mockEmit).toHaveBeenCalledWith(
        JOIN_GAME,
        {
          playerName: 'ChrisP',
          numHumans: 1,
          numCPUs: 1,
        },
        expect.any(Function)
      );
    });

    it('generates a lobby link when another human is expected', () => {
      nameInput.value = 'ChrisP';
      numHumansInput.value = '2';
      numCPUsInput.value = '0';
      fireEvent.click(submitButton);
      expect(mockEmit).toHaveBeenCalledWith(
        JOIN_GAME,
        {
          playerName: 'ChrisP',
          numHumans: 2,
          numCPUs: 0,
        },
        expect.any(Function)
      );
    });

    it('emits JOIN_GAME with room code when join button clicked', () => {
      nameInput.value = 'Sam';
      const codeInput = document.getElementById('join-code-input') as HTMLInputElement;
      codeInput.value = 'ABC123';
      fireEvent.click(joinButton);
      expect(mockEmit).toHaveBeenCalledWith(
        JOIN_GAME,
        {
          roomId: 'ABC123',
          playerName: 'Sam',
          numHumans: 1,
          numCPUs: 0,
        },
        expect.any(Function)
      );
      expect(joinButton.disabled).toBe(true);
    });

    it('disables join button after click and re-enables after error', () => {
      nameInput.value = 'Sam';
      const codeInput = document.getElementById('join-code-input') as HTMLInputElement;
      codeInput.value = 'ABC123';
      fireEvent.click(joinButton);
      expect(joinButton.disabled).toBe(true);
      // Simulate error callback
      const emitCall = mockEmit.mock.calls.find((call) => call[0] === JOIN_GAME);
      if (emitCall) {
        const callback = emitCall[2];
        if (typeof callback === 'function') {
          callback({ error: 'Room full' });
        }
      }
      expect(joinButton.disabled).toBe(false);
    });

    it('calls state.saveSession and setCurrentRoom when joining', () => {
      const saveSessionSpy = jest.spyOn(state, 'saveSession');
      const setCurrentRoomSpy = jest.spyOn(state, 'setCurrentRoom');
      nameInput.value = 'Sam';
      const codeInput = document.getElementById('join-code-input') as HTMLInputElement;
      codeInput.value = 'ABC123';
      fireEvent.click(joinButton);
      expect(saveSessionSpy).toHaveBeenCalled();
      expect(setCurrentRoomSpy).toHaveBeenCalledWith('ABC123');
    });

    it('does not emit JOIN_GAME twice if join button is clicked rapidly', () => {
      nameInput.value = 'Sam';
      const codeInput = document.getElementById('join-code-input') as HTMLInputElement;
      codeInput.value = 'ABC123';
      fireEvent.click(joinButton);
      fireEvent.click(joinButton);
      const joinGameCalls = mockEmit.mock.calls.filter((call) => call[0] === JOIN_GAME);
      expect(joinGameCalls.length).toBe(1);
    });

    it('clears error message after successful join', () => {
      nameInput.value = 'Sam';
      const codeInput = document.getElementById('join-code-input') as HTMLInputElement;
      codeInput.value = 'ABC123';
      fireEvent.click(joinButton);
      // Simulate success callback
      const emitCall = mockEmit.mock.calls.find((call) => call[0] === JOIN_GAME);
      if (emitCall) {
        const callback = emitCall[2];
        if (typeof callback === 'function') {
          callback({ success: true });
        }
      }
      const msgBox = getErrorBox();
      expect(msgBox.classList.contains('active')).toBe(false);
      expect(getErrorText().textContent).toBe('');
    });

    it('resets form after successful join', () => {
      nameInput.value = 'Sam';
      const codeInput = document.getElementById('join-code-input') as HTMLInputElement;
      codeInput.value = 'ABC123';
      fireEvent.click(joinButton);
      // Simulate success callback
      const emitCall = mockEmit.mock.calls.find((call) => call[0] === JOIN_GAME);
      if (emitCall) {
        const callback = emitCall[2];
        if (typeof callback === 'function') {
          callback({ success: true });
        }
      }
      expect(nameInput.value).toBe('');
      expect(codeInput.value).toBe('');
    });
  });
});
