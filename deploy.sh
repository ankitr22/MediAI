#!/usr/bin/env bash
# =============================================================================
# MediAI — Automated AWS EC2 Deployment Script
# =============================================================================
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh --ip <EC2_PUBLIC_IP> --key <path/to/key.pem>
#
# Optional flags:
#   --user   SSH user (default: ubuntu)
#   --pdf    Path to medical PDF to ingest into Pinecone after deploy
#
# Example:
#   ./deploy.sh --ip 13.235.10.20 --key ~/Downloads/mediAI-key.pem
#   ./deploy.sh --ip 13.235.10.20 --key ~/Downloads/mediAI-key.pem --pdf ~/medical_book.pdf
# =============================================================================

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
step()    { echo -e "\n${CYAN}══════════════════════════════════════${NC}"; echo -e "${CYAN}  $*${NC}"; echo -e "${CYAN}══════════════════════════════════════${NC}"; }

# ── Defaults ──────────────────────────────────────────────────────
EC2_USER="ubuntu"
EC2_IP=""
KEY_FILE=""
PDF_PATH=""
REMOTE_DIR="/home/ubuntu/MediAI"

# ── Parse arguments ───────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --ip)   EC2_IP="$2";   shift 2 ;;
        --key)  KEY_FILE="$2"; shift 2 ;;
        --user) EC2_USER="$2"; shift 2 ;;
        --pdf)  PDF_PATH="$2"; shift 2 ;;
        *) error "Unknown argument: $1" ;;
    esac
done

# ── Validate required args ────────────────────────────────────────
[[ -z "$EC2_IP"   ]] && error "EC2 public IP is required. Use --ip <IP>"
[[ -z "$KEY_FILE" ]] && error "PEM key file is required. Use --key <path/to/key.pem>"
[[ ! -f "$KEY_FILE" ]] && error "Key file not found: $KEY_FILE"

SSH_OPTS="-i $KEY_FILE -o StrictHostKeyChecking=no -o ConnectTimeout=30"
SSH_CMD="ssh $SSH_OPTS $EC2_USER@$EC2_IP"
SCP_CMD="scp $SSH_OPTS"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       MediAI — EC2 Deployment            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
info "Target:   $EC2_USER@$EC2_IP"
info "Key:      $KEY_FILE"
[[ -n "$PDF_PATH" ]] && info "PDF:      $PDF_PATH"

# ── Step 1: Test SSH connection ───────────────────────────────────
step "Step 1/7 — Testing SSH connection"
$SSH_CMD "echo 'SSH OK'" || error "Cannot SSH into $EC2_IP. Check IP, key, and Security Group port 22."
success "SSH connection established"

# ── Step 2: Install Docker on EC2 ────────────────────────────────
step "Step 2/7 — Installing Docker & Docker Compose"
$SSH_CMD bash << 'REMOTE_INSTALL'
set -e
if command -v docker &>/dev/null; then
    echo "Docker already installed: $(docker --version)"
else
    echo "Installing Docker..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq ca-certificates curl gnupg lsb-release
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker ubuntu
    echo "Docker installed: $(docker --version)"
fi

# Ensure docker compose v2 works
if ! docker compose version &>/dev/null; then
    echo "Installing docker-compose standalone..."
    sudo curl -SL "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64" \
        -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi
echo "Docker Compose: $(docker compose version)"
REMOTE_INSTALL
success "Docker ready on EC2"

# ── Step 3: Update .env with EC2 IP ──────────────────────────────
step "Step 3/7 — Configuring .env for EC2 IP: $EC2_IP"

# Work on a temp copy of .env
cp .env .env.ec2

# Set VITE_API_URL and ALLOWED_ORIGINS to EC2 IP
sed -i.bak \
    -e "s|^VITE_API_URL=.*|VITE_API_URL=http://${EC2_IP}:8000|" \
    -e "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://${EC2_IP},http://${EC2_IP}:80,http://${EC2_IP}:8000|" \
    .env.ec2

success ".env.ec2 configured"

# ── Step 4: Upload project files ──────────────────────────────────
step "Step 4/7 — Uploading project to EC2"

# Create remote directory
$SSH_CMD "mkdir -p $REMOTE_DIR"

# Create a tar of the project (excluding heavy/unnecessary dirs)
info "Creating project archive..."
tar --exclude='.git' \
    --exclude='node_modules' \
    --exclude='frontend/dist' \
    --exclude='backend/__pycache__' \
    --exclude='backend/*.pyc' \
    --exclude='backend/venv' \
    --exclude='.env.ec2.bak' \
    --exclude='*.pem' \
    -czf /tmp/mediai_deploy.tar.gz .

info "Uploading archive (~$(du -sh /tmp/mediai_deploy.tar.gz | cut -f1))..."
$SCP_CMD /tmp/mediai_deploy.tar.gz $EC2_USER@$EC2_IP:/tmp/mediai_deploy.tar.gz

