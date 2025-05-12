// jest.config.cjs
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.cjs' }]
  },
  testMatch: ['**/tests/**/*.test.js'],
  // Handle ES modules
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'json'],
  // Use Node resolution
  moduleDirectories: ['node_modules']
};
