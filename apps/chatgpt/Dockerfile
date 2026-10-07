# Multi-stage build for Ever-Teams ChatGPT App
#
# NOTE: this image is built ONCE and configured at RUNTIME. The app is a plain Node server (tsc, no bundler)
# that reads every deployment-specific value from the container env when it starts, so a self-hosted
# deployment passes its own values with `docker run -e ...` / compose `environment:` / a k8s Secret:
#   MCP_SERVER_URL, OAUTH_SERVER_URL, PUBLIC_URL, ALLOWED_ORIGINS, CHATGPT_WIDGET_DOMAIN, CHATGPT_WIDGET_CSP,
#   CHATGPT_APP_ID, CHATGPT_APP_SECRET, SESSION_SECRET (required with NODE_ENV=production), LOG_LEVEL,
#   LOGTAIL_SOURCE_TOKEN (optional: also ship logs to Better Stack / Logtail), ...
# (see apps/chatgpt/.env.example). None of them is a build argument - do not add any here.

# The root package.json requires Node >= 24 ("engines"), which `yarn install` enforces (Node 20 fails it).
ARG NODE_VERSION=24.14.0

# Stage 1: Build stage
FROM node:${NODE_VERSION}-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies needed for build
RUN apk add --no-cache python3 make g++

# Copy package files: the root manifest plus every workspace manifest the install has to resolve
# (Yarn resolves the root's own dependencies too, even with --production):
# - packages/ts-config: devDependency of apps/chatgpt and the `extends` of apps/chatgpt/tsconfig.json
# - packages/eslint-config: devDependency of apps/chatgpt (and of packages/types)
# - packages/types: devDependency of the root package.json
COPY package.json yarn.lock turbo.json ./
COPY apps/chatgpt/package.json apps/chatgpt/
COPY packages/ts-config/package.json packages/ts-config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/types/package.json packages/types/

# Install all dependencies (lifecycle scripts skipped as in .deploy/web/Dockerfile: the root devDependencies
# pull in tooling such as Cypress/Electron whose postinstall downloads are not needed to build this app)
RUN yarn install --frozen-lockfile --ignore-scripts --network-timeout 1000000

# Copy source code (tsc resolves "extends": "@ever-teams/ts-config/base.json" from packages/ts-config)
COPY apps/chatgpt apps/chatgpt
COPY packages/ts-config packages/ts-config
COPY packages/eslint-config packages/eslint-config

# Build the application
RUN yarn build:chatgpt

# Stage 2: Production stage
FROM node:${NODE_VERSION}-alpine AS production

# Set working directory
WORKDIR /app

# Install production dependencies only
RUN apk add --no-cache dumb-init

# Copy package files (same workspace manifests as the build stage, so the frozen lockfile resolves)
COPY package.json yarn.lock ./
COPY apps/chatgpt/package.json apps/chatgpt/
COPY packages/ts-config/package.json packages/ts-config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/types/package.json packages/types/

# Install production dependencies only
RUN yarn install --frozen-lockfile --production --ignore-scripts --network-timeout 1000000 && yarn cache clean

# Copy built application from builder stage
COPY --from=builder /app/apps/chatgpt/dist apps/chatgpt/dist

# Set environment variables
ENV NODE_ENV=production
ENV CHATGPT_APP_PORT=3004
ENV CHATGPT_APP_HOST=0.0.0.0

# Expose port
EXPOSE 3004

# Run as the unprivileged user the node image provides (the app only reads its files at runtime)
USER node

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "apps/chatgpt/dist/index.js"]
