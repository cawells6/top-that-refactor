export { validateJoinPayload } from '../../src/shared/validation.js';

// Keep DOM-specific helpers (if any existed for showing red text under inputs)
export function displayValidationErrors(error: string) {
   const errorEl = document.getElementById('lobby-error');
   if (errorEl) errorEl.textContent = error;
}
