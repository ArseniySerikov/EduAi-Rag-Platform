from datetime import datetime
from pydantic import BaseModel, HttpUrl

class WebsiteSourceCreate(BaseModel):
    url: HttpUrl
    title: str | None = None
    should_parse: bool = True
    is_enabled: bool = True


class WebsiteSourceUpdate(BaseModel):
    title: str | None = None
    should_parse: bool | None = None
    is_enabled: bool | None = None


class WebsiteSourceOut(BaseModel):
    id: int
    url: str
    title: str
    is_enabled: bool
    should_parse: bool
    last_status: str | None
    last_error: str | None
    last_parsed_at: datetime | None
    parsed_document_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
