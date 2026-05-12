# syntax=docker/dockerfile:1.7
# Canonical Dockerfile — Next.js (Bun) + Elysia + worker.
# Build args:
#   PORT=3001 (default, used by docker-compose.yml)
#   BUN_VERSION=1.3
ARG BUN_VERSION=1.3
ARG PORT=3001

FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile || bun install

FROM oven/bun:${BUN_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM oven/bun:${BUN_VERSION} AS migrate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock* drizzle.config.ts tsconfig.json ./
COPY drizzle ./drizzle
COPY src ./src
ENV NODE_ENV=production
CMD ["sh", "-c", "bun run db:migrate && (bun run src/db/seed.ts || true)"]

FROM oven/bun:${BUN_VERSION}-slim AS runner
ARG PORT
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=${PORT} \
    HOSTNAME=0.0.0.0
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg ca-certificates curl tini && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*.deb
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock* ./
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src ./src
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --production --frozen-lockfile || bun install --production
EXPOSE ${PORT}
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -fsS "http://localhost:${PORT}/api/health" || exit 1
ENTRYPOINT ["tini", "--"]
CMD ["bun", "run", "start"]
