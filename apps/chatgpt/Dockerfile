# Multi-stage build for Ever-Teams ChatGPT App

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies needed for build
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json yarn.lock turbo.json ./
COPY apps/chatgpt/package.json apps/chatgpt/
COPY packages/config-typescript/package.json packages/config-typescript/
COPY packages/config-eslint/package.json packages/config-eslint/

# Install all dependencies
RUN yarn install --frozen-lockfile --network-timeout 1000000

# Copy source code
COPY apps/chatgpt apps/chatgpt
COPY packages/config-typescript packages/config-typescript
COPY packages/config-eslint packages/config-eslint

# Build the application
RUN yarn build:chatgpt

# Stage 2: Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Install production dependencies only
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json yarn.lock ./
COPY apps/chatgpt/package.json apps/chatgpt/
COPY packages/config-typescript/package.json packages/config-typescript/
COPY packages/config-eslint/package.json packages/config-eslint/

# Install production dependencies only
RUN yarn install --frozen-lockfile --production --network-timeout 1000000

# Copy built application from builder stage
COPY --from=builder /app/apps/chatgpt/dist apps/chatgpt/dist

# Set environment variables
ENV NODE_ENV=production
ENV CHATGPT_APP_PORT=3004
ENV CHATGPT_APP_HOST=0.0.0.0

# Expose port
EXPOSE 3004

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "apps/chatgpt/dist/index.js"]
