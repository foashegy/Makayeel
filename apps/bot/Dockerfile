# ─── Stage 1: deps & build ───────────────────────────────────────────────
FROM node:20-slim AS builder

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# Copy monorepo manifests first for cache.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/db/package.json packages/db/
COPY packages/i18n/package.json packages/i18n/
COPY packages/config/package.json packages/config/
COPY apps/bot/package.json apps/bot/

RUN pnpm install --frozen-lockfile

COPY packages/db packages/db
COPY packages/i18n packages/i18n
COPY packages/config packages/config
COPY apps/bot apps/bot
COPY tsconfig.base.json .

RUN pnpm --filter @makayeel/db generate
# Skip tsc build — run with tsx at runtime to match dev behaviour.

# ─── Stage 2: runtime ────────────────────────────────────────────────────
FROM node:20-slim AS runner

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates tzdata && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Africa/Cairo

COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/i18n ./packages/i18n
COPY --from=builder /app/apps/bot ./apps/bot
COPY --from=builder /app/node_modules ./node_modules

# Prisma client must exist in the runtime layer
RUN pnpm --filter @makayeel/db generate

WORKDIR /app/apps/bot
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
