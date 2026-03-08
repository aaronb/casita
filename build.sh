#!/bin/bash
set -e

IMAGE_NAME="${IMAGE_NAME:-agent-sandbox}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  all       Build image and CLI (default)"
  echo "  image     Build Docker image only"
  echo "  cli       Build CLI only"
  echo "  install   Build CLI and install it locally (npm link)"
  echo ""
  echo "Environment:"
  echo "  IMAGE_NAME   Docker image name (default: agent-sandbox)"
}

build_image() {
  echo "==> Building Docker image: $IMAGE_NAME"
  docker build -f "$SCRIPT_DIR/sandbox.dockerfile" -t "$IMAGE_NAME" "$SCRIPT_DIR"
  echo "==> Image built: $IMAGE_NAME"
}

build_cli() {
  echo "==> Building CLI"
  cd "$SCRIPT_DIR/cli"
  npm install --silent
  npm run build
  echo "==> CLI built: cli/dist/"
}

install_cli() {
  build_cli
  echo "==> Installing CLI globally (npm link)"
  cd "$SCRIPT_DIR/cli"
  npm link
  echo "==> Installed: $(which sandbox)"
}

cmd="${1:-all}"

case "$cmd" in
  all)
    build_image
    build_cli
    ;;
  image)
    build_image
    ;;
  cli)
    build_cli
    ;;
  install)
    install_cli
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Unknown command: $cmd"
    usage
    exit 1
    ;;
esac
