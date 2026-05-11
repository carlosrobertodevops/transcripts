#!/usr/bin/env bash
# Cleanup script for Easypanel server (77.42.72.103) to free disk space
# Removes unused Docker images, containers, build cache and old logs
# Run on Easypanel host as root before next deploy
# Usage: ssh root@77.42.72.103 < scripts/easypanel-cleanup.sh
# or: scp scripts/easypanel-cleanup.sh root@77.42.72.103:/tmp/ && ssh root@77.42.72.103 bash /tmp/easypanel-cleanup.sh

set -e

echo "=== Disk usage BEFORE cleanup ==="
df -h / 2>/dev/null | head -2

echo ""
echo "=== Docker system prune (unused images, containers, networks) ==="
docker system prune -af --volumes=false || echo "⚠ Docker system prune failed (may be normal if no unused items)"

echo ""
echo "=== Docker builder prune (build cache) ==="
docker builder prune -af || echo "⚠ Docker builder prune failed"

echo ""
echo "=== Journalctl vacuum (keep last 7 days) ==="
journalctl --vacuum-time=7d 2>/dev/null || echo "⚠ Journalctl not available"

echo ""
echo "=== Remove old rotated logs (older than 7 days) ==="
find /var/log -name "*.log.*" -mtime +7 -delete 2>/dev/null || echo "⚠ No old logs to delete"

echo ""
echo "=== Remove old Easypanel logs (older than 14 days) ==="
find /etc/easypanel -name "*.log" -mtime +14 -delete 2>/dev/null || echo "⚠ No Easypanel logs to delete"

echo ""
echo "=== Easypanel buildcache (>7 days old) ==="
find /etc/easypanel -name ".buildcache" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || echo "⚠ No Easypanel buildcache to delete"

echo ""
echo "=== Containerd snapshots prune ==="
ctr -n moby snapshot prune 2>/dev/null || echo "⚠ Containerd not available"

echo ""
echo "=== Truncate large container logs (>100M) ==="
find /var/lib/docker/containers -name "*-json.log" -size +100M -exec truncate -s 0 {} \; 2>/dev/null || echo "⚠ No large logs to truncate"

echo ""
echo "=== Disk usage AFTER cleanup ==="
df -h /

echo ""
echo "✓ Cleanup complete. If still ENOSPC, check /var/lib/docker/overlay2/ size."
