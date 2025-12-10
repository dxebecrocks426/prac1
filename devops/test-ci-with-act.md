# Testing CI Pipeline with nektos/act

## Quick Verification ✅

The golden image has been verified:
- ✅ sccache installed (v0.12.0)
- ✅ Cargo configured to use sccache
- ✅ Environment variables set correctly

## Running Full CI with act

### Option 1: Use the Local CI Script (Recommended)

```bash
cd gdx/devops
./run-local-ci-collateral-vault.sh
```

This script:
- Detects your architecture (ARM64/Apple Silicon)
- Handles validator setup automatically
- Uses the correct network configuration
- Shows verbose output

### Option 2: Run act Manually

For **Apple Silicon (ARM64)** - Use external validator:
```bash
cd gdx/gdx-collateral-vault

# Start validator on host first (if not running)
solana-test-validator --reset &

# Run act with external validator
act \
    --workflows .github/workflows/collateral-vault-ci.yml \
    --job lint-and-test \
    --container-architecture linux/amd64 \
    --container-options "--network=host" \
    --bind \
    --pull=false \
    --env USE_EXTERNAL_VALIDATOR=true \
    --env SOLANA_RPC_URL="http://host.docker.internal:8899"
```

For **x86_64 Linux** - Validator in Docker:
```bash
cd gdx/gdx-collateral-vault

act \
    --workflows .github/workflows/collateral-vault-ci.yml \
    --job lint-and-test \
    --container-architecture linux/amd64 \
    --container-options "--network=host" \
    --bind \
    --verbose \
    --pull=false
```

## What to Look For

### ✅ Success Indicators

1. **Build Step Output:**
   ```
   ⏱️  Starting build at [timestamp]
   [build output...]
   ⏱️  Build completed in [X] seconds
   📊 sccache statistics:
   Compile requests:      [number]
   Cache hits:            [number]
   Cache misses:          [number]
   Cache hits rate:       [percentage]
   ```

2. **Test Step Output:**
   ```
   ⏱️  Starting tests at [timestamp]
   [test output...]
   ⏱️  Tests completed in [X] seconds
   📊 Final sccache statistics:
   [updated stats]
   ```

3. **Build Summary:**
   ```
   ## ⏱️ Build Performance Summary
   **Build time:** [X] seconds
   **Test time:** [Y] seconds
   **Total time:** [X+Y] seconds
   ```

### Expected Performance

- **First run (cold cache):** 
  - Build time: ~5-10 minutes (depending on dependencies)
  - Cache hits: 0% (first time)
  - Most dependencies compile from scratch

- **Second run (warm cache):**
  - Build time: ~2-5 minutes (50-70% faster)
  - Cache hits: 60-80%
  - Most dependencies served from cache

### Troubleshooting

**If build fails:**
1. Check Docker is running: `docker info`
2. Verify image exists: `docker images | grep gdx-golden-image`
3. Check act version: `act --version` (should be 0.2.80+)
4. Review build logs for specific errors

**If sccache stats show 0 requests:**
- This is normal on first run
- Check that `RUSTC_WRAPPER=sccache` is set
- Verify Cargo config exists: `/root/.cargo/config.toml`

**If cache hit rate is low:**
- First run will always be 0%
- Second run should show significant cache hits
- Check that sccache server is running (auto-started by Cargo)

## Quick Test (Build Step Only)

To test just the build step without running full CI:

```bash
cd gdx/gdx-collateral-vault

act \
    --workflows .github/workflows/collateral-vault-ci.yml \
    --job lint-and-test \
    --container-architecture linux/amd64 \
    --container-options "--network=host" \
    --pull=false \
    --artifact-server-path /tmp/artifacts \
    --list | grep "Build program"
```

Then run just that step (if act supports step selection in your version).

## Performance Comparison

After running CI 2-3 times, compare:

| Run | Build Time | Cache Hits | Cache Hit Rate | Notes |
|-----|------------|------------|----------------|-------|
| 1   | TBD        | TBD        | TBD            | Cold cache |
| 2   | TBD        | TBD        | TBD            | Warm cache |
| 3   | TBD        | TBD        | TBD            | Hot cache |

Update `bootcamp/sccache-performance-results.md` with actual numbers.

## Notes

- Full CI run takes 10-15 minutes
- Build step is the longest (5-10 minutes first time)
- Subsequent runs should be much faster
- sccache cache persists between act runs (stored in container)


