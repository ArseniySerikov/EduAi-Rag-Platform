from datetime import datetime, timezone
import re
from html import unescape
from urllib.parse import urlparse
import httpx
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.document import Document, DocumentChunk
from app.models.website_source import WebsiteSource
from app.services.doc_service import ingest_document, delete_document_files


def _safe_filename_from_url(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.netloc or "website"
    path = parsed.path.strip("/").replace("/", "_") or "index"
    return f"{host}_{path}.txt"


def _html_to_text(html: str) -> str:
    html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", html)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

async def fetch_website_text(url: str) -> str:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "").lower()
        body = response.text
        if "html" in content_type:
            return _html_to_text(body)
        return body.strip()

async def parse_website_source(source: WebsiteSource, db: AsyncSession) -> WebsiteSource:
    if source.parsed_document_id:
        old_doc = await db.get(Document, source.parsed_document_id)
        if old_doc:
            await delete_document_files(old_doc.file_path)
            await db.delete(old_doc)
            await db.flush()
    text = await fetch_website_text(source.url)
    if not text:
        raise ValueError("Website content is empty after parsing")

    document = await ingest_document(
        file_content=text.encode("utf-8"),
        original_name=_safe_filename_from_url(source.url),
        mime_type="text/plain",
        uploader_id=0,
        db=db,)

    # #  source.parsed_document_id = document.id
    # source.last_status = "success"
    # source.last_error = True
    # source.last_parsed_at = datetime.now(timezone.utc)
    # db.flush()
    # db.refresh(source)
    # return source

    source.parsed_document_id = document.id
    source.last_status = "success"
    source.last_error = None
    source.last_parsed_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(source)
    return source


async def clear_rag(db: AsyncSession) -> None:
    docs = (await db.execute(select(Document))).scalars().all()
    for doc in docs:
        await delete_document_files(doc.file_path)
    await db.execute(delete(DocumentChunk))
    await db.execute(delete(Document))
    await db.execute(
        update(WebsiteSource)
        .values(
            parsed_document_id=None,
            last_status="cleared",
            last_error=None,
            last_parsed_at=None,
        )
    )
