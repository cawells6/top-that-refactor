/**
 * @jest-environment jsdom
 */

// Mock socket.io-client before any imports from main.ts occur
jest.mock('socket.io-client', () => {
  const mSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    id: 'mockSocketIdTest123',
  };
  const mockIo = jest.fn(() => {
    console.log('[MOCK] socket.io-client default export called');
    return mSocket;
  });
  globalThis.__mockedIo__ = mockIo; // Attach to global for test access
  return {
    __esModule: true,
    default: mockIo, // Provide default export for io()
  };
});

describe('Client Main Script (main.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('should load and execute without throwing an error', () => {
    let errorThrown = false;
    try {
      jest.isolateModules(() => {
        require('./main.ts');
      });
    } catch (e) {
      errorThrown = true;
      console.error("Error loading main.ts in test:", e);
    }
    expect(errorThrown).toBe(false);
  });

  it('should attempt to connect with Socket.IO when loaded', () => {
    jest.isolateModules(() => {
      require('./main.ts');
    });
    // Access the actual mock used by main.ts
    const actualMockIo = globalThis.__mockedIo__;
    expect(jest.isMockFunction(actualMockIo)).toBe(true);
    expect(actualMockIo.mock.calls.length).toBeGreaterThan(0);
  });
});
