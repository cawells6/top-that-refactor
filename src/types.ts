// src/types.ts
export interface Card {
  value: string | number;
  suit: string;
  back?: boolean;
  copied?: boolean;
}

export interface DealtCards {
  // <<< ADD THIS INTERFACE AND EXPORT IT
  hands: Card[][];
  upCards: Card[][];
  downCards: Card[][];
}

// You can add other shared interfaces or type aliases here
// as your project needs them.
