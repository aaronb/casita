FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV RESOLUTION=1280x1024x24
ENV VNC_PORT=5900
ENV NOVNC_PORT=6080

# System dependencies: display pipeline, utilities, fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb x11vnc novnc websockify \
    fonts-liberation fonts-noto-color-emoji \
    dbus dbus-x11 \
    curl git sudo procps xdg-utils ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22.x LTS via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Non-root user with passwordless sudo
RUN useradd -m -s /bin/bash claude \
    && echo "claude ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER claude
WORKDIR /home/claude

# Claude Code CLI
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/claude/.local/bin:${PATH}"

# Pre-cache Playwright MCP, then install Chromium using its bundled playwright
# (must use the same playwright version MCP depends on, or it won't find the browser)
RUN npx -y @playwright/mcp@latest --help || true
RUN PLAYWRIGHT_CLI=$(find ~/.npm/_npx -path "*/playwright/cli.js" | head -1) && \
    node "$PLAYWRIGHT_CLI" install --with-deps chromium

# MCP configuration — user-scope Playwright MCP server (stored in ~/.claude.json)
# "--no-sandbox disables Chromium's security sandbox, required when running inside Docker where namespace/setuid sandboxing is unavailable",
RUN cat > /home/claude/.claude.json << 'EOF'
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--browser", "chromium", "--no-sandbox"],
      "env": {
        "DISPLAY": ":99"
      }
    }
  }
}
EOF

EXPOSE 6080

COPY --chmod=755 entrypoint.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]
CMD ["bash"]
