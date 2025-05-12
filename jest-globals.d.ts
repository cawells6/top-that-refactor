// jest-globals.d.ts
// This file tells TypeScript about Jest's global functions and other globals

declare global {
  // Socket.IO client
  function io(url?: string | object, options?: object): any;
}

export {}; // This ensures this file is treated as a module
