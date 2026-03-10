Casita — a little home for your ai agent.

Run the Claude Code agent in a docker container, allowing it to run any local operation in the container. The agent can install tools as needed.

The container is pre-loaded with tools an agent would commonly use:
- common dev tools
- python and node runtimes
- chromium browser with playwright mcp

## Workspace

Similar to git or Claude code itself, the casita is tied to a workspace -- a directory on the host machine. The workspace is mounted into the container at `/workspace`.

# Notes

Chrome does not support this platform (linux/arm64).