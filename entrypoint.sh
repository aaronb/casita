#!/bin/bash
set -e

export PATH="$HOME/.local/bin:$PATH"

# Seed home directory from skeleton on first run (no-clobber is safe to re-run)
if [ ! -f "$HOME/.initialized" ]; then
    echo "Seeding home directory from skeleton..."
    cp -a --no-clobber /etc/skel-claude/. "$HOME/"
    touch "$HOME/.initialized"
fi

# Clean shutdown
cleanup() {
    # Sync credentials back to shared location
    if [ -f "$LOCAL_CREDS" ] && [ -d "$HOME/.casita-shared" ]; then
        cp "$LOCAL_CREDS" "$SHARED_CREDS" 2>/dev/null || true
    fi
    echo "Shutting down services..."
    supervisorctl -c /etc/supervisor/conf.d/supervisord.conf shutdown 2>/dev/null || true
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Shared Claude credentials: copy in before start, sync back on exit.
# The shared config dir is mounted at ~/.casita-shared by the CLI.
SHARED_CREDS="$HOME/.casita-shared/.credentials.json"
LOCAL_CREDS="$HOME/.claude/.credentials.json"

trap cleanup SIGTERM SIGINT EXIT

# Log directory for background services
mkdir -p /tmp/casita-logs

# D-Bus daemon (Chromium needs it)
if [ -f /run/dbus/pid ]; then
    rm -f /run/dbus/pid
fi
sudo dbus-daemon --system --fork 2>/dev/null || true
sudo mkdir -p /tmp/.X11-unix && sudo chmod 1777 /tmp/.X11-unix

echo "============================================"
echo " noVNC running at: http://localhost:${NOVNC_PORT}/vnc.html"
echo "============================================"

# Start background services via supervisord (daemonized)
supervisord -c /etc/supervisor/conf.d/supervisord.conf

# Seed local credentials from shared if this casita doesn't have its own
if [ -d "$HOME/.casita-shared" ]; then
    mkdir -p "$HOME/.claude"
    if [ ! -f "$LOCAL_CREDS" ] && [ -s "$SHARED_CREDS" ]; then
        cp "$SHARED_CREDS" "$LOCAL_CREDS"
        echo "Loaded shared Claude credentials."
    fi
    # Ensure settings.json exists so Claude Code doesn't show first-run onboarding
    if [ ! -f "$HOME/.claude/settings.json" ]; then
        echo '{}' > "$HOME/.claude/settings.json"
    fi
    # Mark onboarding as complete so Claude Code skips the first-run flow
    if [ -s "$SHARED_CREDS" ] && [ -f "$HOME/.claude.json" ]; then
        if ! grep -q '"hasCompletedOnboarding"' "$HOME/.claude.json"; then
            python3 -c "
import json, sys
with open(sys.argv[1], 'r') as f:
    d = json.load(f)
d['hasCompletedOnboarding'] = True
d['numStartups'] = d.get('numStartups', 0) + 1
with open(sys.argv[1], 'w') as f:
    json.dump(d, f, indent=2)
" "$HOME/.claude.json" || echo "Warning: could not update onboarding flag"
        fi
    fi
fi

# Run the provided command (defaults to bash via CMD)
"$@"
