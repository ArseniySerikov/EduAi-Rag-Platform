from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class ChatCreate(BaseModel):
    title: Optional[str] = "Новый чат"

class ChatUpdate(BaseModel):
    title: str

class ChatOut(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0
    model_config = {"from_attributes": True}
