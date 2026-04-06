from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class DocumentOut(BaseModel):
    id: int
    filename: str
    original_name: str
    size_bytes: int
    mime_type: str
    uploaded_by: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}
