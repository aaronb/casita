# Sandbox CLI

A command-line tool for managing persistent AI agent sandbox containers. Each workspace gets its own sandbox that survives restarts and preserves system-level changes across sessions.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Docker](https://www.docker.com/) running locally
- The `agent-sandbox` Docker image (see [Building the Image](#building-the-image))

## Building the Image

From the project root (one level above `cli/`):

```sh
./build.sh
```

This builds the `agent-sandbox` Docker image from `sandbox.dockerfile`.

## Installing the CLI

```sh
cd cli
npm install
npm run build
npm link
```

After linking, the `sandbox` command is available globally.

For development without linking:

```sh
npm run dev -- <command>
# e.g.
npm run dev -- run
npm run dev -- list
```

## Commands

### `sandbox run [name]`

Start or resume a sandbox. Sandboxes are persistent — exiting and running again from the same directory reattaches to the same container.

```sh
# Auto-assigns a name, binds to current workspace
sandbox run

# Explicit name (allows multiple sandboxes per workspace)
sandbox run my-experiment

# Pin a specific host port for noVNC
sandbox run -p 8080

# Pass args to the container command (claude) after --
sandbox run -- --resume
```

**Behavior:**
- **No existing sandbox** for the workspace → creates a new container
- **Stopped sandbox** found → restarts and reattaches (`docker start -ai`)
- **Running sandbox** found → opens a new shell (`docker exec -it`)

Options:
| Flag | Description |
|------|-------------|
| `-p, --port <port>` | Host port for noVNC (auto-assigned if omitted) |
| `-i, --image <image>` | Docker image name (default: `agent-sandbox`) |

### `sandbox list`

List all sandboxes (running and stopped).

```sh
sandbox list

# Show only running sandboxes
sandbox list --running
```

Output:

```
NAME       PORT   WORKSPACE                STATUS
wise-cat   8080   /Users/aaron/my-project  Up 2 hours
bold-fox   --     /Users/aaron/other       Exited (0) 3 days ago
```

### `sandbox rm <name>`

Remove a sandbox container.

```sh
sandbox rm wise-cat

# Skip confirmation
sandbox rm wise-cat --force

# Also delete the persisted home directory on disk
sandbox rm wise-cat --force --clean
```

Options:
| Flag | Description |
|------|-------------|
| `-f, --force` | Skip confirmation prompt |
| `--clean` | Also delete `.sandboxes/<name>/home/` on disk |

### `sandbox browser [name]`

Open the noVNC web interface for a running sandbox.

```sh
# Inferred if only one sandbox is running
sandbox browser

# By name
sandbox browser wise-cat
```

## How Persistence Works

- **Workspace affinity:** Each sandbox is labeled with the host directory it was started from. Running `sandbox run` from the same directory always reconnects to the same container.
- **Container persistence:** Containers are created without `--rm`, so system-level changes (apt installs, global configs) survive across sessions.
- **Home directory:** `/home/claude` is bind-mounted from `.sandboxes/<name>/home/` on the host, so user files persist even if the container is removed.
- **Workspace mount:** The host working directory is mounted at `/workspace` inside the container.
