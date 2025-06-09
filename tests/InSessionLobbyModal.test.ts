/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/dom';

import { InSessionLobbyModal } from '../public/scripts/components/InSessionLobbyModal';
import * as state from '../public/scripts/state';
import { START_GAME } from '../src/shared/events';
import { InSessionLobbyState } from '../src/shared/types';

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

describe('InSessionLobbyModal', () => {
  let modalInstance: InSessionLobbyModal;

  const mockLobbyState: InSessionLobbyState = {
    roomId: 'TEST12',
    hostId: 'host-id',
    players: [
      { id: 'host-id', name: 'Host Player', status: 'host' },
      { id: 'my-socket-id', name: 'Me', status: 'joined' },
    ],
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="modal-overlay" class="modal__overlay modal__overlay--hidden"></div>
      <div class="modal modal--hidden in-session-lobby-modal" id="in-session-lobby-modal" tabindex="-1">
        <div class="in-session-lobby-container">
          <div class="players-section">
            <h3 class="players-section-title">Players</h3>
            <div id="players-container" class="players-container"></div>
          </div>
          <div class="lobby-actions-row">
            <input id="lobby-room-code" class="game-id-input" type="text" readonly />
            <button id="copy-link-btn" class="btn copy-link-btn">Copy Link</button>
            <button id="start-game-btn" class="btn lets-play-btn" disabled>Let's Play</button>
          </div>
        </div>
      </div>
    `;

    (state.socket.emit as jest.Mock).mockClear();
    (navigator.clipboard.writeText as jest.Mock).mockClear();

    modalInstance = new InSessionLobbyModal();
    (modalInstance as any).render(mockLobbyState);
  });

  it('should render player names correctly, identifying "You"', () => {
    expect(screen.getByText('Host Player')).toBeInTheDocument();
    expect(screen.getByText('Me (You)')).toBeInTheDocument();
  });

  it('should display the correct room code', () => {
    const roomCodeInput = screen.getByRole('textbox') as HTMLInputElement;
    expect(roomCodeInput.value).toBe('TEST12');
  });

  it('should have the "Start Game" button disabled for non-host players', () => {
    const startButton = screen.getByRole('button', { name: /Let's Play/i });
    expect(startButton).toBeDisabled();
  });

  it('should enable the "Start Game" button for the host player', () => {
    mockLobbyState.hostId = 'my-socket-id';
    (modalInstance as any).render(mockLobbyState);

    const startButton = screen.getByRole('button', { name: /Let's Play/i });
    expect(startButton).toBeEnabled();
  });

  it('should emit START_GAME event when the enabled start button is clicked', () => {
    mockLobbyState.hostId = 'my-socket-id';
    (modalInstance as any).render(mockLobbyState);

    const startButton = screen.getByRole('button', { name: /Let's Play/i });
    fireEvent.click(startButton);

    expect(state.socket.emit).toHaveBeenCalledWith(START_GAME);
  });

  it('should copy the game link to the clipboard when "Copy Link" is clicked', () => {
    const copyButton = screen.getByRole('button', { name: /Copy Link/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('?room=TEST12')
    );
  });
});
