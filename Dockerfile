# syntax = docker/dockerfile:1

# Ever Teams Platform

ARG NODE_VERSION=20.11.1
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
LABEL org.opencontainers.image.source https://github.com/ever-co/ever-teams

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_BUILD_OUTPUT_TYPE=standalone
ENV NEXT_SHARP_PATH=/temp/node_modules/sharp

RUN npm i -g npm@9

# Pre-install Sharp for Next.js image optimization support
RUN mkdir /temp && cd /temp && npm i sharp

RUN npm cache clean --force

# ------------------------------------------------------------------------------
# Build stage: installs dependencies, builds the app
# ------------------------------------------------------------------------------

FROM base AS build

# Pass environment variables into this build stage (for Next.js build-time config)
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

# Install system dependencies needed to compile native modules
RUN apt-get update -qq && \
	apt-get install -y build-essential pkg-config python-is-python3

# Install Yarn
RUN npm install -g yarn --force

# ✅ Copy the full monorepo so that internal workspaces (@ever-teams/*) are available
COPY . .

# ✅ Move to the Next.js web application workspace and install dependencies
WORKDIR /app/apps/web
RUN yarn install --ignore-scripts

# Set production environment
ENV NODE_ENV=production
ENV NEXT_IGNORE_ESLINT_ERROR_ON_BUILD=true

# Build the web application with Turbo (monorepo-aware)
RUN yarn run build:web

# Remove dev dependencies (to reduce final image size)
RUN yarn install --prod --ignore-scripts

# Clean Yarn cache
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
