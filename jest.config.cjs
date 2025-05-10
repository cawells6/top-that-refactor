// jest.config.cjs
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testMatch: ['**/tests/**/*.test.js'],
};
