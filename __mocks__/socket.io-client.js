// __mocks__/socket.io-client.js
// Jest mock for socket.io-client (CommonJS for Jest)

const jestGlobal = require('jest-mock');

const mockSocket = {
  on: jestGlobal.fn(),
  emit: jestGlobal.fn(),
  connect: jestGlobal.fn(),
  disconnect: jestGlobal.fn(),
  id: 'mock-socket-id',
};

const io = jestGlobal.fn(() => mockSocket);
// Support io.connect() if used
io.connect = jestGlobal.fn(() => mockSocket);

// Export as both named and default to match ESM import { io } and import io
module.exports = {
  io,
  default: io,
};
