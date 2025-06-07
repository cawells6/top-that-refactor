# Top That! Refactor - Agent Guidelines

This document provides essential guidance for AI agents (like GitHub Copilot) working on the "Top That!" card game refactoring project. Following these guidelines will ensure consistent, high-quality contributions to the codebase.

## Project Overview

"Top That!" is a real-time multiplayer card game with:
- **Frontend**: TypeScript with Vite, located in the `public/` directory
- **Backend**: Node.js with Express and Socket.IO for real-time communication
- **Testing**: Jest, with tests located in the `tests/` directory
- **Linting & Formatting**: ESLint with Prettier

The application follows a client-server architecture where game state is managed on the server (`GameController.ts`) and synchronized to connected clients.

## Coding Conventions and Style

- **Indentation**: Use 2-space indentation for all files
- **Naming Conventions**:
  - Use PascalCase for class names and interfaces (e.g., `GameController`, `Player`)
  - Use camelCase for variables, functions, and method names (e.g., `gameState`, `handleCardPlay()`)
  - Use UPPER_SNAKE_CASE for constants (e.g., `JOIN_GAME`)
  - Prefix interfaces with "I" (e.g., `IGameState`)
  - Prefix private class members with underscore (e.g., `_privateVariable`)
- **TypeScript**:
  - Always use explicit typing; avoid `any` type whenever possible
  - Create interfaces for complex data structures (see `src/shared/types.ts`)
  - Use TypeScript path aliases (configured in tsconfig.json)
- **File Organization**:
  - Follow the separation of concerns pattern:
    - `controllers/` - Server-side game logic controllers
    - `models/` - Server-side data models (e.g., GameState, Player)
    - `public/scripts/` - Client-side TypeScript code
    - `src/shared/` - Code shared between client and server (e.g., event names, types)
    - `utils/` - Utility functions
    - `tests/` - Jest test files

## Testing and Build Commands

### Installation

```bash
npm install
```

### Setup Process

To set up the development environment:

```bash
# Run the setup script to install dependencies and run tests
bash setup.sh
```

The existing setup script:
1. Installs project dependencies (including Jest)
2. Runs the test suite to verify functionality

For a more comprehensive setup, you might also want to:

```bash
# Use the enhanced setup script (provides more validation and feedback)
bash setup-enhanced.sh
```

The enhanced script provides:
- Prerequisites check (Node.js v16+ and npm)
- Port conflict resolution
- TypeScript configuration validation
- ESLint checks for code quality
- Building of server-side TypeScript code
- Building of client-side assets using Vite
- Test suite execution with clear feedback
- Setup completion summary with next steps

If you encounter any issues during setup:
```bash
# Check for port conflicts
npm run monitor:ports

# Clean up any potentially conflicting ports
npm run clean:ports

# Validate the TypeScript configuration
npx tsc --noEmit
```

After setup, verify installation with:
```bash
# Run tests to verify everything is working correctly
npm test

# Start the development environment to ensure it runs properly
npm run dev:all
```

### Development

The primary command to run the full development environment is:
```bash
# Cleans up ports, then starts the server & client concurrently
npm run dev:all
```

Other useful development scripts:
```bash
# The "enhanced" version which also starts a port monitor
npm run dev:all:enhanced

# Start only the server with nodemon for auto-restarts
npm run dev:server

# Start only the Vite client dev server
npm run dev:client

# A utility script to quickly add, commit, and push changes
npm run gpush "Your commit message"
```

### Testing

```bash
# Run all tests
npm test

# Run specific tests
npm test -- -t "test name pattern"

# Run tests with coverage
npm test -- --coverage
```

### Linting & Formatting

```bash
# Run ESLint to find issues
npm run lint

# Fix auto-fixable ESLint issues
npm run lint:fix

# Automatically fix ESLint and Prettier issues
npm run format
```

### Building

```bash
# Build the client for production
npm run build:client
```

## PR Expectations

When creating or reviewing pull requests:

1. **Summary**: Include a clear summary of changes
2. **Issue Reference**: Reference related issue numbers (e.g., "Fixes #123")
3. **Testing**: Confirm tests have been written or updated for new functionality
4. **Pre-PR Checklist**:
   - All tests pass: `npm test`
   - Code is linted: `npm run lint`
   - Code is properly formatted: `npm run format`
   - No TypeScript compilation errors: `tsc --noEmit`

