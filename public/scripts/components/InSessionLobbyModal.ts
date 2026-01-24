import { currentRoom } from '../state.js';
import { showToast } from '../uiHelpers.js';

export class InSessionLobbyModal {
  private modal: HTMLElement | null = null;
  private inviteBtn: HTMLElement | null = null;
  private copyBtn: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Only init if we can find the modal in the DOM (it's in index.html now)
    this.modal = document.getElementById('in-session-lobby-modal');
    if (!this.modal) return;

    this.inviteBtn = document.getElementById('invite-friends-btn');
    this.copyBtn = document.getElementById('copy-room-code-btn');

    if (this.inviteBtn) {
      this.inviteBtn.addEventListener('click', () => this.handleInvite());
    }

    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', () => {
        const codeDisplay = document.getElementById('lobby-room-code-display');
        const code = codeDisplay?.textContent?.trim() || '';
        if (code) {
          navigator.clipboard.writeText(code).then(() => {
            showToast('Room code copied!', 'info');
          });
        }
      });
    }
  }

  private async handleInvite() {
    const roomId = currentRoom;
    if (!roomId) {
      showToast('No room code available to share.', 'error');
      return;
    }

    // Use origin + pathname to support subdirectories (e.g. example.com/mygame/)
    const url = window.location.origin + window.location.pathname + '?room=' + roomId;
    const shareData = {
      title: 'Join my TopThat game!',
      text: `Come play TopThat with me! Room Code: ${roomId}`,
      url: url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        console.log('Share successful');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
          this.fallbackCopy(shareData.text, shareData.url);
        }
      }
    } else {
      this.fallbackCopy(shareData.text, shareData.url);
    }
  }

  private async fallbackCopy(text: string, url: string) {
    try {
      const message = `${text}\n${url}`;
      await navigator.clipboard.writeText(message);
      showToast('Invite copied to clipboard!', 'info');
    } catch (err) {
      console.error('Clipboard write failed:', err);
      showToast('Failed to copy invite.', 'error');
    }
  }
}
