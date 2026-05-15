#!/usr/bin/env bash
set -e

echo "======================================"
echo " MediAI EC2 Setup - Step 2: Start App"
echo "======================================"

cd /home/ubuntu/MediAI

# Stop existing containers if any
if sudo docker compose ps -q 2>/dev/null | grep -q .; then
    echo "Stopping existing containers..."
    sudo docker compose down --remove-orphans 2>/dev/null || true
fi

echo "Building Docker images (this takes 5-15 min first time)..."
sudo docker compose build --no-cache

echo "Starting all services..."
sudo docker compose up -d

echo "Waiting for backend to be healthy..."
MAX=150
WAITED=0
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
    if [ $WAITED -ge $MAX ]; then
        echo "ERROR: Backend not healthy after ${MAX}s. Logs:"
        sudo docker compose logs backend --tail=60
        exit 1
    fi
    echo "  Waiting... ${WAITED}s"
    sleep 5
    WAITED=$((WAITED+5))
done

echo ""
echo "======================================"
sudo docker compose ps
echo "======================================"
echo "APP_STARTED_OK"
