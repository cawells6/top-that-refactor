// uiHelpers.ts
// Contains UI-related helper functions
import { $ } from './uiManager.js'; // getNameInput is also from uiManager, but $ is more generic
import { getNameInput } from './uiManager.js';

export function showGameOverMessage(didWin: boolean, winnerName: string): void {
  const over = document.createElement('div');
  over.id = 'game-over-container';
  over.innerHTML = `
    <div class="modal-content">
      <h1>Game Over!</h1>
      <p>${didWin ? '🎉 You win!' : `${winnerName} wins!`}</p>
      <button id="play-again-btn" class="btn btn-primary">Play Again</button>
    </div>`;
  document.body.appendChild(over);
  $('play-again-btn')?.addEventListener('click', () => location.reload());
}

export function validateName(): string | null {
  const nameInput = getNameInput();
  if (nameInput) {
    const name = nameInput.value.trim();
    if (name.length > 0 && name.length <= 20) {
      return name;
    }
  }
  alert('Please enter a name between 1 and 20 characters.');
  return null;
}

export function showToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'success'
) {
  // Standard toast
  const backgroundByType = {
    success: '#28a745',
    error: '#dc3545',
    info: '#1f7a6d',
  } as const;
  const background = backgroundByType[type] || backgroundByType.success;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '10000',
    background,
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    fontWeight: '600',
    fontSize: '1rem',
    pointerEvents: 'none',
    transition: 'opacity 0.3s ease',
    opacity: '1',
  });
  document.body.appendChild(toast);

  // Force reflow
  toast.offsetHeight;

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
