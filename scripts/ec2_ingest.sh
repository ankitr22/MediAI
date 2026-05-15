#!/usr/bin/env bash
set -e

echo "======================================"
echo " MediAI - PDF Ingestion into Pinecone"
echo "======================================"

cd /home/ubuntu/MediAI

echo "Ingesting GaleMedicineV1AB.pdf..."
sudo docker compose exec -T backend python ingest.py /app/GaleMedicineV1AB.pdf

echo "Ingesting GaleMedicineV2CF.pdf..."
sudo docker compose exec -T backend python ingest.py /app/GaleMedicineV2CF.pdf

echo "INGESTION_DONE"
