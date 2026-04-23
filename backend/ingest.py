"""
Run this script to ingest the Medical Encyclopedia PDF into Pinecone.
Saves progress locally so it resumes from where it left off each day.
Usage: python ingest.py
"""
import os
import json
import fitz  # PyMuPDF
from dotenv import dotenv_values
from pinecone import Pinecone, ServerlessSpec
from google import genai
import time

config = dotenv_values(os.path.join(os.path.dirname(__file__), ".env"))

PINECONE_API_KEY = config.get("PINECONE_API_KEY")
PINECONE_INDEX_NAME = config.get("PINECONE_INDEX_NAME", "medical-encyclopedia")
GEMINI_API_KEY = config.get("GEMINI_API_KEY")
PDF_PATH = "/Users/aditya/Desktop/CapstoneProject/Medical_book.pdf"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100
EMBED_MODEL = "models/gemini-embedding-001"
DIMENSION = 3072
BATCH_SIZE = 100
PROGRESS_FILE = os.path.join(os.path.dirname(__file__), "ingest_progress.json")

client = genai.Client(api_key=GEMINI_API_KEY)

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            data = json.load(f)
            print(f"Resuming from chunk {data['last_chunk']} ({data['last_chunk']} already done)")
            return data["last_chunk"]
    return 0

def save_progress(last_chunk: int):
    with open(PROGRESS_FILE, "w") as f:
        json.dump({"last_chunk": last_chunk}, f)

def extract_text_chunks(pdf_path: str):
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()
    chunks = []
    start = 0
    while start < len(full_text):
        end = start + CHUNK_SIZE
        chunk = full_text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    print(f"Extracted {len(chunks)} chunks from PDF.")
    return chunks

def main():
    print("Connecting to Pinecone...")
    pc = Pinecone(api_key=PINECONE_API_KEY)

    existing = [idx.name for idx in pc.list_indexes()]
    if PINECONE_INDEX_NAME not in existing:
        print(f"Creating index '{PINECONE_INDEX_NAME}'...")
        pc.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
        time.sleep(10)
    else:
        print(f"Index '{PINECONE_INDEX_NAME}' already exists.")

    index = pc.Index(PINECONE_INDEX_NAME)

    print("Extracting text from PDF...")
    chunks = extract_text_chunks(PDF_PATH)

    start_from = load_progress()
    if start_from >= len(chunks):
        print("All chunks already ingested. Nothing to do.")
        return

    print(f"Embedding chunks {start_from} to {len(chunks)}...")
    batch_vectors = []
    last_saved = start_from

    for i in range(start_from, len(chunks)):
        try:
            result = client.models.embed_content(
                model=EMBED_MODEL,
                contents=chunks[i],
                config={"task_type": "RETRIEVAL_DOCUMENT"}
            )
            batch_vectors.append({
                "id": f"chunk-{i}",
                "values": result.embeddings[0].values,
                "metadata": {"text": chunks[i]}
            })

            if (i - start_from + 1) % 10 == 0:
                print(f"  Embedded {i+1}/{len(chunks)}")

            # Upsert in batches
            if len(batch_vectors) >= BATCH_SIZE:
                index.upsert(vectors=batch_vectors)
                print(f"  Upserted up to chunk {i+1}")
                save_progress(i + 1)
                last_saved = i + 1
                batch_vectors = []

            time.sleep(0.1)

        except Exception as e:
            print(f"\n  Quota/error at chunk {i}: {e}")
            # Upsert whatever we have so far
            if batch_vectors:
                index.upsert(vectors=batch_vectors)
                save_progress(i)
                print(f"  Progress saved at chunk {i}. Re-run tomorrow to continue.")
            else:
                save_progress(last_saved)
                print(f"  Progress saved at chunk {last_saved}. Re-run tomorrow to continue.")
            return

    # Upsert remaining
    if batch_vectors:
        index.upsert(vectors=batch_vectors)
        save_progress(len(chunks))

    print("Ingestion complete!")
    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)

if __name__ == "__main__":
    main()
