#!/bin/bash
# Script to manually install Solana in the gdx-ci Docker image
# This works around network/TLS issues by downloading Linux binary on host and copying to container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

IMAGE_NAME="gdx-golden-image:latest"
CONTAINER_NAME="gdx-golden-image-install"
SOLANA_VERSION="3.0.11" # Agave v3.0.11
PLATFORM_TOOLS_VERSION="1.43" # Contains newer Rust

echo -e "${BLUE}🔧 Installing Solana (Linux x86_64) & Platform Tools in Docker image${NC}"
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

# Download Linux Solana binary on host
echo -e "${BLUE}Downloading Solana v${SOLANA_VERSION} Linux binary on host...${NC}"
SOLANA_URL="https://github.com/anza-xyz/agave/releases/download/v${SOLANA_VERSION}/solana-release-x86_64-unknown-linux-gnu.tar.bz2"
SOLANA_FILE="/tmp/solana-linux.tar.bz2"

if [ -f "$SOLANA_FILE" ]; then
    echo "Found cached Solana download at $SOLANA_FILE"
else
    echo "Downloading from $SOLANA_URL..."
    curl -L "$SOLANA_URL" -o "$SOLANA_FILE"
fi

# Verify Solana download
if [ ! -s "$SOLANA_FILE" ]; then
    echo -e "${RED}❌ Error: Solana download failed or file is empty${NC}"
    rm -f "$SOLANA_FILE"
    exit 1
fi

# Download Platform Tools on host
echo -e "${BLUE}Downloading Platform Tools v${PLATFORM_TOOLS_VERSION} on host...${NC}"
TOOLS_URL="https://github.com/anza-xyz/platform-tools/releases/download/v${PLATFORM_TOOLS_VERSION}/platform-tools-linux-x86_64.tar.bz2"
TOOLS_FILE="/tmp/platform-tools-linux.tar.bz2"

if [ -f "$TOOLS_FILE" ]; then
    echo "Found cached Platform Tools download at $TOOLS_FILE"
else
    echo "Downloading from $TOOLS_URL..."
    curl -L "$TOOLS_URL" -o "$TOOLS_FILE"
fi

# Verify Tools download
if [ ! -s "$TOOLS_FILE" ]; then
    echo -e "${RED}❌ Error: Platform Tools download failed or file is empty${NC}"
    rm -f "$TOOLS_FILE"
    exit 1
fi

echo -e "${GREEN}✓ Downloads successful${NC}"

# Clean up any existing container with this name
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${YELLOW}Removing existing container: ${CONTAINER_NAME}${NC}"
    docker rm -f "${CONTAINER_NAME}" > /dev/null 2>&1 || true
fi

# Start a container from the image
echo -e "${BLUE}Starting container from ${IMAGE_NAME}...${NC}"
docker run -d --name "${CONTAINER_NAME}" --platform linux/amd64 "${IMAGE_NAME}" tail -f /dev/null

# Wait for container to be ready
sleep 2

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ Error: Container failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Container started${NC}"

# Prepare directories in container
CONTAINER_SOLANA_DIR="/root/.local/share/solana"
CONTAINER_TOOLS_DIR="/root/.cache/solana/v${PLATFORM_TOOLS_VERSION}/platform-tools"

echo "Creating directories in container..."
docker exec "${CONTAINER_NAME}" mkdir -p "${CONTAINER_SOLANA_DIR}/install/releases/${SOLANA_VERSION}"
docker exec "${CONTAINER_NAME}" mkdir -p "${CONTAINER_TOOLS_DIR}"

# Copy Solana tarball
echo -e "${BLUE}Copying Solana tarball to container...${NC}"
docker cp "$SOLANA_FILE" "${CONTAINER_NAME}:/tmp/solana.tar.bz2"

# Extract Solana
echo "Extracting Solana in container..."
docker exec "${CONTAINER_NAME}" bash -c "
    cd ${CONTAINER_SOLANA_DIR}/install/releases/${SOLANA_VERSION} && \
    tar -xjf /tmp/solana.tar.bz2 && \
    rm /tmp/solana.tar.bz2
"

# Create symlink for Solana
echo "Creating Solana symlink..."
docker exec "${CONTAINER_NAME}" bash -c "
    cd ${CONTAINER_SOLANA_DIR}/install && \
    rm -rf active_release && \
    ln -sf releases/${SOLANA_VERSION}/solana-release active_release
"

# Copy Platform Tools tarball
echo -e "${BLUE}Copying Platform Tools tarball to container...${NC}"
docker cp "$TOOLS_FILE" "${CONTAINER_NAME}:/tmp/platform-tools.tar.bz2"

# Extract Platform Tools
echo "Extracting Platform Tools in container..."
docker exec "${CONTAINER_NAME}" bash -c "
    cd ${CONTAINER_TOOLS_DIR} && \
    tar -xjf /tmp/platform-tools.tar.bz2 && \
    rm /tmp/platform-tools.tar.bz2
"

# Verify Solana is accessible
echo -e "${BLUE}Verifying installations...${NC}"
if docker exec "${CONTAINER_NAME}" bash -c "export PATH=\"/root/.local/share/solana/install/active_release/bin:\$PATH\" && solana --version" 2>/dev/null; then
    echo -e "${GREEN}✓ Solana verified in container${NC}"
else
    echo -e "${RED}❌ Error: Could not verify Solana installation${NC}"
    docker rm -f "${CONTAINER_NAME}" > /dev/null 2>&1
    exit 1
fi

# Check platform tools rustc version
echo "Checking Platform Tools rustc version..."
docker exec "${CONTAINER_NAME}" bash -c "
    ${CONTAINER_TOOLS_DIR}/rust/bin/rustc --version
" || echo -e "${YELLOW}⚠️  Could not verify platform tools rustc version${NC}"

# Commit the container as a new image
echo -e "${BLUE}Committing container as new image: ${IMAGE_NAME}...${NC}"
docker commit "${CONTAINER_NAME}" "${IMAGE_NAME}"

# Clean up container
echo -e "${BLUE}Cleaning up container...${NC}"
docker rm -f "${CONTAINER_NAME}" > /dev/null 2>&1

echo ""
echo -e "${GREEN}✅ Success! Solana v${SOLANA_VERSION} & Platform Tools v${PLATFORM_TOOLS_VERSION} installed in ${IMAGE_NAME}${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "   Run your pipeline:"
echo "  ./devops/run-local-ci.sh"
