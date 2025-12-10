#!/bin/bash
# Script to build the prebaked CI Docker image with all dependencies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

IMAGE_NAME="gdx-golden-image:latest"
DOCKERFILE="Dockerfile.act-ci"

echo -e "${BLUE}🔨 Building prebaked CI Docker image${NC}"
echo ""
echo -e "${YELLOW}Image name:${NC} ${IMAGE_NAME}"
echo -e "${YELLOW}Dockerfile:${NC} ${DOCKERFILE}"
echo ""
echo -e "${YELLOW}This will install:${NC}"
echo "  - Rust toolchain (stable) with rustfmt and clippy"
echo "  - Solana CLI (v1.18.20)"
echo "  - Anchor CLI (v0.32.1)"
echo ""
echo -e "${YELLOW}Note:${NC} This may take 10-15 minutes on first build"
echo "      Subsequent builds will be faster with Docker cache"
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root (Docker build context is now project root)
cd "$PROJECT_ROOT"

# Build the image with x86_64 platform to match GitHub Actions runners
# This ensures Solana x86_64 binaries work correctly
# Build context is project root (.) and Dockerfile is in devops/
echo -e "${GREEN}⬇️  Building image (linux/amd64 platform)...${NC}"
echo -e "${YELLOW}Note:${NC} Building for x86_64 to match GitHub Actions runners"
echo -e "${YELLOW}Build context:${NC} ${PROJECT_ROOT}"

# Check if --no-cache flag is provided
NO_CACHE_FLAG=""
if [[ "$1" == "--no-cache" ]] || [[ "$1" == "-n" ]]; then
    NO_CACHE_FLAG="--no-cache"
    echo -e "${YELLOW}⚠️  Building without cache - this will take longer but ensures all dependencies are precompiled${NC}"
fi

DOCKER_BUILDKIT=1 docker build ${NO_CACHE_FLAG:+$NO_CACHE_FLAG} --platform linux/amd64 -f "${SCRIPT_DIR}/${DOCKERFILE}" -t "${IMAGE_NAME}" .

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Image built successfully!${NC}"
    
    # Tag for GHCR as well (so local act runs find it)
    GHCR_IMAGE="ghcr.io/gq-godark/gdx-golden-image:latest"
    docker tag "${IMAGE_NAME}" "${GHCR_IMAGE}"
    echo -e "${GREEN}✓ Tagged as ${GHCR_IMAGE}${NC}"

    echo ""
    echo -e "${BLUE}📋 Image details:${NC}"
    docker images "${IMAGE_NAME}"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo "  1. Run ./devops/run-local-ci.sh to test locally"
    echo "  2. Run ./devops/push-image.sh to push to GHCR"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
