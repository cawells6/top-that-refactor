# Architecture Contracts

## Core Principle: Contract-First Development

Before implementing any feature, define the contracts between layers.

## Layer Contracts

### 1. Client-Server Communication Contract

```typescript
// Define EXACTLY what each event expects
interface JoinGameContract {
  // For joining existing games
  join: {
    payload: { roomId: string; playerName: string };
    response: { roomId: string; playerId: string } | { error: string };
  };

  // For creating new games
  create: {
    payload: { playerName: string; numHumans: number; numCPUs: number };
    response: { roomId: string; playerId: string } | { error: string };
  };

  // Error semantics
  errors: {
    fatalSession: 'session-error'; // Clears client session + returns to lobby
    nonFatal: 'err'; // Shows message without resetting session
  };
}
```

### 2. Validation Contract

```typescript
// Client and server MUST use the same validation rules
interface ValidationContract {
  joinGame: {
    // Skip player count validation when roomId is present
    skipPlayerCountValidation: boolean; // = !!payload.roomId
  };
}
```

### 3. Test Contract

```typescript
// Tests must mock the ACTUAL abstraction layer being used
interface TestContract {
  // If code uses emitJoinGame, test must mock emitJoinGame
  // If code uses socket.emit directly, test must mock socket.emit
  mockingLayer: 'acknowledgmentUtils' | 'socket' | 'state';
}
```

## Implementation Rules

1. **Never assume**: Always explicitly define what each layer expects
2. **Document contracts**: Use TypeScript interfaces to enforce contracts
3. **Validate contracts**: Write contract tests that verify layer communication
4. **Version contracts**: When changing contracts, use migration strategies

## Contract Verification

```typescript
// Example contract test
describe('Join Game Contract', () => {
  it('should handle join existing game with correct payload structure', () => {
    const payload = { roomId: 'ABC123', playerName: 'Test' };
    // Test that both client validation and server validation agree
    expect(clientValidation(payload)).toEqual(serverValidation(payload));
  });
});
```
