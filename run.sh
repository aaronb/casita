#!/bin/bash
set -e

IMAGE_NAME="${IMAGE_NAME:-agent-sandbox}"
CONTAINER_NAME="${CONTAINER_NAME:-agent-sandbox}"
NOVNC_PORT="${NOVNC_PORT:-6080}"
SANDBOX_NAME="${SANDBOX_NAME:-default}"
HOME_DIR="$(pwd)/.sandboxes/${SANDBOX_NAME}/home"

mkdir -p "$HOME_DIR"

docker run -it --rm \
    --name "$CONTAINER_NAME" \
    --shm-size=2g \
    -p "$NOVNC_PORT":6080 \
    -v "$HOME_DIR":/home/claude \
    -v "$(pwd)":/workspace \
    "$IMAGE_NAME" \
    "$@"
