// tests/testUtils.ts
// Shared test utilities for server-side socket/IO mocks
import { jest } from '@jest/globals';

export interface MockSocket {
  id: string;
  join: any;
  leave: any;
  emit: any;
  on: any;
  removeAllListeners: any;
  eventHandlers: Record<string, (data?: any, ack?: Function) => void>;
  simulateIncomingEvent: (event: string, data?: any, ack?: Function) => void;
  disconnect: any;
  off: any;
}

export interface MockIO {
  on: any;
  to: any;
  emit: any;
  sockets: { sockets: Map<string, MockSocket> };
}

export function createMockSocket(
  id: string,
  topLevelEmitMock: any
): MockSocket {
  const handlers: Record<string, (data?: any, ack?: Function) => void> = {};
  return {
    id,
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn((event: string, payload?: any) =>
      topLevelEmitMock(event, payload)
    ),
    on: jest.fn(
      (event: string, handler: (data?: any, ack?: Function) => void) => {
        handlers[event] = handler;
      }
    ),
    removeAllListeners: jest.fn(),
    eventHandlers: handlers,
    simulateIncomingEvent: (event: string, data?: any, ack?: Function) => {
      if (handlers[event]) handlers[event](data, ack);
    },
    disconnect: jest.fn(),
    off: jest.fn(),
  };
}

export function createMockIO(topLevelEmitMock: any): MockIO {
  // Patch .to().emit to also call topLevelEmitMock directly for all events
  const toFn = jest.fn((_id: string) => ({
    emit: jest.fn((event: string, payload?: any) =>
      topLevelEmitMock(event, payload)
    ),
  }));
  return {
    on: jest.fn(),
    to: toFn,
    emit: jest.fn((event: string, payload?: any) =>
      topLevelEmitMock(event, payload)
    ),
    sockets: { sockets: new Map() },
  };
}
