#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Helper Functions ---
function check_command() {
  if ! command -v $1 &> /dev/null
  then
    echo "❌ Error: $1 is not installed. Please install $1 and try again."
    exit 1
  fi
}

function optional_step() {
  echo "🔍 $1"
  if $2; then
    echo "✅ $3"
  else
    echo "⚠️ $4 - continuing anyway"
  fi
  echo ""
  # Don't exit on failure for optional steps
  return 0
}

# --- Main Script ---
echo "🚀 Starting Top That! project setup..."

# 1. Check for prerequisites (Node.js and npm)
echo "🔍 Checking for prerequisites (Node.js and npm)..."
check_command node
check_command npm

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ "$NODE_MAJOR_VERSION" -lt 16 ]; then
  echo "❌ Error: Node.js version $NODE_VERSION is too old. Please use v16 or higher."
  exit 1
fi
echo "✅ Prerequisites found. Using Node.js $NODE_VERSION."
echo ""

# 2. Clean up any existing port conflicts (optional)
echo "🧹 Cleaning up any existing port conflicts..."
if node scripts/clean-start.cjs 2>/dev/null || node scripts/port-cleanup.cjs 2>/dev/null; then
  echo "✅ Port cleanup successful or not needed."
else
  echo "⚠️ Port cleanup script not found or failed - continuing anyway."
fi
echo ""

# 3. Install npm dependencies
echo "📦 Installing npm dependencies from package.json..."
npm install
echo "✅ Dependencies installed successfully."
echo ""

# 4. Validate TypeScript configuration (optional)
optional_step "Validating TypeScript configuration..." \
  "npx tsc --noEmit" \
  "TypeScript configuration is valid." \
  "TypeScript validation failed"

# 5. Run ESLint to check for issues (optional)
optional_step "Running ESLint to check code quality..." \
  "npm run lint" \
  "ESLint check complete." \
  "ESLint found issues"

# 6. Build the TypeScript source code
echo "⚙️ Building server-side TypeScript code..."
npm run build
echo "✅ Server-side code built successfully."
echo ""

# 7. Build the client-side code
echo "⚙️ Building client-side assets..."
npm run build:client
echo "✅ Client-side assets built successfully."
echo ""

# 8. Run tests (optional)
optional_step "Running tests to verify functionality..." \
  "npm test" \
  "All tests passed!" \
  "Some tests failed"

# --- Completion ---
echo "🎉 Setup complete!"
echo "You can now start the development environment by running:"
echo ""
echo "    npm run dev:all       - Start both client and server"
echo "    npm run dev:server    - Start only the server"
echo "    npm run dev:client    - Start only the client"
echo "    npm run monitor:ports - Monitor port usage"
echo ""
echo "Happy coding! 🚀"
