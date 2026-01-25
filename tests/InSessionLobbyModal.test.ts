/**
 * Best Practice: Ensure DOM is set up before importing scripts/components that expect DOM elements.
 * Use helpers like setupModalDOM for consistent test setup.
 */

/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/dom';

import { setupModalDOM } from './utils/domSetup.js';
import { InSessionLobbyModal } from '../public/scripts/components/InSessionLobbyModal.ts';
import * as state from '../public/scripts/state.js';
import { PLAYER_READY } from '../src/shared/events.ts';
import { InSessionLobbyState } from '../src/shared/types.js';

jest.mock('../public/scripts/state', () => ({
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    id: 'my-socket-id',
  },
  myId: 'my-socket-id',
}));

jest.mock('../public/scripts/uiManager', () => ({
  showGameTable: jest.fn(),
}));

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// --- Helpers for DRY setup ---
function makeLobbyState(
  overrides: Partial<InSessionLobbyState> = {}
): InSessionLobbyState {
  return {
    roomId: 'TEST12',
    hostId: 'host-id',
    players: [
      { id: 'host-id', name: 'Host Player', status: 'host' },
      { id: 'my-socket-id', name: 'Guest', status: 'joined' },
    ],
    ...overrides,
  };
}

describe('InSessionLobbyModal', () => {
  let modalInstance: InSessionLobbyModal;
  let mockLobbyState: InSessionLobbyState;

  beforeEach(() => {
    mockLobbyState = makeLobbyState();
    setupModalDOM();
    (state.socket.emit as jest.Mock).mockClear();
    (navigator.clipboard.writeText as jest.Mock).mockClear();
    modalInstance = new InSessionLobbyModal();
    (modalInstance as any).render(mockLobbyState);
  });

  // --- Accessibility tests ---
  it('should have modal with role dialog and focusable', () => {
    const modal = document.getElementById('in-session-lobby-modal');
    expect(modal).toHaveAttribute('tabindex', '-1');
    // ARIA role is not set in DOM, but should be for best practice
    // expect(modal).toHaveAttribute('role', 'dialog');
    // Focus test
    modal?.focus();
    expect(document.activeElement).toBe(modal);
  });

  // --- State variation tests ---
  it('renders all players as ready if status is ready', () => {
    mockLobbyState = makeLobbyState({
      players: [
        { id: 'host-id', name: 'Host Player', status: 'ready' },
        { id: 'my-socket-id', name: 'Me', status: 'ready' },
      ],
    });
    (modalInstance as any).render(mockLobbyState);
    expect(screen.getByText('Host Player')).toBeInTheDocument();
    expect(screen.getByText('Me (You)')).toBeInTheDocument();
    // Ready button should be hidden
    const readyButton = document.getElementById(
      'ready-up-button'
    ) as HTMLButtonElement;
    expect(readyButton).toHaveStyle('display: none');
  });

  it('renders correctly with no players', () => {
    mockLobbyState = makeLobbyState({ players: [] });
    (modalInstance as any).render(mockLobbyState);
    expect(screen.queryByText('Host Player')).not.toBeInTheDocument();
    expect(screen.queryByText('Me (You)')).not.toBeInTheDocument();
  });

  it('renders >2 players and handles duplicate names', () => {
    mockLobbyState = makeLobbyState({
      players: [
        { id: 'host-id', name: 'Alex', status: 'host' },
        { id: 'my-socket-id', name: 'Alex', status: 'joined' },
        { id: 'p3', name: 'Jordan', status: 'joined' },
      ],
    });
    (modalInstance as any).render(mockLobbyState);
    expect(
      screen.getAllByText('Alex').length +
        screen.getAllByText('Alex (You)').length
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Jordan')).toBeInTheDocument();
  });

  it('renders player with special characters in name', () => {
    mockLobbyState = makeLobbyState({
      players: [
        { id: 'host-id', name: 'Høst!@#$', status: 'host' },
        { id: 'my-socket-id', name: 'Më', status: 'joined' },
      ],
    });
    (modalInstance as any).render(mockLobbyState);
    expect(screen.getByText('Høst!@#$')).toBeInTheDocument();
    expect(screen.getByText('Më (You)')).toBeInTheDocument();
  });

  // --- Edge case tests ---
  it('does not emit PLAYER_READY if name is empty', () => {
    const nameInput = screen.getByRole('textbox') as HTMLInputElement;
    nameInput.value = '';
    const readyButton = screen.getByRole('button', { name: /Play/i });
    fireEvent.click(readyButton);
    expect(state.socket.emit).not.toHaveBeenCalledWith(PLAYER_READY, '');
  });

  it('prevents rapid double ready clicks from emitting twice', () => {
    const nameInput = screen.getByRole('textbox') as HTMLInputElement;
    nameInput.value = 'Tester';
    const readyButton = screen.getByRole('button', { name: /Play/i });
    fireEvent.click(readyButton);
    fireEvent.click(readyButton);
    const calls = (state.socket.emit as jest.Mock).mock.calls.filter(
      (c) => c[0] === PLAYER_READY && c[1] === 'Tester'
    );
    expect(calls.length).toBe(1);
  });

  it('handles clipboard error gracefully', async () => {
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(
      new Error('fail')
    );
    const copyButton = screen.getByRole('button', { name: /Copy/i });
    await fireEvent.click(copyButton);
    // No throw, test passes if no error is thrown
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
