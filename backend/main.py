import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine, wait_for_db
from auth import router as auth_router
from rag import router as rag_router
from skin import router as skin_router
from patients import router as patients_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Wait for MySQL then create tables
    logger.info("Waiting for database...")
    wait_for_db()
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Startup complete.")
    yield
    logger.info("Shutting down.")


app = FastAPI(title="Medical AI Platform", version="1.0.0", lifespan=lifespan)

# ── CORS ──────────────────────────────────────────────────────────
_raw = os.getenv("ALLOWED_ORIGINS", "")
extra_origins = [o.strip() for o in _raw.split(",") if o.strip()]

DEFAULT_ORIGINS = [
    "http://localhost",
    "http://localhost:80",
    "http://localhost:5173",
    "http://localhost:3000",
]

all_origins = list(dict.fromkeys(DEFAULT_ORIGINS + extra_origins))
logger.info("CORS allowed origins: %s", all_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(rag_router)
app.include_router(skin_router)
app.include_router(patients_router)


@app.get("/")
def root():
    return {"message": "Medical AI Platform API is running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}
