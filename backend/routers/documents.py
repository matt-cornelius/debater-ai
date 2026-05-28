from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from auth import get_current_user
from db import get_db
from services.extraction import extract_text
from services.ingestion import chunk_text, embed_chunks, store_chunks

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Unsupported file type. Upload PDF, DOCX, or TXT.")

    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "File exceeds 10 MB limit.")

    raw_text = extract_text(data, file.content_type)
    if not raw_text.strip():
        raise HTTPException(400, "No text could be extracted from this file.")

    db = get_db()
    doc = (
        db.table("documents")
        .insert(
            {
                "user_id": user_id,
                "filename": file.filename,
                "file_type": file.content_type,
                "raw_text": raw_text,
            }
        )
        .execute()
    )
    document_id = doc.data[0]["id"]

    chunks = chunk_text(raw_text)
    embeddings = embed_chunks(chunks)
    store_chunks(document_id, user_id, chunks, embeddings)

    db.table("documents").update({"chunk_count": len(chunks)}).eq(
        "id", document_id
    ).execute()

    return {"id": document_id, "filename": file.filename, "chunk_count": len(chunks)}


@router.get("")
async def list_documents(user_id: str = Depends(get_current_user)):
    result = (
        get_db()
        .table("documents")
        .select("id, filename, file_type, chunk_count, uploaded_at")
        .eq("user_id", user_id)
        .order("uploaded_at", desc=True)
        .execute()
    )
    return result.data


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user_id: str = Depends(get_current_user),
):
    db = get_db()
    existing = (
        db.table("documents")
        .select("id")
        .eq("id", document_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(404, "Document not found.")

    db.table("documents").delete().eq("id", document_id).execute()
    return {"deleted": document_id}
