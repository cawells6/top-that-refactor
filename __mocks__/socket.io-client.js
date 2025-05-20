// __mocks__/socket.io-client.js
// Jest mock for socket.io-client

const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  id: 'mock-socket-id',
};

const io = jest.fn(() => mockSocket);
// Support io.connect() if used
io.connect = jest.fn(() => mockSocket);

// Export as both named and default to match ESM import { io } and import io
module.exports = {
  __esModule: true,
  default: io,
  io,
};
