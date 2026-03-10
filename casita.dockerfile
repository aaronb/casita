FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV RESOLUTION=1280x1024x24
ENV VNC_PORT=5900
ENV NOVNC_PORT=6080

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Process init — lightweight PID 1 for proper signal handling
    tini \
    # Virtual display & VNC — headless X server with browser-accessible remote desktop
    xvfb x11vnc novnc websockify \
    # Fonts — ensure readable text rendering in browser and document tools
    fonts-liberation fonts-noto-color-emoji \
    # D-Bus — inter-process messaging required by Chromium and desktop services
    dbus dbus-x11 \
    # Process manager — runs Xvfb, VNC, and other background services
    supervisor \
    # Core utilities — networking, version control, privilege escalation, process inspection
    curl wget git sudo procps xdg-utils ca-certificates \
    # CLI essentials — file identification, JSON processing, search, archives, paging
    file jq ripgrep tree less unzip zip make openssh-client sqlite3 \
    # Python runtime
    python3 python3-pip python3-venv \
    # PDF tools — CLI utilities for splitting, merging, converting, and inspecting PDFs
    poppler-utils ghostscript qpdf \
    # Cairo/Pango rendering libs — used by Python PDF and graphics libraries
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 \
    # Image tools — convert/magick (ImageMagick), heif-convert (HEIC→JPEG/PNG), cwebp/dwebp
    imagemagick libheif-examples webp \
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

# Python PDF libraries (installed globally via pipx-style break-system-packages)
RUN pip3 install --break-system-packages \
    pypdf pymupdf pdfplumber reportlab fpdf2 pikepdf camelot-py[cv] tabula-py \
    openpyxl xlsxwriter python-calamine xlrd odfpy pandas

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
{
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

# Save build-time home contents to skeleton dir for first-run seeding
RUN sudo mkdir -p /etc/skel-claude && sudo cp -a /home/claude/. /etc/skel-claude/

EXPOSE 6080

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY --chmod=755 entrypoint.sh /usr/local/bin/entrypoint.sh

WORKDIR /workspace

ENTRYPOINT ["tini", "--", "entrypoint.sh"]
CMD ["claude"]
