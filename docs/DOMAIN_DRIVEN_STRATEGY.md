# Domain-Driven Design Strategy

## Problem: Feature Confusion
Join vs Create game operations were mixed in the same functions, leading to validation confusion.

## Solution: Clear Domain Boundaries

### 1. Separate Use Cases

```typescript
// Instead of one JOIN_GAME event handling both create and join:

// Clear separation:
interface GameActions {
  CREATE_GAME: {
    payload: CreateGamePayload
    validation: RequiresPlayerCounts
  }
  
  JOIN_EXISTING_GAME: {
    payload: JoinExistingGamePayload  
    validation: SkipsPlayerCounts
  }
}

// This makes the difference explicit in the code
```

### 2. Domain Services

```typescript
// Create domain-specific services
class GameCreationService {
  validateCreateRequest(payload: CreateGamePayload): ValidationResult
  createNewGame(payload: CreateGamePayload): Promise<GameResult>
}

class GameJoinService {
  validateJoinRequest(payload: JoinGamePayload): ValidationResult
  joinExistingGame(payload: JoinGamePayload): Promise<JoinResult>
}
```

### 3. Clear Naming Conventions

```typescript
// Button handlers should reflect their domain purpose
function handleCreateGameClick() {
  // Creates new game with player counts
}

function handleJoinExistingGameClick() {
  // Joins existing game by room code
}

// Not: handleJoinGameClick() which is ambiguous
```

## Implementation Strategy

1. **Identify Domain Boundaries**: List all distinct user actions
2. **Create Bounded Contexts**: Group related actions together
3. **Define Clear Interfaces**: Each context has explicit inputs/outputs
4. **Prevent Cross-Context Pollution**: Don't mix domain logic

## Benefits

- Easier to test (each domain has clear expectations)
- Easier to modify (changes stay within domain boundaries)
- Easier to understand (code matches mental model)
- Fewer bugs (no confusion about which validation rules apply)
