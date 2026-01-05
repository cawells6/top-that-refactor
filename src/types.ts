// src/types.ts
// Re-export shared types so imports pointing here work correctly
export * from './shared/types.js';

import type { Card } from './shared/types.js';

export interface DealtCards {
  hands: Card[][];
  upCards: Card[][];
  downCards: Card[][];
}

// You can add other shared interfaces or type aliases here
// as your project needs them.
