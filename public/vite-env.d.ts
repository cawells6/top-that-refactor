/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Declare module for SVG imports
declare module '*.svg' {
  const content: string;
  export default content;
}

// Declare module for PNG imports
declare module '*.png' {
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
