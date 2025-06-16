// tests/utils/mockSocket.ts

export class MockSocket {
  public emit = jest.fn();
  public on = jest.fn();
  public off = jest.fn();
  public once = jest.fn();
  public connected = true;
  public disconnected = false;
  public listeners = new Map<string, Function[]>();

  constructor() {}

  simulateIncomingEvent(event: string, ...args: any[]) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach((handler) => handler(...args));
  }

  // Optionally, allow registering listeners for test simulation
  addListener(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }
}

export function createMockSocket() {
  const socket = new MockSocket();
  // Patch 'on' to register listeners for simulateIncomingEvent
  socket.on = jest.fn((event, handler) => {
    socket.addListener(event, handler);
    return socket;
  });
  return socket;
}
