# syntax = docker/dockerfile:1

# Ever Teams Platform

ARG NODE_VERSION=24.14.0
ARG NEXT_IGNORE_ESLINT_ERROR_ON_BUILD=true
ARG RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED=false
ARG IS_DESKTOP_APP=false
ARG NEXT_PUBLIC_BUILD_VERSION
ARG NEXT_PUBLIC_BUILD_SHA

# NOTE: this image is built ONCE and configured at RUNTIME. Deployment-specific values (API URL,
# reCAPTCHA/hCaptcha/Turnstile keys, analytics keys, branding, board/meet endpoints, secrets, ...)
# are deliberately NOT build arguments: Next.js inlines any NEXT_PUBLIC_* value present at build time
# into the client AND server bundles, which froze them into every published image. Pass them with
# `docker run -e ...` / compose `environment:` / a k8s Secret instead - see .env.docker for the list.
# Only build identity (NEXT_PUBLIC_BUILD_VERSION/SHA) and build tooling knobs remain build arguments.

FROM node:${NODE_VERSION}-slim AS base

LABEL maintainer='ever@ever.co'
LABEL org.opencontainers.image.source='https://github.com/ever-co/ever-teams'

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_BUILD_OUTPUT_TYPE=standalone
ENV NEXT_SHARP_PATH=/temp/node_modules/sharp

RUN npm i -g npm@9

# Pre-install Sharp for Next.js image optimization support
RUN mkdir /temp && cd /temp && npm i sharp

RUN npm cache clean --force

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
	apt-get install -y build-essential pkg-config python-is-python3

# Install Yarn
RUN npm install -g yarn --force

# --- STEP 1: Copy only lockfiles and manifests for dependency resolution ---
COPY package.json yarn.lock ./

COPY packages/constants/package.json packages/constants/package.json
# constants/utils/services depend on @ever-teams/toolkit-types, so its manifest
# must be present for the workspace-aware `yarn install --frozen-lockfile` below.
COPY packages/toolkit-types/package.json packages/toolkit-types/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/services/package.json packages/services/package.json
COPY packages/hooks/package.json packages/hooks/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/ts-config/package.json packages/ts-config/package.json
COPY apps/web/package.json ./apps/web/package.json

# Set working directory to the web app
WORKDIR /app/apps/web

# Configure the npm registry: prefer the internal Verdaccio cache (VERDACCIO_REGISTRY build-arg, anonymous).
# Empty (e.g. a fork) → public npm. The yarn.lock rewrite is best-effort (non-fatal) so a path mismatch
# degrades to public downloads rather than breaking the build. The registry URL is not a credential, so it
# stays a build arg; the packages.ever.co token is a BuildKit secret instead (STEP 2).
ARG VERDACCIO_REGISTRY=""
RUN if [ -n "$VERDACCIO_REGISTRY" ]; then \
		echo "registry=${VERDACCIO_REGISTRY}" >> /app/.npmrc && \
		printf 'registry "%s"\n' "${VERDACCIO_REGISTRY}" >> /app/.yarnrc && \
		{ sed -i "s|https://registry.yarnpkg.com|${VERDACCIO_REGISTRY%/}|g; s|https://registry.npmjs.org|${VERDACCIO_REGISTRY%/}|g" /app/yarn.lock 2>/dev/null || true; }; \
	fi

# --- STEP 2: Install deps in deterministic and cacheable way ---
# The legacy packages.ever.co credential arrives as a BuildKit secret, NEVER a build arg: a build arg is
# readable in `docker history`, is recorded in SLSA provenance, and any layer written from it is published
# the moment cache-to switches to mode=max. The auth line is appended to /app/.npmrc and the file removed
# inside this same RUN, so no committed layer ever carries the token. The secret is optional: with none
# (forks, self-hosters, `docker compose build`) the install falls through to the public registry.
#   docker build --secret id=verdaccio_token,env=VERDACCIO_TOKEN -f .deploy/web/Dockerfile .
RUN --mount=type=secret,id=verdaccio_token \
	set -e; \
	if [ -s /run/secrets/verdaccio_token ]; then \
		printf '//packages.ever.co/:_authToken=%s\n' "$(cat /run/secrets/verdaccio_token)" >> /app/.npmrc; \
	fi; \
	yarn install --network-timeout 1000000 --frozen-lockfile --non-interactive --ignore-scripts; \
	rm -f /app/.npmrc

# --- STEP 3: Copy the rest of the repo for build ---
WORKDIR /app
COPY . .

ENV CI=true

