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
  // Dramatic success animation for tutorial feedback
  if (type === 'success') {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '10000',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    const container = document.createElement('div');
    Object.assign(container.style, {
      background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.95) 0%, rgba(21, 128, 61, 0.95) 100%)',
      padding: '30px 60px',
      borderRadius: '20px',
      border: '4px solid #4ade80',
      boxShadow: '0 0 40px rgba(74, 222, 128, 0.6), 0 8px 32px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.1)',
      transform: 'scale(0)',
      opacity: '0',
      transition: 'all 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67)',
    });

    const text = document.createElement('div');
    text.textContent = message;
    Object.assign(text.style, {
      color: '#ffffff',
      fontSize: '3rem',
      fontWeight: 'bold',
      fontFamily: 'Impact, sans-serif',
      textTransform: 'uppercase',
      textShadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(74, 222, 128, 0.5)',
    });

    container.appendChild(text);
    overlay.appendChild(container);

    container.appendChild(text);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      container.style.transform = 'scale(1)';
      container.style.opacity = '1';
    });

    // Animate out
    setTimeout(() => {
      container.style.opacity = '0';
      container.style.transform = 'scale(1.2)';
      setTimeout(() => overlay.remove(), 400);
    }, 1200);
    return;
  }

  // Standard toast for error/info
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
