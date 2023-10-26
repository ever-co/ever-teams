# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=18.17.1
FROM node:${NODE_VERSION}-slim as base


# Next.js app lives here
WORKDIR /app

# Set production environment
ENV NEXT_SHARP_PATH=/app/node_modules/sharp


# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y build-essential pkg-config python-is-python3

# Install Yarn
RUN npm install -g yarn --force

# Install node modules
COPY --link package.json ./
COPY --link yarn.lock ./
COPY --link apps/web/package.json ./apps/web/package.json

RUN cd apps/web && \
    yarn install --ignore-scripts

# Copy application code
COPY --link . .

ENV NODE_ENV="production"

# Build application
RUN yarn run build:web

# Remove development dependencies
RUN cd apps/web && \
    yarn install --prod --ignore-scripts


# Final stage for app image
FROM base

ENV NODE_ENV="production"

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000

CMD [ "npm", "run", "start:web" ]
