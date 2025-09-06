# syntax = docker/dockerfile:1

# Ever Teams Platform

ARG NODE_VERSION=22.18.0
ARG NEXT_PUBLIC_GAUZY_API_SERVER_URL=https://api.ever.team
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_CAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_DISABLE_AUTO_REFRESH=false
ARG NEXT_PUBLIC_COOKIE_DOMAINS=ever.team
ARG NEXT_PUBLIC_BOARD_APP_DOMAIN=https://board.ever.team
ARG NEXT_PUBLIC_BOARD_BACKEND_POST_URL=https://jsonboard.ever.team/api/v2/post/
ARG NEXT_PUBLIC_BOARD_FIREBASE_CONFIG
ARG NEXT_PUBLIC_MEET_DOMAIN=https://meet.ever.team
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_DEBUG
ARG NEXT_PUBLIC_JITSU_BROWSER_URL
ARG NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY
ARG NEXT_PUBLIC_GITHUB_APP_NAME=ever-github
ARG NEXT_PUBLIC_CHATWOOT_API_KEY
ARG NEXT_IGNORE_ESLINT_ERROR_ON_BUILD=true

FROM node:${NODE_VERSION}-slim AS base

# Output the environment variable value (debug)
ARG NEXT_PUBLIC_GAUZY_API_SERVER_URL
RUN echo "NEXT_PUBLIC_GAUZY_API_SERVER_URL=${NEXT_PUBLIC_GAUZY_API_SERVER_URL}"

LABEL maintainer="ever@ever.co"
LABEL org.opencontainers.image.source="https://github.com/ever-co/ever-teams"

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

# We make env vars passed as build argument to be available in this build stage because we prebuild the NextJs app
ARG NEXT_PUBLIC_GAUZY_API_SERVER_URL
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_CAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_DISABLE_AUTO_REFRESH
ARG NEXT_PUBLIC_COOKIE_DOMAINS
ARG NEXT_PUBLIC_BOARD_APP_DOMAIN
ARG NEXT_PUBLIC_BOARD_BACKEND_POST_URL
ARG NEXT_PUBLIC_BOARD_FIREBASE_CONFIG
ARG NEXT_PUBLIC_MEET_DOMAIN
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_DEBUG
ARG NEXT_PUBLIC_JITSU_BROWSER_URL
ARG NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY
ARG NEXT_PUBLIC_GITHUB_APP_NAME
ARG NEXT_PUBLIC_CHATWOOT_API_KEY

# Install packages needed to build node modules
RUN apt-get update -qq && \
	apt-get install -y build-essential pkg-config python-is-python3

# Install Yarn
RUN npm install -g yarn --force

# --- STEP 1: Copy only lockfiles and manifests for dependency resolution ---
COPY package.json yarn.lock ./

COPY packages/constants/package.json packages/constants/package.json
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

# --- STEP 2: Install deps in deterministic and cacheable way ---
RUN yarn install --frozen-lockfile --non-interactive --ignore-scripts

# --- STEP 3: Copy the rest of the repo for build ---
WORKDIR /app
COPY . .

# Set production env
ENV NODE_ENV=production
ENV NEXT_IGNORE_ESLINT_ERROR_ON_BUILD=true

# --- STEP 4: Build the web application ---
RUN yarn run build:web

# --- STEP 5: Remove dev dependencies and clean cache --- Remove dev dependencies (to reduce final image size)
WORKDIR /app/apps/web
RUN yarn install --prod --ignore-scripts
RUN yarn cache clean

# ------------------------------------------------------------------------------
# Runtime stage: lightweight image that serves the built application
# ------------------------------------------------------------------------------

FROM base

# Copy build artifacts from the previous stage
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

# Default port for the web server
EXPOSE 3030
ENV PORT=3030

# Start Next.js server
CMD [ "node", "./apps/web/server.js" ]
