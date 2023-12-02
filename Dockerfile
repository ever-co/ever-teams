# syntax = docker/dockerfile:1

# Ever Teams Platform

ARG NODE_VERSION=18.17.1
ARG NEXT_PUBLIC_GAUZY_API_SERVER_URL=https://api.gauzy.co
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

FROM node:${NODE_VERSION}-slim as base

LABEL maintainer="ever@ever.co"
LABEL org.opencontainers.image.source https://github.com/ever-co/ever-teams

# Next.js app lives here
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_BUILD_OUTPUT_TYPE=standalone
ENV NEXT_SHARP_PATH=/temp/node_modules/sharp

RUN npm i -g npm@latest
# Install sharp, NextJS image optimization
RUN mkdir /temp && cd /temp && \
	npm i sharp

RUN npm cache clean --force

# Throw-away build stage to reduce size of final image
FROM base as build

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

# Install node modules
COPY package.json ./
COPY yarn.lock ./
COPY apps/web/package.json ./apps/web/package.json

RUN cd apps/web && \
	yarn install --ignore-scripts

# Copy application code
COPY . .

ENV NODE_ENV=production

# Build application
RUN yarn run build:web

# Remove development dependencies
RUN cd apps/web && \
	yarn install --prod --ignore-scripts

RUN yarn cache clean


# Final stage for app image
FROM base

ENV NODE_ENV=production

# Copy built application
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000

ENV PORT=3000

CMD [ "node", "./apps/web/server.js" ]
