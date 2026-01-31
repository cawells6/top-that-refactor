// Re-export the shared logic so the UI uses the exact same rules as the server
export { validateJoinPayload } from '../../src/shared/validation.js';

// RETAIN these UI-specific helpers (they interact with the DOM)
export function displayValidationErrors(error: string) {
   const errorEl = document.getElementById('lobby-error');
   if (errorEl) {
     errorEl.textContent = error;
     errorEl.style.display = 'block';
   }
}

export function clearValidationErrors() {
   const errorEl = document.getElementById('lobby-error');
   if (errorEl) errorEl.style.display = 'none';
}
