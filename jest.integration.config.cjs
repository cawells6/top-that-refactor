const baseConfig = require('./jest.config.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  testEnvironment: 'node', // Use Node environment for network tests
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'], // Only run integration tests
  testPathIgnorePatterns: ['/node_modules/'], // Override base config to include integration tests
  moduleNameMapper: {
    // Inherit all mappings but remove the socket.io-client mock AND the aggressive .js mapper
    ...Object.fromEntries(
      Object.entries(baseConfig.moduleNameMapper || {}).filter(
        ([key]) => key !== '^socket.io-client$' && key !== '^(.+)\\.js$'
      )
    ),
    // Add safer .js mapper that only targets relative paths
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
     // Explicitly use babel-jest (or whatever base uses) but ensuring we don't break on ESM if needed.
     // Actually baseConfig uses babel-jest.
     // If we are running with --experimental-vm-modules, we might need simple transformer.
     // But let's stick to base transform for now, assuming the mapper fix solves the node_modules issue.
     ...baseConfig.transform
  }
};
