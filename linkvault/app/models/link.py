from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime
import uuid


class LinkCreate(BaseModel):
    url: str
    title: str
    tags: Optional[List[str]] = []
    notes: Optional[str] = ""


class LinkUpdate(BaseModel):
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class Link(BaseModel):
    id: str
    url: str
    title: str
    tags: List[str] = []
    notes: str = ""
    created_at: str
    updated_at: str

    @classmethod
    def new(cls, data: LinkCreate) -> "Link":
        now = datetime.utcnow().isoformat()
        return cls(
            id=str(uuid.uuid4()),
            url=data.url,
            title=data.title,
            tags=data.tags or [],
            notes=data.notes or "",
            created_at=now,
            updated_at=now,
        )
