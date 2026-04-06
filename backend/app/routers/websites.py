from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.document import Document
from app.models.user import User
from app.models.website_source import WebsiteSource
from app.schemas.website import WebsiteSourceCreate, WebsiteSourceOut, WebsiteSourceUpdate
from app.services.doc_service import delete_document_files
from app.services.website_service import parse_website_source, clear_rag
from app.utils.deps import get_admin_user

router = APIRouter()

def _default_title(url: str) -> str:
    host = urlparse(url).netloc or "website"
    return host

@router.get("", response_model=list[WebsiteSourceOut])
async def list_website_sources(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    result = await db.execute(select(WebsiteSource).order_by(WebsiteSource.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=WebsiteSourceOut, status_code=status.HTTP_201_CREATED)
async def create_website_source(
    payload: WebsiteSourceCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    existing = await db.execute(select(WebsiteSource).where(WebsiteSource.url == str(payload.url)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Website source already exists")

    source = WebsiteSource(
        url=str(payload.url),
        title=(payload.title or _default_title(str(payload.url))).strip(),
        is_enabled=payload.is_enabled,
        should_parse=payload.should_parse,
        last_status="created",)
    db.add(source)
    await db.flush()
    await db.refresh(source)
    return source


@router.patch("/{source_id}", response_model=WebsiteSourceOut)
async def update_website_source(
    source_id: int,
    payload: WebsiteSourceUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    source = await db.get(WebsiteSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Website source not found")

    if payload.title is not None:
        source.title = payload.title.strip() or source.title
    if payload.is_enabled is not None:
        source.is_enabled = payload.is_enabled
    if payload.should_parse is not None:
        source.should_parse = payload.should_parse
    await db.flush()
    await db.refresh(source)
    return source


@router.post("/{source_id}/parse", response_model=WebsiteSourceOut)
async def parse_website(
    source_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    source = await db.get(WebsiteSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Website source not found")
    if not source.is_enabled or not source.should_parse:
        raise HTTPException(status_code=400, detail="Website source parsing is disabled")
    try:
        source = await parse_website_source(source, db)
    except Exception as exc:
        source.last_status = "error"
        source.last_error = str(exc)[:2000]
        await db.flush()
        raise HTTPException(status_code=400, detail=f"Parse failed: {exc}") from exc
    return source


@router.post("/parse-all")
async def parse_all_websites(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    result = await db.execute(
        select(WebsiteSource).where(WebsiteSource.is_enabled == True, WebsiteSource.should_parse == True)) # noqa: E712
    sources = result.scalars().all()
    ok = 0
    failed = 0
    errors: list[dict] = []
    for source in sources:
        try:
            await parse_website_source(source, db)
            ok += 1
        except Exception as exc:
            source.last_status = "error"
            source.last_error = str(exc)[:2000]
            failed += 1
            errors.append({"id": source.id, "url": source.url, "error": str(exc)})
    await db.flush()
    return {"total": len(sources), "ok": ok, "failed": failed, "errors": errors}


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_website_source(
    source_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    source = await db.get(WebsiteSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Website source not found")
    if source.parsed_document_id:
        doc = await db.get(Document, source.parsed_document_id)
        if doc:
            await delete_document_files(doc.file_path)
            await db.delete(doc)
    await db.delete(source)

@router.post("/clear-rag", status_code=status.HTTP_204_NO_CONTENT)
async def clear_rag_index(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),):
    await clear_rag(db)
