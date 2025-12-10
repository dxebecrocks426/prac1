#!/bin/bash
# Quick script to check Docker Desktop startup progress

echo "🔍 Docker Desktop Status Check"
echo "================================"
echo ""

# Check if Docker Desktop app is running
if pgrep -f "Docker Desktop" > /dev/null; then
    echo "✅ Docker Desktop app is running"
else
    echo "❌ Docker Desktop app is not running"
fi
echo ""

# Check VM file size
VM_FILE="$HOME/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw"
if [ -f "$VM_FILE" ]; then
    SIZE=$(ls -lh "$VM_FILE" | awk '{print $5}')
    echo "📦 VM File: $SIZE (target: ~60GB)"
    echo "   Location: $VM_FILE"
else
    echo "⏳ VM File: Not created yet (Docker is initializing...)"
fi
echo ""

# Check Docker daemon
echo "🐳 Docker Daemon Status:"
if docker info >/dev/null 2>&1; then
    echo "✅ Docker daemon is READY!"
    echo ""
    docker info | head -5
else
    echo "⏳ Docker daemon is starting..."
    echo "   (This is normal - VM is still being created)"
fi
echo ""

# Check Docker processes
echo "🔄 Docker Processes:"
DOCKER_PROCS=$(ps aux | grep -i "com.docker" | grep -v grep | wc -l | tr -d ' ')
echo "   Running processes: $DOCKER_PROCS"
echo ""

# Check recent logs
LOG_FILE="$HOME/Library/Containers/com.docker.docker/Data/log/vm/console.log"
if [ -f "$LOG_FILE" ]; then
    echo "📋 Recent VM Logs (last 3 lines):"
    tail -3 "$LOG_FILE" | sed 's/^/   /'
else
    echo "📋 VM logs not available yet"
fi
echo ""

echo "💡 Tip: Check the Docker Desktop app icon in your menu bar"
echo "   It will show 'Docker Desktop is starting...' until ready"

