#!/bin/bash
set -e

IMAGE_NAME="${IMAGE_NAME:-agent-sandbox}"
CONTAINER_NAME="${CONTAINER_NAME:-agent-sandbox}"
NOVNC_PORT="${NOVNC_PORT:-6080}"

docker run -it --rm \
    --name "$CONTAINER_NAME" \
    --shm-size=2g \
    -p "$NOVNC_PORT":6080 \
    "$IMAGE_NAME" \
    "$@"
