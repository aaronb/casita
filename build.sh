#!/bin/bash
set -e

IMAGE_NAME="${IMAGE_NAME:-agent-sandbox}"

docker build -f sandbox.dockerfile -t "$IMAGE_NAME" .
