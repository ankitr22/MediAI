#!/usr/bin/env bash
# =============================================================================
# MediAI — EC2 Server Setup Script
# Run this DIRECTLY on the EC2 instance (not from your local machine).
#
# Usage (on EC2):
#   curl -fsSL https://raw.githubusercontent.com/ankitr22/MediAI/main/ec2-setup.sh | bash
#   OR after uploading:
#   chmod +x ec2-setup.sh && ./ec2-setup.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }

info "Starting MediAI EC2 setup..."

# ── System update ─────────────────────────────────────────────────
info "Updating system packages..."
sudo apt-get update -qq && sudo apt-get upgrade -y -qq

# ── Install Docker ────────────────────────────────────────────────
if command -v docker &>/dev/null; then
    success "Docker already installed: $(docker --version)"
else
    info "Installing Docker..."
    sudo apt-get install -y -qq ca-certificates curl gnupg lsb-release
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -qq
    sudo apt-get install -y -qq \
        docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker "$USER"
    success "Docker installed: $(docker --version)"
fi

# ── Install useful tools ──────────────────────────────────────────
info "Installing utilities..."
sudo apt-get install -y -qq git curl wget htop unzip

# ── Swap space (important for t3.medium with TensorFlow) ─────────
if ! swapon --show | grep -q /swapfile; then
    info "Creating 2GB swap space (helps with TensorFlow memory)..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    success "Swap enabled: $(free -h | grep Swap)"
else
    success "Swap already configured"
fi

# ── Docker daemon config (log rotation) ──────────────────────────
info "Configuring Docker log rotation..."
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
EOF
sudo systemctl restart docker
success "Docker log rotation configured"

# ── UFW firewall ──────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
    info "Configuring UFW firewall..."
    sudo ufw allow 22/tcp   comment 'SSH'
    sudo ufw allow 80/tcp   comment 'HTTP Frontend'
    sudo ufw allow 8000/tcp comment 'Backend API'
    sudo ufw --force enable
    success "UFW configured"
fi

echo ""
success "EC2 setup complete!"
echo ""
echo "Next steps:"
echo "  1. Upload your project: scp or git clone into ~/MediAI"
echo "  2. Edit .env: set VITE_API_URL and ALLOWED_ORIGINS to your EC2 IP"
echo "  3. Run: cd ~/MediAI && docker compose up -d --build"
echo ""
warn "NOTE: Log out and back in for docker group to take effect (or run: newgrp docker)"
