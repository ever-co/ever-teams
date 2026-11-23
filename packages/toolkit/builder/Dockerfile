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
RUN yarn turbo run build --filter=@ever-teams/builder

# next/image needs sharp, and the monorepo install cannot provide one that loads. Storybook and plasmo pin
# sharp 0.33, so yarn nests the libvips of Next's sharp (0.35) where the sharp binary's rpath does not
# look, and /_next/image would serve the original files. Install the version Next resolves, flat, with npm
# (apps/web's image also installs its sharp with npm); the runtime stage lays it over the traced copy.
# sharp's `exports` hides ./package.json, so the version is read from the folder its entry resolves to.
RUN cd packages/toolkit/builder \
	&& version="$(node -p "const path = require('node:path'); \
		let dir = path.dirname(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] })); \
		while (path.basename(dir) !== 'sharp' && dir !== path.dirname(dir)) dir = path.dirname(dir); \
		JSON.parse(require('node:fs').readFileSync(path.join(dir, 'package.json'), 'utf8')).version")" \
	&& mkdir /sharp && cd /sharp \
	&& npm install --omit=dev --no-save --no-package-lock --no-audit --no-fund --ignore-scripts "sharp@${version}" \
	&& npm cache clean --force

# Runtime: the traced server, its static assets and public/ only. Shipping the build stage (the whole
# monorepo and its full install) made each demo image ~1.8 GB compressed, several GB on every worker.
FROM node:${NODE_VERSION}-slim AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/packages/toolkit/builder/.next/standalone ./
COPY --from=build --chown=node:node /app/packages/toolkit/builder/.next/static ./packages/toolkit/builder/.next/static
COPY --from=build --chown=node:node /app/packages/toolkit/builder/public ./packages/toolkit/builder/public
# The flat sharp from the build stage (see there), checked the way Next loads it, so a broken sharp fails
# the image build instead of every /_next/image request.
COPY --from=build --chown=node:node /sharp/node_modules/sharp /app/node_modules/sharp
COPY --from=build --chown=node:node /sharp/node_modules/@img /app/node_modules/@img
RUN node -e "require(require.resolve('sharp', { paths: ['/app/node_modules/next'] }))"
WORKDIR /app/packages/toolkit/builder
USER node
EXPOSE 3000
CMD ["node", "server.js"]
