# =============================================================================
# MediAI — Makefile
# =============================================================================
# Local commands:
#   make up          — build and start all services
#   make down        — stop all services
#   make logs        — follow all logs
#   make restart     — restart all services
#   make rebuild     — force rebuild all images
#   make status      — show container status
#   make shell-back  — open shell in backend container
#   make ingest PDF=/path/to/file.pdf  — run PDF ingestion
#
# Deploy commands:
#   make deploy IP=<ec2-ip> KEY=<key.pem>
#   make deploy IP=<ec2-ip> KEY=<key.pem> PDF=/path/to/medical.pdf
# =============================================================================

.PHONY: up down logs restart rebuild status shell-back shell-front ingest deploy clean help

# ── Local ─────────────────────────────────────────────────────────

up:
	docker compose up -d --build
	@echo ""
	@echo "  Frontend: http://localhost"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/docs"

down:
	docker compose down

logs:
	docker compose logs -f

restart:
	docker compose restart

rebuild:
	docker compose down
	docker compose build --no-cache
	docker compose up -d

status:
	docker compose ps

shell-back:
	docker compose exec backend bash

shell-front:
	docker compose exec frontend sh

ingest:
ifndef PDF
	$(error PDF is required. Usage: make ingest PDF=/path/to/medical.pdf)
endif
	docker compose exec backend python ingest.py /app/$(notdir $(PDF))

clean:
	docker compose down -v --remove-orphans
	docker system prune -f

# ── Deploy ────────────────────────────────────────────────────────

deploy:
ifndef IP
	$(error IP is required. Usage: make deploy IP=<ec2-ip> KEY=<key.pem>)
endif
ifndef KEY
	$(error KEY is required. Usage: make deploy IP=<ec2-ip> KEY=<key.pem>)
endif
ifdef PDF
	bash deploy.sh --ip $(IP) --key $(KEY) --pdf $(PDF)
else
	bash deploy.sh --ip $(IP) --key $(KEY)
endif

help:
	@echo ""
	@echo "MediAI Makefile Commands:"
	@echo "  make up                              Start locally"
	@echo "  make down                            Stop locally"
	@echo "  make logs                            Follow logs"
	@echo "  make rebuild                         Force rebuild"
	@echo "  make status                          Container status"
	@echo "  make ingest PDF=/path/to/file.pdf    Ingest PDF"
	@echo "  make deploy IP=x.x.x.x KEY=key.pem  Deploy to EC2"
	@echo "  make deploy IP=x.x.x.x KEY=key.pem PDF=/path/to/file.pdf"
	@echo ""
