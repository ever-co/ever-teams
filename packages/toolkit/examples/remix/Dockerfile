# syntax=docker/dockerfile:1
ARG NODE_VERSION=24.14.0
FROM node:${NODE_VERSION}-slim AS build
ENV NODE_OPTIONS="--max-old-space-size=8192" CI=true NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -qq && apt-get install -y build-essential pkg-config python-is-python3 git && rm -rf /var/lib/apt/lists/*
RUN npm install -g yarn --force
WORKDIR /app
COPY . .
RUN yarn install --network-timeout 1000000 --frozen-lockfile --non-interactive --ignore-scripts

RUN yarn turbo run build --filter=@ever-teams/example-remix
WORKDIR /app/packages/toolkit/examples/remix
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["yarn","start"]