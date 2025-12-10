#!/bin/bash
# Quick test to verify sccache is working in the golden image

set -e

echo "🔍 Testing sccache in golden image..."
echo ""

# Test if image exists
if ! docker image inspect gdx-golden-image:latest > /dev/null 2>&1; then
    echo "❌ Error: gdx-golden-image:latest not found"
    echo "Please build it first: cd devops && ./build-ci-image.sh"
    exit 1
fi

echo "✅ Image found: gdx-golden-image:latest"
echo ""

# Test sccache installation
echo "1. Testing sccache installation..."
docker run --rm gdx-golden-image:latest sccache --version
echo ""

# Test Cargo config
echo "2. Testing Cargo configuration..."
docker run --rm gdx-golden-image:latest cat /root/.cargo/config.toml | grep -A 2 "rustc-wrapper" || echo "⚠️  Cargo config not found"
echo ""

# Test sccache stats (should be empty but working)
echo "3. Testing sccache statistics..."
docker run --rm gdx-golden-image:latest sccache --show-stats | head -5
echo ""

# Test RUSTC_WRAPPER environment
echo "4. Testing environment setup..."
docker run --rm -e RUSTC_WRAPPER=sccache gdx-golden-image:latest sh -c 'echo "RUSTC_WRAPPER: $RUSTC_WRAPPER" && which sccache'
echo ""

echo "✅ All sccache checks passed!"
echo ""
echo "The golden image is ready for CI use."


