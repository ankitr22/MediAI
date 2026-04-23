#!/bin/bash
echo "=== MediAI Setup ==="

echo ""
echo "1. Setting up MySQL database..."
mysql -u root -padmin1234 -e "CREATE DATABASE IF NOT EXISTS medical_app;" 2>/dev/null
echo "   Database 'medical_app' ready."

echo ""
echo "2. Installing Python dependencies..."
cd backend
pip install -r requirements.txt

echo ""
echo "3. Running PDF ingestion into Pinecone (this may take 10-20 minutes)..."
python ingest.py

echo ""
echo "=== Backend ready. ==="
echo "Run backend: cd backend && uvicorn main:app --reload --port 8000"
echo ""
echo "4. Installing frontend dependencies..."
cd ../frontend
npm install

echo ""
echo "=== Frontend ready. ==="
echo "Run frontend: cd frontend && npm run dev"
