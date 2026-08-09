#!/usr/bin/env bash
# cleanup-agent-pnmedia.sh
# Dọn dẹp an toàn các rác sinh ra trong quá trình build và chạy agent.pnmediaplus.com

echo "Starting project-scoped cleanup for agent.pnmediaplus.com..."

# 1. Xóa các container đã thoát (dừng) của project này
echo "Cleaning stopped containers..."
docker container prune -f --filter "label=com.pnmediaplus.project=agent.pnmediaplus.com"

# 2. Xóa các image (dangling/dư thừa) được build với label của project này (cũ hơn 7 ngày)
echo "Cleaning old images..."
docker image prune -af --filter "label=com.pnmediaplus.project=agent.pnmediaplus.com" --filter "until=168h"

# 3. Xóa cache builder (cũ hơn 7 ngày) để tránh đầy ổ cứng
echo "Cleaning builder cache..."
docker builder prune -af --filter "until=168h"

echo "Cleanup completed successfully!"
