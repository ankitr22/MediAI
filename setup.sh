#!/usr/bin/env bash
# =============================================================================
# MediAI — Local Development Setup (Linux/Mac)
# For EC2 deployment use deploy.sh instead.
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }

echo "=== MediAI Local Setup ==="

# ── Backend ───────────────────────────────────────────────────────
info "Setting up Python virtual environment..."
cd backend
python3 -m venv venv
source venv/bin/activate

info "Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
success "Backend dependencies installed"

cd ..

# ── Frontend ──────────────────────────────────────────────────────
info "Installing frontend dependencies..."
cd frontend
npm install --silent
success "Frontend dependencies installed"
cd ..

echo ""
success "Setup complete!"
echo ""
echo "To start the backend:"
echo "  cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000"
echo ""
echo "To start the frontend:"
echo "  cd frontend && npm run dev"
echo ""
echo "Or use Docker (recommended):"
echo "  docker compose up -d --build"
echo ""
echo "To ingest a PDF into Pinecone:"
echo "  cd backend && source venv/bin/activate && python ingest.py /path/to/medical.pdf"
