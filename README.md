# MediAI - Medical Intelligence Platform

A full-stack medical AI platform with RAG-based medical Q&A, skin disease classification, and patient record management.

## Stack
- Frontend: React + Vite + TailwindCSS
- Backend: FastAPI (Python)
- Database: MySQL
- Vector DB: Pinecone
- LLM: Gemini 1.5 Flash
- Classifier: MobileNetV2 (TensorFlow/Keras)

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL running locally (user: root, password: admin1234)

### Step 1 — MySQL
```bash
mysql -u root -padmin1234 -e "CREATE DATABASE IF NOT EXISTS medical_app;"
```

### Step 2 — Backend
```bash
cd medical-app/backend
pip install -r requirements.txt
```

### Step 3 — Ingest PDF into Pinecone (run ONCE)
```bash
cd medical-app/backend
python ingest.py
```
This will take 10–30 minutes depending on PDF size.

### Step 4 — Start Backend
```bash
cd medical-app/backend
uvicorn main:app --reload --port 8000
```

### Step 5 — Frontend
```bash
cd medical-app/frontend
npm install
npm run dev
```

Open http://localhost:5173

## Features
- **Login/Register** — JWT-based authentication
- **Medical Chat** — RAG chatbot grounded in Gale Encyclopedia of Medicine
- **Skin Classifier** — MobileNetV2 classifies 7 skin disease types from uploaded photos
- **Patient Records** — Full CRUD for patients and their medical history

## Notes
- The skin classifier uses ImageNet pretrained MobileNetV2 weights in demo mode.
  To use fine-tuned weights, place `skin_model_weights.h5` in the `backend/` folder.
- All API keys are in `backend/.env`
