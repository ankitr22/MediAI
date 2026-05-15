import os
import logging
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user
from models import User

load_dotenv()

logger = logging.getLogger(__name__)

PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "medidata")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
EMBED_MODEL = "models/gemini-embedding-001"
EMBED_DIMENSION = 384
TOP_K = 5

router = APIRouter(prefix="/rag", tags=["rag"])

# ── Lazy-initialise heavy clients so startup never crashes ────────
_genai_client = None
_pinecone_index = None


def get_genai_client():
    global _genai_client
    if _genai_client is None:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured on the server.")
        from google import genai
        _genai_client = genai.Client(api_key=GEMINI_API_KEY)
    return _genai_client


def get_pinecone_index():
    global _pinecone_index
    if _pinecone_index is None:
        if not PINECONE_API_KEY:
            logger.warning("PINECONE_API_KEY not set — RAG context will be unavailable.")
            return None
        try:
            from pinecone import Pinecone
            pc = Pinecone(api_key=PINECONE_API_KEY)
            existing = [idx.name for idx in pc.list_indexes()]
            if PINECONE_INDEX_NAME not in existing:
                logger.warning(
                    "Pinecone index '%s' does not exist yet. "
                    "Run ingest.py to populate it. Chat will work without context.",
                    PINECONE_INDEX_NAME,
                )
                return None
            _pinecone_index = pc.Index(PINECONE_INDEX_NAME)
        except Exception as exc:
            logger.error("Failed to connect to Pinecone: %s", exc)
            return None
    return _pinecone_index


# ── Helpers ───────────────────────────────────────────────────────

def embed_query(text: str):
    try:
        client = get_genai_client()
        result = client.models.embed_content(
            model=EMBED_MODEL,
            contents=text,
            config={
                "task_type": "RETRIEVAL_QUERY",
                "output_dimensionality": EMBED_DIMENSION,
            },
        )
        return result.embeddings[0].values
    except Exception as exc:
        logger.error("Embedding failed: %s", exc)
        return None


def retrieve_context(query: str) -> str:
    index = get_pinecone_index()
    if index is None:
        return ""
    vector = embed_query(query)
    if vector is None:
        return ""
    try:
        results = index.query(vector=vector, top_k=TOP_K, include_metadata=True)
        contexts = [
            match["metadata"]["text"]
            for match in results["matches"]
            if "text" in match.get("metadata", {})
        ]
        return "\n\n---\n\n".join(contexts)
    except Exception as exc:
        logger.error("Pinecone query failed: %s", exc)
        return ""


# ── Route ─────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    history: list = []


@router.post("/chat")
def chat(req: ChatRequest, current_user: User = Depends(get_current_user)):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        context = retrieve_context(req.question)

        context_note = (
            context
            if context
            else "No relevant context found in the medical encyclopedia for this query."
        )

        prompt = (
            "You are a knowledgeable medical assistant trained on the Gale Encyclopedia of Medicine "
            "(2nd Edition).\n"
            "Use the following retrieved context to answer the user's question accurately and concisely.\n"
            "If the context doesn't contain enough information, say so honestly.\n"
            "Always recommend consulting a qualified doctor for personal medical advice.\n\n"
            f"Retrieved Context:\n{context_note}\n\n"
            f"Question: {req.question}"
        )

        client = get_genai_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        return {
            "answer": response.text,
            "context_used": context[:500] + "..." if len(context) > 500 else context,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("RAG chat error")
        raise HTTPException(status_code=500, detail=str(exc))
