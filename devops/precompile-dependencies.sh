#!/bin/bash
# Script to pre-compile all dependencies from Anchor.toml and Cargo.toml files
# This discovers all Anchor workspaces and builds them to warm up sccache
# Uses cargo build --release --lib to fully compile dependencies and cache them in sccache
# Optimized with parallel builds and dependency fetching

# Don't exit on errors - we want to try all projects even if some fail
set +e

# Set up environment
export PATH="/root/.cargo/bin:/root/.local/share/solana/install/active_release/bin:${PATH}"
export RUSTC_WRAPPER=sccache
export CARGO_NET_GIT_FETCH_WITH_CLI=true
# Don't set CARGO_BUILD_JOBS=0 - cargo doesn't allow 0, it uses all cores by default

# Activate Anchor version manager
yes | avm use 0.32.1 > /dev/null 2>&1 || true

# Get number of CPU cores for parallel builds
MAX_PARALLEL_JOBS=$(nproc 2>/dev/null || echo "4")
echo "Pre-compiling dependencies from all Anchor workspaces..."
echo "Using up to ${MAX_PARALLEL_JOBS} parallel build jobs"
echo ""

# Find all Anchor.toml files
ANCHOR_PROJECTS=$(find /workspace -name "Anchor.toml" -type f 2>/dev/null | grep -v node_modules | grep -v target | sort)

# Find standalone Cargo.toml files (non-Anchor projects)
STANDALONE_CARGOS=$(find /workspace -name "Cargo.toml" -type f 2>/dev/null | \
    grep -v node_modules | \
    grep -v target | \
    grep -v "programs/" | \
    grep -v "tests/Cargo.toml" | \
    grep -v "Anchor.toml" | \
    sort | \
    uniq)

# ============================================================================
# Phase 1: Fetch all dependencies first (single network pass)
# ============================================================================
echo "Phase 1: Fetching all dependencies..."
echo ""

if [ -n "$ANCHOR_PROJECTS" ]; then
    echo "Fetching dependencies for Anchor workspaces..."
    for anchor_toml in $ANCHOR_PROJECTS; do
        workspace_dir=$(dirname "$anchor_toml")
        workspace_name=$(basename "$workspace_dir")
        echo "  Fetching: $workspace_name"
        cd "$workspace_dir" || continue
        
        # Fetch dependencies for each program
        if [ -d "programs" ]; then
            for program_dir in programs/*/; do
                if [ -f "${program_dir}Cargo.toml" ]; then
                    cargo fetch --manifest-path="${program_dir}Cargo.toml" 2>/dev/null || true
                fi
            done
        fi
        
        # Fetch test dependencies
        if [ -d "tests" ] && [ -f "tests/Cargo.toml" ]; then
            cargo fetch --manifest-path=./tests/Cargo.toml 2>/dev/null || true
        fi
        
        # Fetch service dependencies
        for service_dir in */; do
            if [ -f "${service_dir}Cargo.toml" ] && [ "$service_dir" != "programs/" ] && [ "$service_dir" != "tests/" ] && [ "$service_dir" != "target/" ]; then
                cargo fetch --manifest-path=./${service_dir}Cargo.toml 2>/dev/null || true
            fi
        done
    done
fi

if [ -n "$STANDALONE_CARGOS" ]; then
    echo "Fetching dependencies for standalone Rust projects..."
    for cargo_toml in $STANDALONE_CARGOS; do
        project_dir=$(dirname "$cargo_toml")
        project_name=$(basename "$project_dir")
        echo "  Fetching: $project_name"
        cd "$project_dir" || continue
        cargo fetch 2>/dev/null || true
    done
fi

echo ""
echo "✓ Dependency fetching complete"
echo ""

# ============================================================================
# Phase 2: Build dependencies in parallel (with --release and --offline)
# ============================================================================
echo "Phase 2: Building dependencies in parallel (release mode, offline)..."
echo ""

