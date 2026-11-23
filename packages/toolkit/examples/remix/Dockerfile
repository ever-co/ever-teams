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

RUN yarn turbo run build --filter=@ever-teams/example-remix
# Pruned production install: the packages the server bundle leaves external (Vite bundles the linked
# workspace packages into it) plus remix-serve, with their dependencies, copied from the install above.
RUN node .deploy/examples/copy-runtime-deps.mts --root /app --app /app/packages/toolkit/examples/remix \
	--out /runtime --scan /app/packages/toolkit/examples/remix/build/server @remix-run/serve

# Runtime: the build output and that pruned node_modules only. Shipping the build stage (the whole
# monorepo and its full install) made this image ~1.7 GB compressed, several GB on every worker.
FROM node:${NODE_VERSION}-slim AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /runtime/ ./
# package.json: `"type": "module"` makes Node load build/server/index.js as ESM.
COPY --from=build --chown=node:node /app/packages/toolkit/examples/remix/package.json ./packages/toolkit/examples/remix/
COPY --from=build --chown=node:node /app/packages/toolkit/examples/remix/build ./packages/toolkit/examples/remix/build
# remix-serve serves build/client relative to the working directory.
WORKDIR /app/packages/toolkit/examples/remix
USER node
EXPOSE 3000
CMD ["node", "/app/node_modules/@remix-run/serve/dist/cli.js", "./build/server/index.js"]
