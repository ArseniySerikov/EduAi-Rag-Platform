from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class NewsCreate(BaseModel):
    title: str
    content: str
    is_published: bool = True

class NewsUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_published: Optional[bool] = None

class NewsOut(BaseModel):
    id: int
    title: str
    content: str
    is_published: bool
    author_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