# Function to build a single Anchor workspace
build_anchor_workspace() {
    local anchor_toml="$1"
    local workspace_dir=$(dirname "$anchor_toml")
    local workspace_name=$(basename "$workspace_dir")
    
    cd "$workspace_dir" || return 1
    
    local build_success=true
    
    # Pre-compile dependencies for BPF programs
    # Use cargo build --release --lib on native target - dependencies are the same, and BPF target may not be available
    if [ -d "programs" ]; then
        for program_dir in programs/*/; do
            if [ -f "${program_dir}Cargo.toml" ]; then
                program_name=$(basename "$program_dir")
                echo "    [$workspace_name] Building dependencies for program: $program_name"
                # Use cargo build --release --lib --offline on native target - this fully compiles dependencies which get cached
                # BPF target compilation happens during actual CI builds
                # --lib flag builds library without requiring BPF target
                # --release flag compiles faster with fewer checks
                # --offline flag uses fetched dependencies
                if cargo build --release --lib --offline --manifest-path="${program_dir}Cargo.toml" 2>&1 | tee /tmp/check-${workspace_name}-${program_name}.log | grep -q "Finished\|error:"; then
                    if grep -q "Finished" /tmp/check-${workspace_name}-${program_name}.log; then
                        echo "    [$workspace_name] ✓ Dependencies compiled and cached for $program_name"
                    else
                        echo "    [$workspace_name] ⚠ Some errors (dependencies may still be cached)"
                        build_success=false
                    fi
                else
                    build_success=false
                fi
            fi
        done
    fi
    
    # Pre-compile test dependencies
    if [ -d "tests" ] && [ -f "tests/Cargo.toml" ]; then
        echo "  [$workspace_name] Pre-compiling test dependencies..."
        cargo build --release --tests --offline --manifest-path=./tests/Cargo.toml 2>&1 | tee /tmp/check-${workspace_name}-tests.log | tail -3
        if grep -q "Finished" /tmp/check-${workspace_name}-tests.log; then
            echo "  [$workspace_name] ✓ Test dependencies compiled and cached"
        else
            build_success=false
        fi
    fi
    
    # Pre-compile service dependencies
    for service_dir in */; do
        if [ -f "${service_dir}Cargo.toml" ] && [ "$service_dir" != "programs/" ] && [ "$service_dir" != "tests/" ] && [ "$service_dir" != "target/" ]; then
            service_name=$(basename "$service_dir")
            echo "  [$workspace_name] Pre-compiling service dependencies: $service_name..."
            cargo build --release --lib --offline --manifest-path=./${service_dir}Cargo.toml 2>&1 | tee /tmp/check-${workspace_name}-${service_name}.log | tail -3
            if grep -q "Finished" /tmp/check-${workspace_name}-${service_name}.log; then
                echo "  [$workspace_name] ✓ Service dependencies compiled and cached for $service_name"
            else
                build_success=false
            fi
        fi
    done
    
    return 0
}

# Function to build a standalone Cargo project
build_standalone_project() {
    local cargo_toml="$1"
    local project_dir=$(dirname "$cargo_toml")
    local project_name=$(basename "$project_dir")
    
    cd "$project_dir" || return 1
    
    echo "  [$project_name] Building dependencies..."
    cargo build --release --lib --offline 2>&1 | tee /tmp/check-${project_name}.log | tail -3
    if grep -q "Finished" /tmp/check-${project_name}.log; then
        echo "  [$project_name] ✓ Dependencies compiled and cached"
        return 0
    else
        return 1
    fi
}

# Build Anchor workspaces in parallel
if [ -n "$ANCHOR_PROJECTS" ]; then
    echo "Found Anchor workspaces:"
    echo "$ANCHOR_PROJECTS" | sed 's|^|  - |'
    echo ""
    
    PIDS=()
    for anchor_toml in $ANCHOR_PROJECTS; do
        # Wait for a slot if we've reached max parallel jobs
        while [ ${#PIDS[@]} -ge $MAX_PARALLEL_JOBS ]; do
            # Check for completed jobs
            NEW_PIDS=()
            for pid in "${PIDS[@]}"; do
                if kill -0 "$pid" 2>/dev/null; then
                    NEW_PIDS+=("$pid")
                else
                    # Job completed, wait for it
                    wait "$pid" 2>/dev/null || true
                fi
            done
            PIDS=("${NEW_PIDS[@]}")
            
            # If still at max, wait a bit before checking again
            if [ ${#PIDS[@]} -ge $MAX_PARALLEL_JOBS ]; then
                sleep 0.5
            fi
        done
        
        # Start build in background
        build_anchor_workspace "$anchor_toml" &
        PIDS+=($!)
    done
    
    # Wait for all Anchor workspace builds to complete
    for pid in "${PIDS[@]}"; do
        wait "$pid" 2>/dev/null || true
    done
    
    echo ""
fi

# Build standalone projects in parallel
if [ -n "$STANDALONE_CARGOS" ]; then
    echo "Found standalone Rust projects:"
    echo "$STANDALONE_CARGOS" | sed 's|^|  - |'
    echo ""
    
    PIDS=()
    for cargo_toml in $STANDALONE_CARGOS; do
        # Wait for a slot if we've reached max parallel jobs
        while [ ${#PIDS[@]} -ge $MAX_PARALLEL_JOBS ]; do
            # Check for completed jobs
            NEW_PIDS=()
            for pid in "${PIDS[@]}"; do
                if kill -0 "$pid" 2>/dev/null; then
                    NEW_PIDS+=("$pid")
                else
                    # Job completed, wait for it
                    wait "$pid" 2>/dev/null || true
                fi
            done
            PIDS=("${NEW_PIDS[@]}")
            
            # If still at max, wait a bit before checking again
            if [ ${#PIDS[@]} -ge $MAX_PARALLEL_JOBS ]; then
                sleep 0.5
            fi
        done
        
        # Start build in background
        build_standalone_project "$cargo_toml" &
        PIDS+=($!)
    done
    
    # Wait for all standalone project builds to complete
    for pid in "${PIDS[@]}"; do
        wait "$pid" 2>/dev/null || true
    done
    
    echo ""
fi

echo "Dependency pre-compilation complete!"
echo "sccache statistics:"
sccache --show-stats || echo "sccache stats unavailable"
