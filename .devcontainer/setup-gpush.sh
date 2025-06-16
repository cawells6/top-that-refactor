#!/bin/bash
# Add gpush function to ~/.bashrc if not already present
if ! grep -q 'gpush()' ~/.bashrc; then
  cat <<'EOF' >> ~/.bashrc

gpush() {
  git add .
  git commit -m "$*"
  git push
}
EOF
fi

# Add gnext function to ~/.bashrc if not already present
if ! grep -q 'gnext()' ~/.bashrc; then
  cat <<'EOF' >> ~/.bashrc

gnext() {
  # Commit and push all changes
  git add .
  git commit -m "$1"
  git push

  # Get current branch name
  current_branch=$(git rev-parse --abbrev-ref HEAD)

  # Extract version number (assumes format like 3.4)
  if [[ $current_branch =~ ^([0-9]+)\.([0-9]+)$ ]]; then
    major=${BASH_REMATCH[1]}
    minor=${BASH_REMATCH[2]}
    next_minor=$((minor + 1))
    next_branch="$major.$next_minor"
    git pull
    git checkout -b "$next_branch"
    git push -u origin "$next_branch"
    echo "Switched to new branch: $next_branch"
  else
    echo "Current branch name is not in the expected format (e.g., 3.4)."
  fi
}
EOF
fi
