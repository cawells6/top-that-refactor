# Add current directory to PATH when in Top-That-Refactor
cd() {
  builtin cd "$@"
  if [ "$(pwd)" = "$HOME/OneDrive/Documents/GitHub/Top-That-Refactor" ]; then
    export PATH=$PATH:.
    echo "Project directory detected - 'run' command enabled"
  fi
}
