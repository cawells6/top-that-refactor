# Layered Architecture Guidelines

## Problem: Abstraction Layer Confusion
Tests expected `socket.emit` but code used `emitJoinGame` wrapper, causing test failures.

## Solution: Document and Enforce Abstraction Layers

### Architecture Layers (Top to Bottom)

```
┌─────────────────────────────────────┐
│ UI Layer (events.ts)                │
├─────────────────────────────────────┤ 
│ Application Layer (acknowledgments) │
├─────────────────────────────────────┤
│ Transport Layer (socket.io)         │
├─────────────────────────────────────┤
│ Network Layer                       │
└─────────────────────────────────────┘
```

### Layer Responsibilities

#### UI Layer
- Handles DOM events
- Validates user input
- Calls Application Layer methods

#### Application Layer  
- Business logic
- Retry logic, timeouts
- User feedback
- Calls Transport Layer

#### Transport Layer
- Raw socket communication
- Event emission/reception

### Testing Strategy by Layer

```typescript
// UI Layer Tests: Mock Application Layer
jest.mock('./acknowledgmentUtils', () => ({
  emitJoinGame: jest.fn()
}))

// Application Layer Tests: Mock Transport Layer  
jest.mock('./socket', () => ({
  emit: jest.fn()
}))

// Transport Layer Tests: Mock Network
// Use actual socket.io test utilities
```

### Implementation Rules

1. **Never skip layers**: UI → App → Transport, never UI → Transport
2. **Mock the layer below**: Test layer N by mocking layer N-1
3. **Document layer boundaries**: Clear interfaces between layers
4. **Enforce with linting**: ESLint rules to prevent layer violations

### Layer Interface Example

```typescript
// Application Layer Interface
interface GameCommunication {
  joinExistingGame(payload: JoinPayload): Promise<JoinResult>
  createNewGame(payload: CreatePayload): Promise<CreateResult>
}

// UI Layer uses this interface, never touches Transport directly
const gameCommunication: GameCommunication = new SocketGameCommunication()
```

## Benefits

- Tests focus on the correct abstraction level
- Changes to lower layers don't break higher layers
- Clear responsibility boundaries
- Easier to swap implementations (e.g., WebRTC instead of Socket.IO)
