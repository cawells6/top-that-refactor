/// <reference types="vite/client" />

declare const __DEV__: boolean;

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR: boolean;
}

// Asset type declarations for Vite - comprehensive patterns
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

// Support relative path imports from any directory
declare module '*/*.svg' {
  const content: string;
  export default content;
}

declare module '*/*.png' {
  const content: string;
  export default content;
}

declare module '*/*/*.svg' {
  const content: string;
  export default content;
}

declare module '*/*/*.png' {
  const content: string;
  export default content;
}

declare module '*/*/*/*.png' {
  const content: string;
  export default content;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Generic wildcard declarations for all asset types
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

// Explicit declarations for specific asset imports used in the project
declare module '../assets/Player.svg' {
  const content: string;
  export default content;
}

declare module '../assets/robot.svg' {
  const content: string;
  export default content;
}

declare module '../src/shared/logov2.svg' {
  const content: string;
  export default content;
}

declare module '../src/shared/crownv2.svg' {
  const content: string;
  export default content;
}

declare module '../src/shared/Reset-icon.png' {
  const content: string;
  export default content;
}

declare module '../src/shared/Copy-icon.png' {
  const content: string;
  export default content;
}

declare module '../src/shared/Burn-icon.png' {
  const content: string;
  export default content;
}

declare module '../src/shared/invalid play-icon.png' {
  const content: string;
  export default content;
}

declare module '../src/shared/4ofakind-icon.png' {
  const content: string;
  export default content;
}

// Declare module for other image formats if needed
declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

// Declare module for SoundManager
declare module './scripts/SoundManager.js' {
  export const SoundManager: {
    play(soundName: string): void;
  };
}

// Declare module for other image formats if needed
declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

// Declare module for SoundManager
declare module './scripts/SoundManager.js' {
  export const SoundManager: {
    play(soundName: string): void;
  };
}
