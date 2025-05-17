// src/types.ts
export interface Card {
  value: string | number;
  suit: string; // Made non-optional based on typical card structure
  back?: boolean;
  copied?: boolean;
}

// You can add other shared interfaces/types here as your project grows.