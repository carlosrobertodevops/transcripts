#!/usr/bin/env bash
# Local Docker Desktop cleanup for Mac.
# Run: bash scripts/docker-cleanup-local.sh
set -e

echo "=== Disk before ==="
docker system df
echo ""

echo "=== Stop & remove all containers ==="
docker ps -aq | xargs -r docker rm -f

echo "=== Prune everything not in use (volumes preserved) ==="
docker system prune -af

echo "=== Builder cache prune ==="
docker builder prune -af

echo "=== Image prune (dangling + unused) ==="
docker image prune -af

echo "=== Volume prune (DANGEROUS — preserves named volumes only if container exists) ==="
read -p "Prune unused volumes? Will delete data. (y/N) " yn
if [[ "$yn" =~ ^[Yy]$ ]]; then
  docker volume prune -af
else
  echo "Skipped volume prune"
fi

echo ""
echo "=== Disk after ==="
docker system df

echo ""
echo "✓ Local Docker cleanup complete"
echo ""
echo "If still ENOSPC, increase Docker Desktop disk:"
echo "  Settings → Resources → Advanced → Disk image size → raise 64GB+"
