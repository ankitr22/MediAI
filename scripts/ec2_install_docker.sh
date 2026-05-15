#!/usr/bin/env bash
set -e

echo "======================================"
echo " MediAI EC2 Setup - Step 1: Docker"
echo "======================================"

sudo apt-get update -qq

if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    sudo apt-get install -y -qq ca-certificates curl gnupg lsb-release
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "Docker installed OK"
else
    echo "Docker already installed: $(docker --version)"
fi

sudo usermod -aG docker ubuntu 2>/dev/null || true

sudo tee /etc/docker/daemon.json > /dev/null << 'DOCKEREOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "3" }
}
DOCKEREOF
sudo systemctl restart docker
sleep 3

if ! swapon --show 2>/dev/null | grep -q /swapfile; then
    echo "Creating 2GB swap..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

sudo apt-get install -y -qq curl unzip

echo "Docker: $(docker --version)"
echo "Compose: $(docker compose version)"
echo "DOCKER_SETUP_DONE"
