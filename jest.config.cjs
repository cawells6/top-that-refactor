// jest.config.cjs
module.exports = {
  testEnvironment: 'jsdom', // Or 'node' if some tests are purely Node.js
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  testMatch: [
    '**/tests/**/*.test.(ts|tsx|js|jsx)', // Matches files like your-test.test.ts in tests folder
    '**/?(*.)+(spec|test).(ts|tsx|js|jsx)' // Common alternative pattern
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Add any other specific configurations you had or need
  // For example, setupFilesAfterEnv for @testing-library/jest-dom:
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // if you have a setup file
};