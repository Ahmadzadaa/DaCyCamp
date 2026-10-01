# DaCy Web — docker compose --profile full
FROM node:22-alpine AS build
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/web apps/web
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN pnpm --filter @dacy/shared build && pnpm --filter @dacy/web build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
