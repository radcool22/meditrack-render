# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.server.json remotion.config.ts ./
COPY src/ src/
COPY server/ server/
COPY prompts/ prompts/

RUN npx tsc -p tsconfig.server.json

# ── Stage 2: runtime ────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

# Remotion needs Chromium + ffmpeg at render time
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      chromium ffmpeg curl ca-certificates \
      fonts-noto fonts-noto-color-emoji && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Compiled server code
COPY --from=builder /app/dist/ dist/

# Source files — Remotion's bundle() compiles these at render time
COPY src/ src/
COPY remotion.config.ts ./
COPY public/ public/
COPY prompts/ prompts/

# Non-code assets read by the server at runtime
COPY server/safety/ server/safety/

# Restart-on-crash supervisor — see scripts/docker-entrypoint.sh
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN useradd -m -u 1001 nodeapp && chown -R nodeapp:nodeapp /app
USER nodeapp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -f http://localhost:3000/healthz || exit 1

CMD ["/app/docker-entrypoint.sh"]
