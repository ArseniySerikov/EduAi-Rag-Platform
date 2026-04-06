from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentOut
from app.utils.deps import get_current_user, get_admin_user
from app.services.doc_service import ingest_document, delete_document_files

router = APIRouter()
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/plain",
    "text/markdown",
    "text/csv",}


@router.get("", response_model=list[DocumentOut])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),):
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    mime_type = file.content_type or "application/octet-stream"
    # some browsers send generic mime types for xlsx also check extension
    filename = file.filename or ""
    ext_lower = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    ext_to_mime = {
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "xls": "application/vnd.ms-excel",
        "csv": "text/csv",}
    if mime_type not in ALLOWED_MIME_TYPES and ext_lower in ext_to_mime:
        mime_type = ext_to_mime[ext_lower]

    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {mime_type}. Allowed: PDF, DOCX, XLSX, CSV, TXT, MD",)

    content = await file.read()
    from app.config import get_settings
    settings = get_settings()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_FILE_SIZE_MB} MB limit")

    document = await ingest_document(
        file_content=content,
        original_name=file.filename or "unknown",
        mime_type=mime_type,
        uploader_id=current_user.id,
        db=db,)
    return DocumentOut.model_validate(document)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    await delete_document_files(document.file_path)
    await db.delete(document)
