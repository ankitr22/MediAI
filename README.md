# MediAI — Medical AI Platform

Full-stack medical AI platform with **Login/Signup**, **RAG-based Chat** (Gemini + Pinecone), **Skin Disease Classifier**, and **Patient Records**.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TailwindCSS + nginx |
| Backend | FastAPI + SQLAlchemy + Uvicorn |
| Database | MySQL 8.0 (Docker internal) |
| AI/LLM | Google Gemini 2.5 Flash |
| Embeddings | Gemini Embedding 001 (384-dim) |
| Vector Store | Pinecone (`medidata` index) |
| Skin AI | TensorFlow MobileNetV2 (HAM10000) |
| Auth | JWT (python-jose + bcrypt) |

---

## ☁️ Deploy to AWS EC2 (Automated)

### Prerequisites
- AWS EC2 instance: **Ubuntu 22.04**, type **t3.medium or larger** (TensorFlow needs ≥4GB RAM)
- Security Group inbound rules: `22` (SSH), `80` (Frontend), `8000` (Backend API)
- Your `.pem` key file

### One-command deploy

```bash
# Make the script executable
chmod +x deploy.sh

# Deploy (replace with your actual values)
./deploy.sh --ip 13.235.10.20 --key ~/Downloads/your-key.pem

# Deploy + ingest a medical PDF into Pinecone
./deploy.sh --ip 13.235.10.20 --key ~/Downloads/your-key.pem --pdf ~/medical_book.pdf
```

Or using Make:
```bash
make deploy IP=13.235.10.20 KEY=~/Downloads/your-key.pem
make deploy IP=13.235.10.20 KEY=~/Downloads/your-key.pem PDF=~/medical_book.pdf
```

The script will automatically:
1. Install Docker on the EC2 instance
2. Configure `.env` with your EC2 IP
3. Upload the project
4. Build and start all containers
5. Run PDF ingestion in the background (if `--pdf` provided)

### After deployment

| Service | URL |
|---------|-----|
| Frontend App | `http://<EC2-IP>` |
| Backend API | `http://<EC2-IP>:8000` |
| API Docs (Swagger) | `http://<EC2-IP>:8000/docs` |

---

## 🖥️ Manual EC2 Setup (step by step)

If you prefer to do it manually:

```bash
# 1. SSH into your EC2 instance
ssh -i your-key.pem ubuntu@<EC2-IP>

# 2. Run the setup script
curl -fsSL https://raw.githubusercontent.com/ankitr22/MediAI/main/ec2-setup.sh | bash
# OR upload ec2-setup.sh and run: chmod +x ec2-setup.sh && ./ec2-setup.sh

# 3. Log out and back in (for docker group)
exit
ssh -i your-key.pem ubuntu@<EC2-IP>

# 4. Clone or upload the project
git clone https://github.com/ankitr22/MediAI.git
cd MediAI

# 5. Edit .env — set your EC2 IP
nano .env
# Change:
#   VITE_API_URL=http://<EC2-IP>:8000
#   ALLOWED_ORIGINS=http://<EC2-IP>,http://<EC2-IP>:80

# 6. Build and start
docker compose up -d --build

# 7. Check status
docker compose ps
docker compose logs -f
```

---

## 🚀 Run Locally with Docker

```bash
# Start all services
docker compose up -d --build

# Follow logs
docker compose logs -f

# Stop
docker compose down
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## 🛠️ Run Without Docker (Local Dev)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

pip install -r requirements.txt

# Ensure MySQL is running locally, then:
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev    # opens http://localhost:5173
```

---

## 📄 Ingest Medical PDF into Pinecone

The RAG chat requires a medical PDF to be ingested into Pinecone first.

```bash
# Via Docker (recommended)
docker compose exec backend python ingest.py /app/medical_book.pdf

# Or locally
cd backend
source venv/bin/activate
python ingest.py /path/to/medical_book.pdf
```

Progress is saved automatically — re-run the same command to resume if interrupted.

---

## 🔧 Useful Commands

```bash
make up                    # start locally
make down                  # stop
make logs                  # follow logs
make rebuild               # force rebuild all images
make status                # container status
make shell-back            # bash into backend container
make ingest PDF=book.pdf   # run ingestion

# EC2 management (SSH in first)
docker compose ps
docker compose logs -f backend
docker compose restart backend
docker compose down && docker compose up -d --build
```

---

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MYSQL_PASSWORD` | MySQL root password | `Admin@123` |
| `JWT_SECRET` | JWT signing secret | (set in .env) |
| `GEMINI_API_KEY` | Google Gemini API key | (set in .env) |
| `PINECONE_API_KEY` | Pinecone API key | (set in .env) |
| `PINECONE_INDEX_NAME` | Pinecone index name | `medidata` |
| `VITE_API_URL` | Backend URL baked into frontend | `http://localhost:8000` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | localhost variants |

> **Never commit `.env` to Git.** It's already in `.gitignore`.

---

## ⚠️ Notes

- **Skin classifier**: Runs in demo mode without `skin_model_weights.h5`. Place fine-tuned weights in `backend/` for real predictions.
- **RAG chat**: Returns "no context" until `ingest.py` has populated Pinecone.
- **Instance size**: Use **t3.medium** (4GB RAM) minimum. TensorFlow will OOM on t2.micro/t3.micro.
- **VITE_API_URL**: This is baked into the frontend bundle at build time. If you change the EC2 IP, rebuild with `docker compose build frontend`.
