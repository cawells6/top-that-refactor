// jest.config.cjs
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom', // Recommended for client-side tests
  transform: {
    '^.+\\.(ts|tsx)$': [
      'babel-jest',
      { configFile: './babel.config.js' }, // Ensure babel.config.js is used
    ],
  },
  testMatch: [
    '**/tests/**/*.test.ts', // Server-side tests
    '**/public/scripts/**/*.test.ts', // Client-side tests
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Ensure 'ts', 'tsx' are before 'js', 'jsx'
  moduleDirectories: ['node_modules', '<rootDir>/public/scripts'], // Keep this
  modulePaths: ['<rootDir>'], // Keep this

  moduleNameMapper: {
    // --- Keep your existing specific mocks first ---
    '^socket.io-client$': '<rootDir>/__mocks__/socket.io-client.js', // This is a specific .js file mock

    // --- Path aliases from tsconfig.json (map to module path without extension) ---
    // Jest will append extensions based on moduleFileExtensions
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@shared/(.*)\\.js$': '<rootDir>/src/types/$1.ts',
    '^@shared/(.*)$': '<rootDir>/src/types/$1',
    '^@publicScripts/(.*)$': '<rootDir>/public/scripts/$1',
    // Assuming @srcTypes is an alias for the single file src/types.ts
    '^@srcTypes$': '<rootDir>/src/types',

    // --- General mapping for .js extensions (map to module path without extension) ---
    // This tells Jest to strip .js, then it will try .ts (from moduleFileExtensions), then .js, etc.
    // This should correctly resolve project files to .ts and library files to .js
    '^(.+)\\.js$': '$1',
  },
  // Add any other specific configurations you had or need
  // For example, setupFilesAfterEnv for @testing-library/jest-dom:
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // if you have a setup file
};