## Git Branch Management

When working on features or fixes, always create new branches:

- **Branch Naming Convention**: Use descriptive names with prefixes:
  - `feature/` for new features (e.g., `feature/card-animation`)
  - `fix/` for bug fixes (e.g., `fix/socket-disconnect-error`)
  - `refactor/` for code improvements (e.g., `refactor/game-controller`)
  - `test/` for adding tests (e.g., `test/card-utils`)

- **Creating Branches**:
  ```bash
  # Create a new feature branch
  git checkout -b feature/my-new-feature
  
  # Push the new branch to remote
  git push -u origin feature/my-new-feature
  ```

- **Branch Workflow**:
  1. Create a branch from `main`
  2. Make commits with descriptive messages
  3. Push to the remote repository
  4. Create a Pull Request for review
  5. After approval, merge into `main`

- **Keeping Branches Updated**:
  ```bash
  # Update your branch with latest main
  git checkout main
  git pull
  git checkout your-branch-name
  git merge main
  ```

## Special Repository Details

- **Port Management**: The server uses port configuration from `current-port.txt`. Port cleanup scripts are available in `scripts/` directory.
- **Socket.IO Events**: All event names should be referenced from `shared/events.ts` to ensure consistency between client and server.
- **Path Aliases**: The project uses TypeScript path aliases. When importing, use these aliases rather than relative paths:
  - `@src/*` for source files
  - `@shared/*` for shared files
  - `@srcTypes/*` for type definitions
  - `@utils/*` for utility functions
- **Jest Configuration**: Custom Jest configuration is in `jest.config.cjs` and uses `babel.config.js` for transpilation.

## Key Project Details

### Development Server & Proxy

- **Server**: The Node.js server (`server.ts`) will try to start on port 3000. If that port is busy, it will try the next available port and write the correct port number to `current-port.txt`.
- **Client**: The Vite client dev server (`vite.config.ts`) runs on port 5173 and proxies requests to the backend.
  - `/socket.io` requests are forwarded to the Node.js server for WebSocket communication.
  - `/cards-api` requests are proxied to https://deckofcardsapi.com to prevent CORS issues when loading card images.

### Port Management

Port conflicts can occur during development. Several scripts are available in `package.json` to help manage this:
- `npm run clean:ports`: Kills processes running on ports 3000 and 5173.
- `npm run monitor:ports`: Monitors and reports on port usage.

### Socket.IO Events

All event names must be referenced from `src/shared/events.ts` to ensure consistency between the client and server. This file serves as the single source of truth for all socket communication contracts.

### Path Aliases

The project uses TypeScript path aliases defined in tsconfig.json. When importing, use these aliases rather than long relative paths:
- `@models/*`: models/*
- `@shared/*`: src/shared/*
- `@publicScripts/*`: public/scripts/*
- `@srcTypes/*`: src/types/*
- `@utils/*`: utils/*
- `@controllers/*`: controllers/*

## Special Instructions

- **Before Running Tests**: Ensure the server is not running, as tests will start their own server instance.
- **Socket.IO Testing**: Use the mock implementation in `__mocks__/socket.io-client.js` for client-side Socket.IO testing.
- **Clean Start**: If experiencing issues with port conflicts, run `npm run clean:ports` to clean up active ports.
- **Type Generation**: After modifying shared event interfaces, run `npm run generate-types` to update type definitions.
- **State Management**: The game state should only be modified through the `GameController` to maintain consistency.

## Dependency Management

- **Adding Dependencies**: When adding new dependencies, prefer exact versions to ensure reproducibility:
  ```bash
  npm install --save-exact package-name
  ```
- **Development Dependencies**: Place testing and development tools in devDependencies:
  ```bash
  npm install --save-dev --save-exact package-name
  ```

## Get Well Plan Phases

The project is following a phased "Get Well Plan" to improve code quality and maintainability:

1. **Phase 1**: Strong typing and interface definition
2. **Phase 2**: Modularization and separation of concerns
3. **Phase 3**: Comprehensive test coverage
4. **Phase 4**: Performance optimization and bug fixes

When working on the codebase, be mindful of which phase we're currently in and prioritize accordingly.
