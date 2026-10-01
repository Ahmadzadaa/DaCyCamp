# DaCy API — docker compose --profile full
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @dacy/shared build && pnpm --filter @dacy/api prisma:generate && pnpm --filter @dacy/api build

FROM base AS run
WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/with-env.mjs tsx prisma/seed.ts && node dist/main.js"]
