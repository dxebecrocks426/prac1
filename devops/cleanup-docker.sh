#!/bin/bash
# Script to clean up and reset Docker Desktop

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Cleaning up Docker Desktop...${NC}"
echo ""

# Step 1: Force quit all Docker processes
echo -e "${YELLOW}Step 1: Stopping all Docker processes...${NC}"
killall Docker 2>/dev/null || true
killall "Docker Desktop" 2>/dev/null || true
killall com.docker.backend 2>/dev/null || true
killall com.docker.virtualization 2>/dev/null || true
killall com.docker.build 2>/dev/null || true
pkill -9 -f "docker info" 2>/dev/null || true
sleep 3
echo -e "${GREEN}✓ Docker processes stopped${NC}"
echo ""

# Step 2: Clean up Docker VM (this will force a fresh VM on next start)
echo -e "${YELLOW}Step 2: Cleaning up Docker VM...${NC}"
if [ -f ~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw ]; then
    echo "Removing Docker VM file..."
    rm -f ~/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw
    echo -e "${GREEN}✓ Docker VM file removed${NC}"
else
    echo "Docker VM file not found (may already be cleaned)"
fi
echo ""

# Step 3: Clean up Docker settings (optional - comment out if you want to keep settings)
echo -e "${YELLOW}Step 3: Resetting Docker settings...${NC}"
rm -rf ~/Library/Group\ Containers/group.com.docker/settings.json 2>/dev/null || true
rm -rf ~/Library/Containers/com.docker.docker/Data/com.docker.driver.amd64-linux 2>/dev/null || true
echo -e "${GREEN}✓ Docker settings reset${NC}"
echo ""

# Step 4: Clean up Docker logs
echo -e "${YELLOW}Step 4: Cleaning up Docker logs...${NC}"
rm -rf ~/Library/Containers/com.docker.docker/Data/log/* 2>/dev/null || true
echo -e "${GREEN}✓ Docker logs cleaned${NC}"
echo ""

# Step 5: Start Docker Desktop
echo -e "${YELLOW}Step 5: Starting Docker Desktop...${NC}"
open -a Docker 2>&1 || {
    echo -e "${RED}❌ Failed to start Docker Desktop${NC}"
    echo "Please start Docker Desktop manually from Applications"
    exit 1
}
echo -e "${GREEN}✓ Docker Desktop starting...${NC}"
echo ""

# Step 6: Wait for Docker to be ready
echo -e "${YELLOW}Step 6: Waiting for Docker to be ready (this may take 30-60 seconds)...${NC}"
MAX_WAIT=60
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if docker info >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker is ready!${NC}"
        echo ""
        echo -e "${GREEN}✅ Docker Desktop cleanup and restart complete!${NC}"
        docker info | head -5
        exit 0
    fi
    echo -n "."
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

echo ""
echo -e "${YELLOW}⚠️  Docker may still be starting up...${NC}"
echo "Please wait a bit longer and then run: docker info"
echo ""
echo -e "${GREEN}✅ Cleanup complete! Docker Desktop should be starting.${NC}"

