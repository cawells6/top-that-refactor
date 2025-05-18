// jest.config.cjs
module.exports = {
  testEnvironment: 'jsdom', // Recommended for client-side tests
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  testMatch: [
    '**/tests/**/*.test.ts',         // Server-side tests
    '**/public/scripts/**/*.test.ts' // Client-side tests
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    // Handle .js extensions in imports from .ts files
    // e.g., import GameState from '../models/GameState.js' -> maps to GameState.ts
    '^(\.\.\/.*)\.js$': '$1',
  },
  // Add any other specific configurations you had or need
  // For example, setupFilesAfterEnv for @testing-library/jest-dom:
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // if you have a setup file
};