# Upload the EC2-specific .env
$SCP_CMD .env.ec2 $EC2_USER@$EC2_IP:$REMOTE_DIR/.env

# Extract on remote
$SSH_CMD bash << REMOTE_EXTRACT
set -e
cd $REMOTE_DIR
tar -xzf /tmp/mediai_deploy.tar.gz --overwrite
# The uploaded .env.ec2 is already at $REMOTE_DIR/.env — keep it
rm -f /tmp/mediai_deploy.tar.gz
echo "Files extracted to $REMOTE_DIR"
ls -la $REMOTE_DIR
REMOTE_EXTRACT

# Clean up local temp files
rm -f /tmp/mediai_deploy.tar.gz .env.ec2 .env.ec2.bak

success "Project uploaded"

# ── Step 5: Upload PDF if provided ───────────────────────────────
if [[ -n "$PDF_PATH" ]]; then
    step "Step 5/7 — Uploading PDF for Pinecone ingestion"
    PDF_FILENAME=$(basename "$PDF_PATH")
    info "Uploading $PDF_FILENAME..."
    $SCP_CMD "$PDF_PATH" $EC2_USER@$EC2_IP:$REMOTE_DIR/backend/$PDF_FILENAME
    success "PDF uploaded to $REMOTE_DIR/backend/$PDF_FILENAME"
else
    step "Step 5/7 — Skipping PDF upload (no --pdf provided)"
    warn "RAG chat will work but return 'no context' until you run ingest.py"
    warn "To ingest later: ssh into EC2 and run:"
    warn "  cd $REMOTE_DIR && docker compose exec backend python ingest.py /app/<your_pdf>"
fi

# ── Step 6: Build and start containers ───────────────────────────
step "Step 6/7 — Building and starting Docker containers"
info "This may take 5-15 minutes on first build (TensorFlow is large)..."

$SSH_CMD bash << REMOTE_BUILD
set -e
cd $REMOTE_DIR

# Stop any existing containers gracefully
if docker compose ps -q 2>/dev/null | grep -q .; then
    echo "Stopping existing containers..."
    docker compose down --remove-orphans
fi

# Build and start
echo "Building images..."
docker compose build --no-cache

echo "Starting services..."
docker compose up -d

echo "Waiting for services to be healthy..."
sleep 10

# Wait for backend health
MAX_WAIT=120
WAITED=0
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
    if [ \$WAITED -ge \$MAX_WAIT ]; then
        echo "Backend did not become healthy in time. Showing logs:"
        docker compose logs backend --tail=50
        exit 1
    fi
    echo "  Waiting for backend... (\${WAITED}s)"
    sleep 5
    WAITED=\$((WAITED + 5))
done
echo "Backend is healthy!"

# Show running containers
docker compose ps
REMOTE_BUILD

success "All containers running"

# ── Step 7: Run PDF ingestion if PDF was uploaded ─────────────────
if [[ -n "$PDF_PATH" ]]; then
    step "Step 7/7 — Running Pinecone PDF ingestion"
    PDF_FILENAME=$(basename "$PDF_PATH")
    info "Starting ingestion (this runs in background on EC2)..."
    $SSH_CMD bash << REMOTE_INGEST
set -e
cd $REMOTE_DIR
nohup docker compose exec -T backend python ingest.py /app/$PDF_FILENAME \
    > /tmp/ingest.log 2>&1 &
echo "Ingestion started in background. PID: \$!"
echo "Monitor with: tail -f /tmp/ingest.log"
REMOTE_INGEST
    success "Ingestion started in background on EC2"
    info "Monitor ingestion: ssh -i $KEY_FILE $EC2_USER@$EC2_IP 'tail -f /tmp/ingest.log'"
else
    step "Step 7/7 — Skipping ingestion (no PDF provided)"
fi

# ── Summary ───────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              🎉  DEPLOYMENT SUCCESSFUL  🎉               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Frontend (App):${NC}    http://${EC2_IP}"
echo -e "  ${CYAN}Backend API:${NC}       http://${EC2_IP}:8000"
echo -e "  ${CYAN}API Docs:${NC}          http://${EC2_IP}:8000/docs"
echo ""
echo -e "  ${YELLOW}Useful commands (run on EC2):${NC}"
echo -e "  ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo -e "  cd $REMOTE_DIR"
echo -e "  docker compose logs -f          # live logs"
echo -e "  docker compose ps               # container status"
echo -e "  docker compose restart backend  # restart backend"
echo -e "  docker compose down             # stop everything"
echo ""
echo -e "  ${YELLOW}Security Group — ensure these ports are open:${NC}"
echo -e "  22   (SSH), 80 (Frontend), 8000 (Backend API)"
echo ""
