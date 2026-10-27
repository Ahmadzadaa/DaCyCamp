# syntax=docker/dockerfile:1
# Local Docker Desktop runtime, native amd64 and arm64.
FROM node:24-trixie-slim
ENV COREPACK_HOME=/opt/corepack
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates openssl python3 python3-venv bubblewrap util-linux libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /lib64 /data/storage /data/mail \
    && chown -R node:node /data \
    && corepack enable
WORKDIR /app
# .dockerignore excludes local secrets, databases, storage and host dependencies.
# Copy before dependency installation to avoid repeatedly snapshotting large trees.
COPY . .
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    API_INTERNAL_URL=http://api:4000 \
    NEXT_PUBLIC_LEGACY_LABS=false
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then \
      export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca PIP_CERT=/run/secrets/proxy_ca; \
    fi; \
    export NODE_USE_ENV_PROXY=1; \
    python3 -m venv /opt/dacy-python \
    && /opt/dacy-python/bin/pip install --no-cache-dir -r ops/python-requirements.txt \
    && corepack pnpm install --frozen-lockfile \
    && corepack pnpm build \
    && cp -a apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static \
    && cp -a apps/web/public apps/web/.next/standalone/apps/web/public \
    && mkdir -p .local && chown node:node .local \
    && chown -R node:node apps/web/.next/standalone/apps/web \
    && chmod -R a+rX /app /opt/corepack \
    && rm -rf /root/.cache /root/.local/share/pnpm/store apps/web/.next/cache .turbo
ENV NODE_ENV=production \
    PYTHON_BIN=/opt/dacy-python/bin/python \
    PYTHON_SANDBOX_BIN=/usr/bin/bwrap \
    STORAGE_DIR=/data/storage
USER node
EXPOSE 3000 4000
