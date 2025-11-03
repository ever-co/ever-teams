# Docker Quick Start - Ever Teams Web

## Two Available Modes

### Development Mode (RECOMMENDED for coding)

- ✅ **Hot reload**: Code changes reload automatically
- ✅ No rebuild needed for each change
- ✅ Ideal for rapid development and testing
- ⚠️ Larger image size (~1GB)

### Production Mode

- ✅ Optimized and lightweight image (~200MB)
- ✅ Maximum performance
- ❌ No hot reload (rebuild required for each change)
- ✅ Ideal for deployment

---

## Quick Start - Development Mode

### Simple Method: Use the automated script

```bash
# 1. Make the script executable (once)
chmod +x docker-run.sh

# 2. Build the development image (once)
./docker-run.sh dev:build

# 3. Start the application in development mode
./docker-run.sh dev

# The application will start at http://localhost:3030
# Edit your code and see changes in real-time!

# 4. Stop the application (Ctrl + C in terminal)
# Or in another terminal:
./docker-run.sh stop  # Stops ALL containers (dev + prod)
```

**How does hot reload work?**

The development mode uses **mounted volumes** + **Next.js file watching** (with polling):

- ✅ **Automatic hot reload**: Changes appear in real-time
- ✅ **Compatible**: Works with all Docker Compose versions
- ✅ **Reliable**: Proven method for Docker development
- ⚠️ **Polling-based**: Uses `CHOKIDAR_USEPOLLING=true` for file detection

### Manual Method: Use docker-compose directly

```bash
# 1. Build the development image
docker-compose -f docker-compose.dev.yml --env-file .env.dev.docker build

# 2. Start the application
docker-compose -f docker-compose.dev.yml --env-file .env.dev.docker up

# 3. Access the application
# Open your browser at: http://localhost:3030

# 4. Edit your code - the application reloads automatically!

# 5. Stop the application (Ctrl + C in terminal)
# Then to clean up:
docker-compose -f docker-compose.dev.yml down
```

---

## Quick Start - Production Mode

### Simple Method: Use the automated script

```bash
# 1. Make the script executable (once)
chmod +x docker-run.sh

# 2. Build the production image
./docker-run.sh build

# 3. Start the application
./docker-run.sh start

# 4. View logs
./docker-run.sh logs

# 5. Stop the application
./docker-run.sh stop  # Stops ALL containers (dev + prod)
```

### Manual Method: Use docker-compose directly

```bash
# 1. Build the image
docker-compose -f docker-compose.build.yml --env-file .env.docker build

# 2. Start the application
docker-compose -f docker-compose.build.yml --env-file .env.docker up

# 3. Access the application
# Open your browser at: http://localhost:3030

# 4. Stop the application (Ctrl + C in terminal)
# Then to clean up:
docker-compose -f docker-compose.build.yml down
```

---

## ⚠️ Important: `stop` Command

The `./docker-run.sh stop` command stops **ALL** containers (development AND production).

```bash
# Stops ALL containers (dev + prod)
./docker-run.sh stop
```

If you want to stop only a specific container:

```bash
# Stop only the development container
docker-compose -f docker-compose.dev.yml down

# Stop only the production container
docker-compose -f docker-compose.build.yml down
```

---

## Useful Commands

### Run in background (detached mode)

```bash
docker-compose -f docker-compose.build.yml --env-file .env.docker up -d
```

### View logs

```bash
docker logs webapp
```

### View logs in real-time

```bash
docker logs -f webapp
```

### Stop the application

```bash
docker-compose -f docker-compose.build.yml down
```

### Rebuild the image (after code changes)

```bash
docker-compose -f docker-compose.build.yml --env-file .env.docker build --no-cache
```

### View running containers

```bash
docker ps
```

### Enter the container

```bash
docker exec -it webapp /bin/bash
```

---

## Configuration

All environment variables are in the `.env.docker` file at the project root.

### Change the API URL

Open `.env.docker` and modify:

```bash
GAUZY_API_SERVER_URL=http://localhost:3000
NEXT_PUBLIC_GAUZY_API_SERVER_URL=http://localhost:3000
```

Then rebuild the image:

```bash
docker-compose -f docker-compose.build.yml --env-file .env.docker build
```

### Change the port

Open `.env.docker` and modify:

```bash
UI_PORT=3031
```

Then restart the application:

```bash
docker-compose -f docker-compose.build.yml --env-file .env.docker up
```

The application will be accessible at `http://localhost:3031`

---

## Common Issues

### "Port 3030 is already in use"

Change the port in `.env.docker`:

```bash
UI_PORT=3031
```

### "Cannot connect to the Docker daemon"

Make sure Docker Desktop is running.

### Application doesn't load

Check the logs:

```bash
docker logs webapp
```

### Build fails with "Unable to download sentry-cli binary" or timeout errors

This happens when optional binaries (Sentry CLI, Cypress, Playwright) fail to download during `yarn install`.

**Solution**: The `Dockerfile.dev` now skips these optional downloads by default using:

- `SENTRYCLI_SKIP_DOWNLOAD=1` - Skips Sentry CLI binary
- `CYPRESS_INSTALL_BINARY=0` - Skips Cypress binary
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` - Skips Playwright browsers

If you still encounter timeout errors:

1. **Increase network timeout** (already set to 600 seconds in Dockerfile.dev):

   ```dockerfile
   RUN yarn install --frozen-lockfile --non-interactive --network-timeout 600000
   ```

2. **Check your internet connection** - Slow or unstable connections can cause timeouts

3. **Use Docker BuildKit cache** - Rebuild to use cached layers:

   ```bash
   ./docker-run.sh dev:build
   ```

4. **If on ARM64/M1/M2 Mac** - Some binaries may not be available for ARM architecture. The skip flags prevent these issues.

### Build is very slow (5-10 minutes)

This is normal for the first build. Docker caches layers, so subsequent builds are much faster (30 seconds to 2 minutes).

To speed up builds:

- ✅ Use `./docker-run.sh dev:build` which uses BuildKit caching
- ✅ Don't change `package.json` files frequently (invalidates cache)
- ✅ Keep Docker Desktop running (preserves cache)

---
