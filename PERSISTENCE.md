# Persistence Options for Casita

## Options

### 1. Named Volumes
Mount Docker volumes to key directories (`/home/user`, `/var/lib/apt`, etc.).
- Simple, native Docker, easy to reset (`docker volume rm`)
- Doesn't capture system-wide changes (e.g. `apt install` modifying `/usr/bin`)

### 2. `docker commit` Snapshots
Snapshot the container as a new image after a session.
```bash
docker commit casita-container casita-image:session-3
```
- Captures everything — installed packages, system config, all files
- Images grow over time

### 3. Stop/Start (simplest VM-like behavior)
Use `docker start`/`docker stop` instead of `docker run`/`docker rm`.
- All filesystem state persists between start/stop
- No branching/snapshots without `docker commit`

### 4. Hybrid (recommended)
Combine stop/start for daily use, named volume for `/home/user`, and `docker commit` for checkpoints.

| Layer | Method | Captures |
|-------|--------|----------|
| User workspace | Named volume on `/home/user` | Files, dotfiles, project data |
| Installed tools | `docker commit` snapshots | apt/npm packages, system config |
| Reset | Run from base image + fresh volumes | Clean slate |

```bash
# Normal session
docker start casita

# Checkpoint
docker commit casita casita:checkpoint-1

# Reset to clean
docker rm casita
docker run --name casita -v workspace:/home/user casita:latest

# Reset to checkpoint
docker rm casita
docker run --name casita -v workspace:/home/user casita:checkpoint-1
```
