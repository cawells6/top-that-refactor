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
        { id: 'my-socket-id', name: 'Me', status: 'ready' }, // status changed to 'ready'
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

  it('should render player names correctly, showing host badge and no (You)', () => {
    // Host badge present
    const hostNode = Array.from(document.querySelectorAll('.players-container *')).find(
      el => el.textContent && el.textContent.includes('Host Player')
    );
    expect(hostNode).toBeTruthy();
    // Host badge
    const badge = hostNode?.querySelector('.host-badge');
    expect(badge).toBeTruthy();
    // No player name contains (You)
    const playersContainer = document.querySelector('.players-container');
    expect(playersContainer?.textContent).not.toMatch(/\(You\)/);
  });

  it('shows the ready button for non-ready players', () => {
    // Set current player to 'joined' so the button is visible
    mockLobbyState.players[1].status = 'joined';
    (modalInstance as any).render(mockLobbyState);
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
    // Set current player to 'joined' so the button and input are visible
    mockLobbyState.players[1].status = 'joined';
    (modalInstance as any).render(mockLobbyState);
    const nameInput = screen.getByRole('textbox') as HTMLInputElement;
    nameInput.value = 'Tester';

    const readyButton = screen.getByRole('button', { name: /Let's Play/i });
    fireEvent.click(readyButton);

    expect(state.socket.emit).toHaveBeenCalledWith(PLAYER_READY, 'Tester');
  });

  it('should copy the game link to the clipboard when "Copy Link" is clicked', () => {
    // The button label is "Copy Invite Link" in the DOM, not "Copy Link"
    const copyButton = screen.getByRole('button', { name: /Copy Invite Link/i });
    fireEvent.click(copyButton);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('?room=TEST12')
    );
  });
});
