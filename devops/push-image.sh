#!/bin/bash
# Script to push the local Docker image to GitHub Container Registry (GHCR)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOCAL_IMAGE="gdx-golden-image:latest"
GHCR_IMAGE="ghcr.io/gq-godark/gdx-golden-image:latest"

echo -e "${BLUE}🚀 Preparing to push Docker image to GHCR${NC}"
echo ""

# Check if local image exists
if ! docker image inspect "${LOCAL_IMAGE}" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Local image '${LOCAL_IMAGE}' not found${NC}"
    echo "Please run ./devops/build-ci-image.sh first"
    exit 1
fi

# Tag image
echo -e "${BLUE}Tagging image...${NC}"
docker tag "${LOCAL_IMAGE}" "${GHCR_IMAGE}"
echo -e "${GREEN}✓ Image tagged as ${GHCR_IMAGE}${NC}"
echo ""

# Check if logged in to GHCR
echo -e "${BLUE}Checking GHCR authentication...${NC}"
echo -e "${YELLOW}Note:${NC} You need a GitHub Personal Access Token (PAT) with 'write:packages' scope."
echo "      If you are not logged in, you will be prompted for your PAT."
echo ""

# Attempt login
echo "Please login to ghcr.io (Username: GitHub username, Password: PAT)"
docker login ghcr.io

echo ""
echo -e "${BLUE}Pushing image to GHCR...${NC}"
echo "This may take a while depending on your upload speed."
docker push "${GHCR_IMAGE}"

echo ""
echo -e "${GREEN}✅ Image pushed successfully!${NC}"
echo "You can now use this image in your GitHub Actions workflows:"
echo "container: ${GHCR_IMAGE}"

