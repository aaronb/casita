#!/bin/bash
set -e

export PATH="$HOME/.local/bin:$PATH"

# Clean shutdown
cleanup() {
    echo "Shutting down services..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup SIGTERM SIGINT

# 1. D-Bus daemon (Chromium needs it)
if [ -f /run/dbus/pid ]; then
    rm -f /run/dbus/pid
fi
sudo dbus-daemon --system --fork 2>/dev/null || true

# 2. Xvfb virtual framebuffer
sudo mkdir -p /tmp/.X11-unix && sudo chmod 1777 /tmp/.X11-unix
Xvfb $DISPLAY -screen 0 $RESOLUTION -ac +extension GLX +render -noreset &
sleep 1

# 3. x11vnc — VNC server attached to the virtual display
x11vnc -display $DISPLAY -forever -shared -nopw -rfbport $VNC_PORT -q &
sleep 0.5

# 4. noVNC via websockify — web frontend proxying to VNC
websockify --web /usr/share/novnc $NOVNC_PORT localhost:$VNC_PORT &
sleep 0.5

echo "============================================"
echo " noVNC running at: http://localhost:${NOVNC_PORT}/vnc.html"
echo "============================================"

# 5. Run the provided command (defaults to bash via CMD)
exec "$@"