# We make NODE_ENV and other build-only settings passed as build argument available in this stage.
# Do NOT add deployment-specific values here (see the note at the top of this file): an `ENV X=${X}`
# line defines X even when the build arg is not passed (as ""), and Next.js then inlines that "" into
# the bundles, so the container env could never override it.
ARG NODE_ENV
ARG ANALYZE
ARG NODE_OPTIONS
ARG NEXT_PUBLIC_BUILD_VERSION
ARG NEXT_PUBLIC_BUILD_SHA
# Build-time only: the next/image optimizer allowlist (next.config.js images.remotePatterns) is frozen
# into the standalone server at build. Extra hosts can still be allowed at RUNTIME with the same
# variable - they are then served without optimization (see proxy.ts handleImageRequest).
ARG NEXT_PUBLIC_IMAGES_HOSTS

ENV NODE_OPTIONS=${NODE_OPTIONS:-"--max-old-space-size=60000"}
ENV NODE_ENV=${NODE_ENV:-production}
ENV NEXT_IGNORE_ESLINT_ERROR_ON_BUILD=true
ENV IS_DESKTOP_APP=false
ENV ANALYZE=${ANALYZE:-false}
ENV NEXT_PUBLIC_BUILD_VERSION=${NEXT_PUBLIC_BUILD_VERSION}
ENV NEXT_PUBLIC_BUILD_SHA=${NEXT_PUBLIC_BUILD_SHA}
ENV NEXT_PUBLIC_IMAGES_HOSTS=${NEXT_PUBLIC_IMAGES_HOSTS}

ENV IS_DOCKER=true

# --- STEP 4: Build the web application ---
RUN yarn run build:web

# --- STEP 5: Remove dev dependencies and clean cache --- Remove dev dependencies (to reduce final image size)
WORKDIR /app/apps/web
RUN yarn install --network-timeout 1000000 --prod --ignore-scripts
RUN yarn cache clean

# ------------------------------------------------------------------------------
# Runtime stage: lightweight image that serves the built application
# ------------------------------------------------------------------------------

FROM base

# Copy build artifacts from the previous stage
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

# We make NODE_ENV and other env vars passed as build argument to be available in this stage
ARG NODE_ENV
ARG NEXT_PUBLIC_DEMO
ARG ANALYZE
ARG NODE_OPTIONS

ENV NODE_OPTIONS=${NODE_OPTIONS:-"--max-old-space-size=1536"}
ENV NODE_ENV=${NODE_ENV:-production}
ENV NEXT_IGNORE_ESLINT_ERROR_ON_BUILD=true
ENV NEXT_PUBLIC_DEMO=${NEXT_PUBLIC_DEMO:-false}
ENV IS_DESKTOP_APP=false
ENV ANALYZE=${ANALYZE:-false}

ENV IS_DOCKER=true

# Runtime defaults (all overridable with `docker run -e ...`) for the values the previous image baked in
# regardless of the deployment (deployment-specific values - API URL, keys, board/meet endpoints - have
# no default here and must be set by each deployment):
# - NEXT_PUBLIC_ACTIVE_LOCAL_LOG_SYSTEM / NEXT_PUBLIC_LOG_FOLDER_MAX_SIZE / NEXT_PUBLIC_DISABLE_AUTO_REFRESH:
#   the old build-stage defaults.
# - NEXT_PUBLIC_{GOOGLE,FACEBOOK,TWITTER,GITHUB}_APP_NAME: were defined at build (empty, or 'ever-github'
#   for GitHub), which advertises those social logins (core/lib/utils/check-provider-env-vars.ts); a
#   provider still only appears once its *_CLIENT_ID and *_CLIENT_SECRET are set. The GitHub integration
#   (install a GitHub App) stays disabled until a deployment sets NEXT_PUBLIC_GITHUB_APP_NAME to its own app.
ENV NEXT_PUBLIC_ACTIVE_LOCAL_LOG_SYSTEM=false
ENV NEXT_PUBLIC_LOG_FOLDER_MAX_SIZE=10
ENV NEXT_PUBLIC_DISABLE_AUTO_REFRESH=false
ENV NEXT_PUBLIC_GOOGLE_APP_NAME=""
ENV NEXT_PUBLIC_FACEBOOK_APP_NAME=""
ENV NEXT_PUBLIC_TWITTER_APP_NAME=""
ENV NEXT_PUBLIC_GITHUB_APP_NAME=""

# Default port for the web server
EXPOSE 3030
ENV PORT=3030

# Start Next.js server
CMD ["node", "./apps/web/server.js"]
