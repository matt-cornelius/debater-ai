from io import BytesIO

import fitz  # PyMuPDF
from docx import Document

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def extract_text(file_bytes: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        return _from_pdf(file_bytes)
    if content_type == DOCX_MIME:
        return _from_docx(file_bytes)
    return file_bytes.decode("utf-8", errors="ignore")


def _from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


def _from_docx(file_bytes: bytes) -> str:
    doc = Document(BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
