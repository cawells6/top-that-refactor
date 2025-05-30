# gpush - Quick Git Push Command

This repository includes a handy `gpush` command that allows you to quickly stage, commit, and push your changes in a single step.

## Usage Options

### Option 1: Using the batch file (Windows)

From your project root directory:

```bat
gpush "Your commit message here"
```

### Option 2: Using bash directly

```bash
bash scripts/gpush.sh "Your commit message here"
```

### Option 3: Using npm script

```bash
npm run gpush "Your commit message here"
```

### Option 4: Setting up a persistent alias

For a persistent alias in your bash shell, add this to your `~/.bashrc` or `~/.bash_profile`:

```bash
# Add this to your ~/.bashrc or ~/.bash_profile
alias gpush='/c/Users/chris/OneDrive/Documents/GitHub/Top-That-Refactor/scripts/gpush.sh'
```

Or for the current session only, run:

```bash
source scripts/bash_aliases
```

## Features

- Stages all changes with `git add .`
- Commits with your provided message
- Pushes to your remote repository
- Shows colorful status messages
