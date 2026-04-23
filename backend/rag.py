import os
from dotenv import load_dotenv
from pinecone import Pinecone
from google import genai
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user
from models import User

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "medical-encyclopedia")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMBED_MODEL = "models/gemini-embedding-001"
TOP_K = 5

client = genai.Client(api_key=GEMINI_API_KEY)
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)

router = APIRouter(prefix="/rag", tags=["rag"])

class ChatRequest(BaseModel):
    question: str
    history: list = []

def embed_query(text: str):
    try:
        result = client.models.embed_content(
            model="models/gemini-embedding-001",
            contents=text,
            config={"task_type": "RETRIEVAL_QUERY"}
        )
        return result.embeddings[0].values
    except Exception:
        return None

def retrieve_context(query: str) -> str:
    vector = embed_query(query)
    if vector is None:
        return ""
    try:
        results = index.query(vector=vector, top_k=TOP_K, include_metadata=True)
        contexts = [match["metadata"]["text"] for match in results["matches"] if "text" in match["metadata"]]
        return "\n\n---\n\n".join(contexts)
    except Exception:
        return ""

@router.post("/chat")
def chat(req: ChatRequest, current_user: User = Depends(get_current_user)):
    try:
        context = retrieve_context(req.question)

        if not context:
            context = "No relevant context found in the medical encyclopedia for this query."

        prompt = f"""You are a knowledgeable medical assistant trained on the Gale Encyclopedia of Medicine (2nd Edition).
Use the following retrieved context to answer the user's question accurately and concisely.
If the context doesn't contain enough information, say so honestly.
Always recommend consulting a qualified doctor for personal medical advice.

Retrieved Context:
{context}

Question: {req.question}"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return {
            "answer": response.text,
            "context_used": context[:500] + "..." if len(context) > 500 else context
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
