# Casita CLI

A command-line tool for managing persistent AI agent containers. Each workspace gets its own casita that survives restarts and preserves system-level changes across sessions.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Docker](https://www.docker.com/) running locally
- The `casita` Docker image (see [Building the Image](#building-the-image))

## Building the Image

From the project root (one level above `cli/`):

```sh
./build.sh
```

This builds the `casita` Docker image from `casita.dockerfile`.

## Installing the CLI

```sh
cd cli
npm install
npm run build
npm link
```

After linking, the `casita` command is available globally.

For development without linking:

```sh
npm run dev -- <command>
# e.g.
npm run dev -- run
npm run dev -- list
```

## Commands

### `casita run [name]`

Start or resume a casita. Casitas are persistent — exiting and running again from the same directory reattaches to the same container.

```sh
# Auto-assigns a name, binds to current workspace
casita run

# Explicit name (allows multiple casitas per workspace)
casita run my-experiment

# Pin a specific host port for noVNC
casita run -p 8080

# Pass args to the container command (claude) after --
casita run -- --resume
```

**Behavior:**
- **No existing casita** for the workspace → creates a new container
- **Stopped casita** found → restarts and reattaches (`docker start -ai`)
- **Running casita** found → opens a new shell (`docker exec -it`)

Options:
| Flag | Description |
|------|-------------|
| `-p, --port <port>` | Host port for noVNC (auto-assigned if omitted) |
| `-i, --image <image>` | Docker image name (default: `casita`) |

### `casita list`

List all casitas (running and stopped).

```sh
casita list

# Show only running casitas
casita list --running
```

Output:

```
NAME       PORT   WORKSPACE                STATUS
wise-cat   8080   /Users/aaron/my-project  Up 2 hours
bold-fox   --     /Users/aaron/other       Exited (0) 3 days ago
```

### `casita rm <name>`

Remove a casita container.

```sh
casita rm wise-cat

# Skip confirmation
casita rm wise-cat --force

# Also delete the persisted home directory on disk
casita rm wise-cat --force --clean
```

Options:
| Flag | Description |
|------|-------------|
| `-f, --force` | Skip confirmation prompt |
| `--clean` | Also delete `.casitas/<name>/home/` on disk |

### `casita browser [name]`

Open the noVNC web interface for a running casita.

```sh
# Inferred if only one casita is running
casita browser

# By name
casita browser wise-cat
```

## How Persistence Works

- **Workspace affinity:** Each casita is labeled with the host directory it was started from. Running `casita run` from the same directory always reconnects to the same container.
- **Container persistence:** Containers are created without `--rm`, so system-level changes (apt installs, global configs) survive across sessions.
- **Home directory:** `/home/claude` is bind-mounted from `.casitas/<name>/home/` on the host, so user files persist even if the container is removed.
- **Workspace mount:** The host working directory is mounted at `/workspace` inside the container.
