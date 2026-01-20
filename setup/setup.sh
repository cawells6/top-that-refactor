#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
# Get the directory of the currently executing script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
ENV_EXAMPLE_FILE=".env.example"
ENV_FILE=".env"

# --- Helper Functions ---
print_message() {
    local message=$1
    local color=$2
    local nocolor='\033[0m'
    local color_code
    case "$color" in
        green)  color_code='\033[0;32m';;
        yellow) color_code='\033[0;33m';;
        red)    color_code='\033[0;31m';;
        blue)   color_code='\033[0;34m';;
        *)      color_code=$nocolor;;
    esac
    echo -e "${color_code}${message}${nocolor}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# --- Main Script ---
cd "$PROJECT_ROOT" || { print_message "Error: Could not navigate to project root at $PROJECT_ROOT" "red"; exit 1; }

print_message "Top-That Refactor :: Project Setup" "blue"
print_message "=================================" "blue"
print_message "Project root detected at: $PROJECT_ROOT"

# 1. Check for Prerequisites (Node.js and npm)
print_message "\n[1/4] Checking for prerequisites..."
if ! command_exists node || ! command_exists npm; then
    print_message "Error: Node.js and/or npm are not installed or not in your PATH." "red"
    print_message "Please install Node.js (which includes npm) and try again." "red"
    exit 1
fi
print_message "✅ Node.js and npm are installed." "green"
print_message "   - Node version: $(node --version)"
print_message "   - npm version: $(npm --version)"

# 2. Set up environment file
print_message "\n[2/4] Setting up environment file..."
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE_FILE" ]; then
        print_message "   - '.env' file not found. Copying from '.env.example'..." "yellow"
        cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
        print_message "   ✅ '.env' file created successfully." "green"
    else
        print_message "   - Warning: '.env.example' not found. Skipping '.env' creation." "yellow"
    fi
else
    print_message "   - '.env' file already exists. Skipping." "green"
fi

# 3. Install npm dependencies
print_message "\n[3/4] Installing project dependencies..."
if [ -f "package-lock.json" ]; then
    print_message "   - 'package-lock.json' found. Using 'npm ci' for clean installation." "yellow"
    if npm ci; then
        print_message "✅ Dependencies installed successfully via npm ci." "green"
    else
        print_message "Error: 'npm ci' failed. Please check the error messages above." "red"
        exit 1
    fi
else
    print_message "   - 'package-lock.json' not found. Using 'npm install'." "yellow"
    if npm install; then
        print_message "✅ Dependencies installed successfully via npm install." "green"
    else
        print_message "Error: 'npm install' failed. Please check the error messages above." "red"
        exit 1
    fi
fi

# 4. Build the project (TypeScript server and Vite client)
print_message "\n[4/4] Building the project for production..."
print_message "   - Building server code (TypeScript -> JavaScript)..."
if npm run build; then
    print_message "   ✅ Server built successfully." "green"
else
    print_message "   Error: Server build ('npm run build') failed." "red"
    exit 1
fi

print_message "   - Building client assets (Vite)..."
if npm run build:client; then
    print_message "   ✅ Client built successfully." "green"
else
    print_message "   Error: Client build ('npm run build:client') failed." "red"
    exit 1
fi

# --- Completion Message ---
print_message "\n🎉 Setup complete! 🎉" "green"
print_message "======================" "green"
print_message "You can now start the application using one of the following commands:"
print_message "   - For development (with auto-reloading):" "yellow"
print_message "     npm run dev"
print_message "   - For production (uses the build artifacts):" "yellow"
print_message "     npm start"
// Testing the ship-it buttonsssss