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

# 4. Validate TypeScript configuration (required)
echo "🔍 Validating TypeScript configuration..."
npx tsc --noEmit
if [ $? -eq 0 ]; then
  echo "✅ TypeScript configuration is valid."
else
  echo "❌ TypeScript validation failed. Exiting."
  exit 1
fi

echo "🔍 Running ESLint to check code quality..."
npm run lint
if [ $? -eq 0 ]; then
  echo "✅ ESLint check complete."
else
  echo "❌ ESLint found issues. Exiting."
  exit 1
fi

echo "⚙️ Building server-side TypeScript code..."
npm run build
if [ $? -eq 0 ]; then
  echo "✅ Server-side code built successfully."
else
  echo "❌ Server-side build failed. Exiting."
  exit 1
fi
echo ""

echo "⚙️ Building client-side assets..."
npm run build:client
if [ $? -eq 0 ]; then
  echo "✅ Client-side assets built successfully."
else
  echo "❌ Client-side build failed. Exiting."
  exit 1
fi
echo ""

echo "🔍 Running tests to verify functionality..."
npm test
if [ $? -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Some tests failed. Exiting."
  exit 1
fi

echo ""
echo "# --- Educational & Safety Notes ---"
echo "# - This script enforces TypeScript, lint, and test checks."
echo "# - If you need to skip a step for debugging, comment out the relevant block."
echo "# - If you encounter persistent issues, try:"
echo "#     rm -rf node_modules dist && npm install"
echo "# - For Windows users: run this script in Git Bash or WSL for best results."
echo "# - If you need to roll back, use: git checkout -- setup.sh"
echo "# - For more help, see README.md or copilot-instructions.md."
echo ""

# --- Completion ---
echo "🎉 Setup complete!"
echo "Starting the development environment (both client and server)..."
npm run dev:all
