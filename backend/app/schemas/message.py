from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel

class MessageSend(BaseModel):
    content: str

class SourceOut(BaseModel):
    document: str
    chunk_index: int
    similarity: float
    snippet: str

class MessageOut(BaseModel):
    id: int
    chat_id: int
    role: str
    content: str
    used_rag: bool
    tokens_used: int
    created_at: datetime
    sources: Optional[list[SourceOut]] = None
    model_config = {"from_attributes": True}

def message_to_out(m: Any) -> MessageOut:
    """Map ORM Message (rag_sources) to API MessageOut (sources)."""
    sources_list: Optional[list[SourceOut]] = None
    raw = getattr(m, "rag_sources", None)
    if raw:
        sources_list = [SourceOut.model_validate(x) for x in raw]
    return MessageOut(
        id=m.id,
        chat_id=m.chat_id,
        role=m.role,
        content=m.content,
        used_rag=m.used_rag,
        tokens_used=m.tokens_used,
        created_at=m.created_at,
        sources=sources_list,)
