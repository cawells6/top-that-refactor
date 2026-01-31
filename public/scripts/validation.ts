export { validateJoinPayload } from '../../src/shared/validation.js';

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
