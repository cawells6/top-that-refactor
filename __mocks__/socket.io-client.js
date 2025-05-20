// __mocks__/socket.io-client.js
// Jest mock for socket.io-client

import { jest } from '@jest/globals';
const jestGlobal = jest;

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
export default io;
export { io };
