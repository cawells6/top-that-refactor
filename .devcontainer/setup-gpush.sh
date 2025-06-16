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
