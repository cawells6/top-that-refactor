/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/dom';

import { InSessionLobbyModal } from '../public/scripts/components/InSessionLobbyModal';
import * as state from '../public/scripts/state';
import { PLAYER_READY } from '../src/shared/events';
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

  let mockLobbyState: InSessionLobbyState;

  beforeEach(() => {
    mockLobbyState = {
      roomId: 'TEST12',
      hostId: 'host-id',
      players: [
        { id: 'host-id', name: 'Host Player', status: 'host' },
        { id: 'my-socket-id', name: 'Me', status: 'joined' },
      ],
    };
    document.body.innerHTML = `
      <div id="modal-overlay" class="modal__overlay modal__overlay--hidden"></div>
      <div class="modal modal--hidden in-session-lobby-modal" id="in-session-lobby-modal" tabindex="-1">
        <div class="in-session-lobby-container">
          <h3 id="in-session-lobby-title" class="section-title">Waiting for Players...</h3>
          <div class="name-input-section" id="guest-name-section">
            <input id="guest-player-name-input" type="text" />
          </div>
          <div id="players-container" class="players-container"></div>
          <div class="lobby-buttons-row">
            <button id="copy-link-button" class="header-btn" type="button">Copy Link</button>
            <button id="ready-up-button" class="header-btn" type="button">Let's Play</button>
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

  it('shows the ready button for non-ready players', () => {
    const readyButton = screen.getByRole('button', { name: /Let's Play/i });
    expect(readyButton).toBeInTheDocument();
    expect(readyButton).toBeEnabled();
  });

  it('hides the ready button when the local player is host', () => {
    mockLobbyState.hostId = 'my-socket-id';
    mockLobbyState.players[1].status = 'host';
    (modalInstance as any).render(mockLobbyState);

    const readyButton = document.getElementById('ready-up-button') as HTMLButtonElement;
    expect(readyButton).toHaveStyle('display: none');
  });

  it('emits PLAYER_READY with name when the button is clicked', () => {
    const nameInput = screen.getByRole('textbox') as HTMLInputElement;
    nameInput.value = 'Tester';

    const readyButton = screen.getByRole('button', { name: /Let's Play/i });
    fireEvent.click(readyButton);

    expect(state.socket.emit).toHaveBeenCalledWith(PLAYER_READY, 'Tester');
  });

  it('should copy the game link to the clipboard when "Copy Link" is clicked', () => {
    const copyButton = screen.getByRole('button', { name: /Copy Link/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('?room=TEST12')
    );
  });
});
