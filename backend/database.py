import os
import time
import logging
from urllib.parse import quote_plus
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MYSQL_USER     = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "Admin@123")
MYSQL_HOST     = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT     = os.getenv("MYSQL_PORT", "3306")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "medical_app")

# URL-encode password to handle special chars like @, #, etc.
DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{quote_plus(MYSQL_PASSWORD)}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
)

Base = declarative_base()

# Create engine lazily — no connection attempt at import time
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def wait_for_db(retries: int = 30, delay: int = 5):
    """Called from app startup — waits until MySQL is ready."""
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database ready on attempt %d.", attempt)
            return
        except Exception as exc:
            logger.warning(
                "DB not ready (attempt %d/%d): %s — retrying in %ds…",
                attempt, retries, exc, delay,
            )
            time.sleep(delay)
    raise RuntimeError("Database did not become ready in time.")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
