declare const __DEV__: boolean;
declare const DEV: boolean;

export {};
// public/scripts/shims.d.ts
// Shims for ESM/NodeNext .js extension imports in TypeScript

declare module './uiManager.js';
declare module './socketService.js';
declare module './state.js';

// If you add more .js extension imports, add them here for TS compatibility.
