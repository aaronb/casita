#!/bin/bash
set -e

export PATH="$HOME/.local/bin:$PATH"

# Clean shutdown
cleanup() {
    echo "Shutting down services..."
    supervisorctl -c /etc/supervisor/conf.d/supervisord.conf shutdown 2>/dev/null || true
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup SIGTERM SIGINT

# Log directory for background services
mkdir -p /tmp/sandbox-logs

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

# Run the provided command (defaults to bash via CMD)
exec "$@"
