#!/bin/bash

# go - Fetch and checkout a remote branch in one step
# Usage: ./go branch-name

if [ $# -eq 0 ]; then
  echo "Error: No branch name provided"
  echo "Usage: ./go branch-name"
  exit 1
fi

BRANCH_NAME=$1

echo "Fetching and checking out branch: $BRANCH_NAME"

# Fetch all branches from all remotes
git fetch --all

# Try to checkout the branch directly (in case it's already local)
if git checkout $BRANCH_NAME 2>/dev/null; then
  echo "Switched to branch '$BRANCH_NAME'"
  exit 0
fi

# If that fails, try to checkout from origin
if git checkout -b $BRANCH_NAME origin/$BRANCH_NAME 2>/dev/null; then
  echo "Created new branch '$BRANCH_NAME' tracking 'origin/$BRANCH_NAME'"
  exit 0
fi

# If that fails too, try other remotes
for REMOTE in $(git remote); do
  if [ "$REMOTE" != "origin" ]; then
    if git checkout -b $BRANCH_NAME $REMOTE/$BRANCH_NAME 2>/dev/null; then
      echo "Created new branch '$BRANCH_NAME' tracking '$REMOTE/$BRANCH_NAME'"
      exit 0
    fi
  fi
done

echo "Error: Could not find branch '$BRANCH_NAME' locally or on any remote"
exit 1
