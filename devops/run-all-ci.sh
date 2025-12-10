#!/bin/bash
# Script to run CI for all assignments and verify dependencies are properly handled
# Implements parallel execution with auto-detection of CPU cores for faster CI runs

# Don't use set -e here because we want to continue even if individual jobs fail
# We'll handle errors explicitly in the run_assignment function

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Auto-detect CPU cores for parallel execution
# Use nproc if available, otherwise fall back to sysctl (macOS) or default to 4
if command -v nproc > /dev/null 2>&1; then
    MAX_PARALLEL_JOBS=$(nproc)
elif command -v sysctl > /dev/null 2>&1; then
    MAX_PARALLEL_JOBS=$(sysctl -n hw.ncpu 2>/dev/null || echo "4")
else
    MAX_PARALLEL_JOBS=4
fi

# Ensure we have at least 1 job slot and cap at 8 to avoid resource exhaustion
MAX_PARALLEL_JOBS=$((MAX_PARALLEL_JOBS > 8 ? 8 : MAX_PARALLEL_JOBS))
MAX_PARALLEL_JOBS=$((MAX_PARALLEL_JOBS < 1 ? 1 : MAX_PARALLEL_JOBS))

# Function to show progress indicator in background
show_progress() {
    local assignment_name=$1
    local start_time=$2
    local progress_pid_file="/tmp/ci-progress-${assignment_name}.pid"
    
    (
        trap '' TERM  # Ignore TERM signal to avoid "Terminated" message
        local elapsed=0
        while [ -f "$progress_pid_file" ]; do
            sleep 5
            elapsed=$((elapsed + 5))
            local mins=$((elapsed / 60))
            local secs=$((elapsed % 60))
            if [ $mins -gt 0 ]; then
                printf "\r${CYAN}⏱️  ${assignment_name} running... %dm %ds elapsed${NC}" "$mins" "$secs" >&2
            else
                printf "\r${CYAN}⏱️  ${assignment_name} running... %ds elapsed${NC}" "$secs" >&2
            fi
        done
    ) &
    echo $! > "$progress_pid_file"
}

# Function to stop progress indicator
stop_progress() {
    local assignment_name=$1
    local progress_pid_file="/tmp/ci-progress-${assignment_name}.pid"
    if [ -f "$progress_pid_file" ]; then
        local pid=$(cat "$progress_pid_file")
        rm -f "$progress_pid_file"  # Remove file first so loop exits
        kill "$pid" 2>/dev/null || true
        wait "$pid" 2>/dev/null || true  # Wait for process to finish
        printf "\r${NC}" >&2  # Clear the progress line
    fi
}

# Function to run a single CI assignment
run_assignment() {
    local assignment_name=$1
    local script_name=$2
    local assignment_num=$3
    local total_assignments=$4
    local log_file="/tmp/ci-${assignment_name}.log"
    local result_file="/tmp/ci-result-${assignment_name}.txt"
    
    START_TIME=$(date +%s)
    
    # Start progress indicator
    show_progress "$assignment_name" "$START_TIME"
    
    # Run the CI script
    if "$SCRIPT_DIR/$script_name" > "$log_file" 2>&1; then
        # Stop progress indicator
        stop_progress "$assignment_name"
        
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        mins=$((DURATION / 60))
        secs=$((DURATION % 60))
        if [ $mins -gt 0 ]; then
            echo "✅ ${assignment_name} - PASSED (${mins}m ${secs}s)" > "$result_file"
        else
            echo "✅ ${assignment_name} - PASSED (${secs}s)" > "$result_file"
        fi
        echo "SUCCESS" >> "$result_file"
    else
        # Stop progress indicator
        stop_progress "$assignment_name"
        
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        mins=$((DURATION / 60))
        secs=$((DURATION % 60))
        if [ $mins -gt 0 ]; then
            echo "❌ ${assignment_name} - FAILED (${mins}m ${secs}s)" > "$result_file"
        else
            echo "❌ ${assignment_name} - FAILED (${secs}s)" > "$result_file"
        fi
        echo "FAILED" >> "$result_file"
        echo "$log_file" >> "$result_file"
    fi
}

echo -e "${BLUE}🚀 Running CI for all assignments to verify dependencies${NC}"
echo ""

# List of assignments to test
ASSIGNMENTS=(
    "collateral-vault:run-local-ci-collateral-vault.sh"
    "ephemeral-vault:run-local-ci-ephemeral-vault.sh"
    "funding-rate:run-local-ci-funding-rate.sh"
    "liquidation-engine:run-local-ci-liquidation-engine.sh"
    "oracle:run-local-ci-oracle.sh"
    "position-mgmt:run-local-ci-position-mgmt.sh"
    "settlement-relayer:run-local-ci-settlement-relayer.sh"
    "solana-examples:run-local-ci-solana-examples.sh"
)

