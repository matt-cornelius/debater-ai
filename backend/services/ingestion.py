import voyageai
import tiktoken
from config import settings
from db import get_db

CHUNK_SIZE = 512
CHUNK_OVERLAP = 50
EMBED_MODEL = "voyage-3-lite"
BATCH_SIZE = 100  # Voyage AI max per request

_enc = tiktoken.get_encoding("cl100k_base")
_vo = voyageai.Client(api_key=settings.voyage_api_key)


def chunk_text(text: str) -> list[str]:
    tokens = _enc.encode(text)
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + CHUNK_SIZE, len(tokens))
        chunks.append(_enc.decode(tokens[start:end]))
        if end == len(tokens):
            break
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    embeddings = []
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        result = _vo.embed(batch, model=EMBED_MODEL)
        embeddings.extend(result.embeddings)
    return embeddings


def store_chunks(
    document_id: str,
    user_id: str,
    chunks: list[str],
    embeddings: list[list[float]],
) -> None:
    db = get_db()
    rows = [
        {
            "document_id": document_id,
            "user_id": user_id,
            "chunk_text": chunk,
            "chunk_index": i,
            "embedding": embedding,
        }
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]
    for i in range(0, len(rows), 100):
        db.table("document_chunks").insert(rows[i : i + 100]).execute()
