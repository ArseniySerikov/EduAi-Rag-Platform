from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

TOP_K = 5
SIMILARITY_THRESHOLD = 0.3  # low threshold — always return closest matches

async def get_relevant_chunks(
    query_embedding: list[float], db: AsyncSession, top_k: int = TOP_K) -> list[dict]:
    """Retrieve top-K most relevant document chunks via pgvector cosine similarity."""
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
    sql = text(
        """
        SELECT dc.id, dc.content, dc.chunk_index, d.original_name,
               1 - (dc.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE dc.embedding IS NOT NULL
          AND 1 - (dc.embedding <=> CAST(:embedding AS vector)) >= :threshold
        ORDER BY dc.embedding <=> CAST(:embedding AS vector)
        LIMIT :top_k
        """)
    result = await db.execute(
        sql,
        {"embedding": embedding_str, "threshold": SIMILARITY_THRESHOLD, "top_k": top_k},)
    rows = result.mappings().all()
    return [dict(row) for row in rows]

def build_rag_context(chunks: list[dict]) -> str:
    if not chunks:
        return ""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        sim = chunk.get("similarity", 0)
        parts.append(
            f"[Джерело {i}: {chunk['original_name']}, фрагмент {chunk['chunk_index']}, "
            f"релевантність: {sim:.0%}]\n{chunk['content']}")
    return "\n\n---\n\n".join(parts)

def format_sources(chunks: list[dict]) -> list[dict]:
    """Format chunks into a compact source list for the frontend."""
    sources = []
    for chunk in chunks:
        sources.append({
            "document": chunk["original_name"],
            "chunk_index": chunk["chunk_index"],
            "similarity": round(float(chunk.get("similarity", 0)), 3),
            "snippet": chunk["content"][:200] + ("..." if len(chunk["content"]) > 200 else ""),})
    return sources
