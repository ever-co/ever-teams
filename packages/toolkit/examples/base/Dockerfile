# syntax=docker/dockerfile:1
ARG NODE_VERSION=26.12.1
FROM node:${NODE_VERSION}-slim AS build
ENV NODE_OPTIONS="--max-old-space-size=8192" CI=true NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -qq && apt-get install -y build-essential pkg-config python-is-python3 git && rm -rf /var/lib/apt/lists/*
RUN npm install -g yarn --force
WORKDIR /app
COPY . .
# Drop the yarn cache in the SAME layer as the install: it holds every platform variant of the native
# packages (GBs), and exporting a layer that still carries it overflows the CI runner's 24Gi docker volume.
RUN yarn install --network-timeout 1000000 --frozen-lockfile --non-interactive --ignore-scripts && yarn cache clean
# next.config reads NEXT_BUILD_OUTPUT_TYPE (as apps/web does): `standalone` makes the build trace the files
# its server loads into .next/standalone, so the runtime stage below needs neither the monorepo nor its
# install. Not a deployment value: NEXT_PUBLIC_* stay runtime reads (readRuntimeEnv).
ENV NEXT_BUILD_OUTPUT_TYPE=standalone
RUN yarn turbo run build --filter=@ever-teams/example-base

# Runtime: the traced server, its static assets and public/ only. Shipping the build stage (the whole
# monorepo and its full install) made each demo image ~1.8 GB compressed, several GB on every worker.
FROM node:${NODE_VERSION}-slim AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/packages/toolkit/examples/base/.next/standalone ./
COPY --from=build --chown=node:node /app/packages/toolkit/examples/base/.next/static ./packages/toolkit/examples/base/.next/static
COPY --from=build --chown=node:node /app/packages/toolkit/examples/base/public ./packages/toolkit/examples/base/public
WORKDIR /app/packages/toolkit/examples/base
USER node
EXPOSE 3000
CMD ["node", "server.js"]
