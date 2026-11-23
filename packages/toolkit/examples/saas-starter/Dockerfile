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
# No deployment value in the build stage: Next inlines NEXT_PUBLIC_* into the client AND server
# bundles, so anything set here would be frozen into the image. Configure at runtime instead
# (docker run -e NEXT_PUBLIC_TEAMS_API_URL=... -e NEXT_PUBLIC_APP_URL=...).
# next.config reads NEXT_BUILD_OUTPUT_TYPE (as apps/web does): `standalone` makes the build trace the files
# its server loads into .next/standalone, so the runtime stage below needs neither the monorepo nor its
# install. Not a deployment value: NEXT_PUBLIC_* stay runtime reads (readRuntimeEnv).
ENV NEXT_BUILD_OUTPUT_TYPE=standalone
RUN yarn turbo run build --filter=@ever-teams/example-saas-starter

# next/image needs sharp, and the monorepo install cannot provide one that loads. Storybook and plasmo pin
# sharp 0.33, so yarn nests the libvips of Next's sharp (0.35) where the sharp binary's rpath does not
# look, and /_next/image would serve the original files. Install the version Next resolves, flat, with npm
# (apps/web's image also installs its sharp with npm); the runtime stage lays it over the traced copy.
# sharp's `exports` hides ./package.json, so the version is read from the folder its entry resolves to.
RUN cd packages/toolkit/examples/saas-starter \
	&& version="$(node -p "const path = require('node:path'); \
		let dir = path.dirname(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] })); \
		while (path.basename(dir) !== 'sharp' && dir !== path.dirname(dir)) dir = path.dirname(dir); \
		JSON.parse(require('node:fs').readFileSync(path.join(dir, 'package.json'), 'utf8')).version")" \
	&& mkdir /sharp && cd /sharp \
	&& npm install --omit=dev --no-save --no-package-lock --no-audit --no-fund --ignore-scripts "sharp@${version}" \
	&& npm cache clean --force

# The deployment's init container runs `yarn db:migrate` (drizzle-kit migrate) from this image's WORKDIR,
# which the standalone server does not need. Install only drizzle-kit, drizzle-orm and the postgres
# driver, at the ranges saas-starter declares and the versions the monorepo yarn.lock pins.
FROM node:${NODE_VERSION}-slim AS migrate-deps
# Yarn classic (the monorepo's package manager), pinned to its latest release, without install scripts.
ARG YARN_VERSION=1.22.22
RUN npm install -g --ignore-scripts yarn@${YARN_VERSION}
WORKDIR /deps
COPY yarn.lock ./
COPY packages/toolkit/examples/saas-starter/package.json ./app.package.json
RUN node -e "const app = require('./app.package.json'); \
		const names = ['drizzle-kit', 'drizzle-orm', 'postgres']; \
		const dependencies = Object.fromEntries(names.map((name) => [name, app.dependencies[name]])); \
		require('node:fs').writeFileSync('package.json', JSON.stringify({ private: true, dependencies }));" \
	&& yarn install --production --frozen-lockfile --non-interactive --ignore-scripts --network-timeout 1000000 \
	&& yarn cache clean

# Runtime: the traced server, its static assets and public/ only. Shipping the build stage (the whole
# monorepo and its full install) made each demo image ~1.8 GB compressed, several GB on every worker.
FROM node:${NODE_VERSION}-slim AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/packages/toolkit/examples/saas-starter/.next/standalone ./
COPY --from=build --chown=node:node /app/packages/toolkit/examples/saas-starter/.next/static ./packages/toolkit/examples/saas-starter/.next/static
COPY --from=build --chown=node:node /app/packages/toolkit/examples/saas-starter/public ./packages/toolkit/examples/saas-starter/public
# The flat sharp from the build stage (see there), checked the way Next loads it, so a broken sharp fails
# the image build instead of every /_next/image request.
COPY --from=build --chown=node:node /sharp/node_modules/sharp /app/node_modules/sharp
COPY --from=build --chown=node:node /sharp/node_modules/@img /app/node_modules/@img
RUN node -e "require(require.resolve('sharp', { paths: ['/app/node_modules/next'] }))"
# Migrations: `yarn db:migrate` needs yarn (the slim image has none), drizzle-kit, its config and the SQL.
ARG YARN_VERSION=1.22.22
RUN npm install -g --ignore-scripts yarn@${YARN_VERSION} && npm cache clean --force
COPY --from=migrate-deps --chown=node:node /deps/node_modules ./packages/toolkit/examples/saas-starter/node_modules
COPY --from=build --chown=node:node /app/packages/toolkit/examples/saas-starter/package.json /app/packages/toolkit/examples/saas-starter/drizzle.config.ts ./packages/toolkit/examples/saas-starter/
COPY --from=build --chown=node:node /app/packages/toolkit/examples/saas-starter/lib/db/migrations ./packages/toolkit/examples/saas-starter/lib/db/migrations
WORKDIR /app/packages/toolkit/examples/saas-starter
USER node
EXPOSE 3000
CMD ["node", "server.js"]
