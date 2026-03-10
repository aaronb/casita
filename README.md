# Casita

A little home for your AI agent.

Run the [Claude Code](https://docs.anthropic.com/en/docs/claude-code) agent in a Docker container, allowing it to run any local operation safely inside the container. The agent can install tools as needed.

The container is pre-loaded with tools an agent would commonly use:
- Common dev tools (git, curl, jq, etc.)
- Python and Node.js runtimes
- Chromium browser with Playwright MCP

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Docker](https://www.docker.com/) running locally

## Building the Docker Image

```sh
./build.sh
```

## Installing the CLI

```sh
cd cli
npm install
npm run build
npm link
```

After linking, the `casita` command is available globally.

## Usage

```sh
# Start a casita in the current directory
casita run

# List all casitas
casita list

# Remove a casita
casita rm <name>

# Open the browser UI
casita browser
```

See [cli/README.md](cli/README.md) for full command reference and details.

## How It Works

Each workspace directory gets its own persistent container (a "casita"). The container survives restarts and preserves system-level changes across sessions. Your working directory is mounted at `/workspace` inside the container, and the agent's home directory is persisted on disk.

## License

[MIT](LICENSE)
