#!/bin/bash

echo "🧪 Testing DEMO Mode with Docker..."
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Nettoyer
echo "🧹 Cleaning up old containers and images..."
docker stop ever-teams-demo-test 2>/dev/null || true
docker rm ever-teams-demo-test 2>/dev/null || true
docker rmi ever-teams-test:demo 2>/dev/null || true

# Build
echo ""
echo "🔨 Building Docker image with NEXT_PUBLIC_DEMO=true (this will take ~10-15 minutes)..."
echo ""
docker build \
  --build-arg NODE_ENV=production \
  --build-arg NEXT_PUBLIC_DEMO=true \
  --build-arg NEXT_PUBLIC_GAUZY_API_SERVER_URL=https://apidev.ever.team \
  --build-arg GAUZY_API_SERVER_URL=https://apidev.ever.team \
  --no-cache \
  -t ever-teams-test:demo \
  -f Dockerfile \
  . || { echo -e "${RED}❌ Build failed${NC}"; exit 1; }

# Inspecter
echo ""
echo "🔍 Inspecting image for NEXT_PUBLIC_DEMO variable..."
docker run --rm ever-teams-test:demo sh -c "env | grep DEMO" || echo "⚠️  No DEMO env var found in runtime"

# Lancer
echo ""
echo "🚀 Starting container..."
docker run -d \
  --name ever-teams-demo-test \
  -p 3000:3030 \
  -e NEXT_PUBLIC_DEMO=true \
  -e AUTH_SECRET=test-secret-for-local-demo-testing-only \
  -e NEXT_PUBLIC_GAUZY_API_SERVER_URL=https://apidev.ever.team \
  -e GAUZY_API_SERVER_URL=https://apidev.ever.team \
  ever-teams-test:demo

# Attendre
echo ""
echo "⏳ Waiting for app to start (30 seconds)..."
sleep 30

# Vérifier les logs
echo ""
echo "📋 Container logs (last 30 lines):"
docker logs ever-teams-demo-test | tail -30

# Instructions
echo ""
echo -e "${GREEN}✅ Container is running!${NC}"
echo ""
echo "🌐 Open your browser and test:"
echo "   http://localhost:3000/auth/password"
echo ""
echo "✅ Check for:"
echo "   1. Page redirects to /auth/password (not /auth/passcode)"
echo "   2. Demo credentials dropdown appears"
echo "   3. 3 quick access buttons appear"
echo "   4. Auto-login works"
echo ""
echo "🔍 To inspect the bundle:"
echo "   docker cp ever-teams-demo-test:/app/apps/web/.next/static ./next-static-test"
echo "   grep -r 'IS_DEMO_MODE' ./next-static-test/"
echo "   rm -rf ./next-static-test"
echo ""
echo "🛑 When done testing, run:"
echo "   ./cleanup-demo-test.sh"
