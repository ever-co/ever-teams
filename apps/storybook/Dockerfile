# syntax=docker/dockerfile:1
ARG NODE_VERSION=24.14.0
FROM node:${NODE_VERSION}-slim AS build
ENV NODE_OPTIONS="--max-old-space-size=8192" CI=true NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -qq && apt-get install -y build-essential pkg-config python-is-python3 git && rm -rf /var/lib/apt/lists/*
RUN npm install -g yarn --force
WORKDIR /app
COPY . .
# Drop the yarn cache in the SAME layer as the install: it holds every platform variant of the native
# packages (GBs), and exporting a layer that still carries it overflows the CI runner's 24Gi docker volume.
RUN yarn install --network-timeout 1000000 --frozen-lockfile --non-interactive --ignore-scripts && yarn cache clean
RUN yarn turbo run build --filter=@ever-teams/storybook
FROM nginx:alpine
COPY --from=build /app/apps/storybook/storybook-static /usr/share/nginx/html
# Static bundle, no server: /runtime-config.js is rewritten from the container environment before
# nginx starts, so `docker run -e STORYBOOK_TEAMS_API_URL=...` reconfigures the image without a
# rebuild. Without it the image would keep whatever API URL the build machine had.
COPY .deploy/examples/runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh
ENV RUNTIME_ENV_KEYS="STORYBOOK_TEAMS_API_URL"
RUN printf 'server {\n  listen 80 default_server;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files $uri $uri/ /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80