TOTAL_ASSIGNMENTS=${#ASSIGNMENTS[@]}
RESULTS=()
OVERALL_START_TIME=$(date +%s)

echo -e "${BLUE}Total assignments: ${TOTAL_ASSIGNMENTS}${NC}"
echo -e "${CYAN}Parallel execution: ${MAX_PARALLEL_JOBS} jobs at a time${NC}"
echo ""

# Clean up any stale result files
for idx in "${!ASSIGNMENTS[@]}"; do
    assignment_info="${ASSIGNMENTS[$idx]}"
    IFS=':' read -r assignment_name script_name <<< "$assignment_info"
    rm -f "/tmp/ci-result-${assignment_name}.txt"
done

# Process assignments in parallel batches
CURRENT_BATCH=0
ACTIVE_JOBS=()

for idx in "${!ASSIGNMENTS[@]}"; do
    assignment_info="${ASSIGNMENTS[$idx]}"
    IFS=':' read -r assignment_name script_name <<< "$assignment_info"
    
    current_num=$((idx + 1))
    
    # Wait for a slot if we've reached max parallel jobs
    while [ ${#ACTIVE_JOBS[@]} -ge $MAX_PARALLEL_JOBS ]; do
        # Check for completed jobs
        NEW_ACTIVE_JOBS=()
        for job_pid in "${ACTIVE_JOBS[@]}"; do
            if kill -0 "$job_pid" 2>/dev/null; then
                NEW_ACTIVE_JOBS+=("$job_pid")
            else
                # Job completed, wait for it to finish
                wait "$job_pid" 2>/dev/null || true
            fi
        done
        ACTIVE_JOBS=("${NEW_ACTIVE_JOBS[@]}")
        
        # If still at max, wait a bit before checking again
        if [ ${#ACTIVE_JOBS[@]} -ge $MAX_PARALLEL_JOBS ]; then
            sleep 1
        fi
    done
    
    # Start this assignment in background
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}▶️  [${current_num}/${TOTAL_ASSIGNMENTS}] Starting: ${assignment_name}${NC}"
    echo ""
    
    run_assignment "$assignment_name" "$script_name" "$current_num" "$TOTAL_ASSIGNMENTS" &
    JOB_PID=$!
    ACTIVE_JOBS+=("$JOB_PID")
done

# Wait for all remaining jobs to complete
echo -e "${CYAN}Waiting for all jobs to complete...${NC}"
echo ""
for job_pid in "${ACTIVE_JOBS[@]}"; do
    wait "$job_pid" 2>/dev/null || true
done

# Collect results
for idx in "${!ASSIGNMENTS[@]}"; do
    assignment_info="${ASSIGNMENTS[$idx]}"
    IFS=':' read -r assignment_name script_name <<< "$assignment_info"
    
    result_file="/tmp/ci-result-${assignment_name}.txt"
    if [ -f "$result_file" ]; then
        result_line=$(head -n 1 "$result_file")
        # Read all lines to determine status and log file
        # Format: first line = result message, second line = "SUCCESS" or "FAILED", third line (if FAILED) = log file
        line_count=$(wc -l < "$result_file" | tr -d ' ')
        if [ "$line_count" -ge 2 ]; then
            status=$(sed -n '2p' "$result_file")
            if [ "$status" = "SUCCESS" ]; then
                echo -e "${GREEN}${result_line}${NC}"
                RESULTS+=("${result_line}")
            else
                # Failed - check if there's a log file path on line 3
                echo -e "${RED}${result_line}${NC}"
                if [ "$line_count" -ge 3 ]; then
                    log_file=$(sed -n '3p' "$result_file")
                    if [ -n "$log_file" ]; then
                        echo -e "${YELLOW}   Check log: ${log_file}${NC}"
                    fi
                else
                    echo -e "${YELLOW}   Check log: /tmp/ci-${assignment_name}.log${NC}"
                fi
                RESULTS+=("${result_line}")
            fi
        else
            # Fallback if file format is unexpected
            echo -e "${YELLOW}⚠️  ${assignment_name} - Result file format unexpected${NC}"
            RESULTS+=("⚠️  ${assignment_name} - Result file format unexpected")
        fi
        rm -f "$result_file"
    fi
done

OVERALL_END_TIME=$(date +%s)
OVERALL_DURATION=$((OVERALL_END_TIME - OVERALL_START_TIME))
OVERALL_MINS=$((OVERALL_DURATION / 60))
OVERALL_SECS=$((OVERALL_DURATION % 60))

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 CI Summary:${NC}"
echo ""
for result in "${RESULTS[@]}"; do
    echo "  $result"
done
echo ""
if [ $OVERALL_MINS -gt 0 ]; then
    echo -e "${BLUE}Total time: ${OVERALL_MINS}m ${OVERALL_SECS}s${NC}"
else
    echo -e "${BLUE}Total time: ${OVERALL_SECS}s${NC}"
fi
echo ""
