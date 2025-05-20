// Type declaration for our socket.io-client mock
import { Socket } from 'socket.io-client';

// Define types for our mock socket
interface MockSocket extends Socket {
  on: jest.Mock;
  emit: jest.Mock;
  connect: jest.Mock;
  disconnect: jest.Mock;
  id: string;
}

// Define type for our mock io function
interface MockIoFunction extends jest.Mock<MockSocket> {
  (uri?: string, opts?: any): MockSocket;
  connect: jest.Mock<MockSocket>;
}

// Export types for both named and default exports
declare const io: MockIoFunction;
export { io };
export default io;
