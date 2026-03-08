from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from boto3.dynamodb.conditions import Attr
from app.models.link import Link, LinkCreate, LinkUpdate
from app.models.db import get_table, ensure_local_table
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.on_event("startup")
async def on_startup():
    ensure_local_table()


# ── GET /links ──────────────────────────────────────────────
@router.get("/", response_model=List[Link])
def get_links(
    tag: Optional[str] = Query(None, description="Filter by tag"),
    search: Optional[str] = Query(None, description="Search title or URL"),
):
    table = get_table()
    try:
        response = table.scan()
        items = response.get("Items", [])

        # Filter by tag
        if tag:
            items = [i for i in items if tag in i.get("tags", [])]

        # Search by title or url
        if search:
            s = search.lower()
            items = [
                i for i in items
                if s in i.get("title", "").lower() or s in i.get("url", "").lower()
            ]

        # Sort newest first
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return items

    except Exception as e:
        logger.error(f"Error fetching links: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch links")


# ── GET /links/{id} ─────────────────────────────────────────
@router.get("/{link_id}", response_model=Link)
def get_link(link_id: str):
    table = get_table()
    try:
        response = table.get_item(Key={"id": link_id})
        item = response.get("Item")
        if not item:
            raise HTTPException(status_code=404, detail="Link not found")
        return item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching link {link_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch link")


# ── POST /links ─────────────────────────────────────────────
@router.post("/", response_model=Link, status_code=201)
def create_link(data: LinkCreate):
    table = get_table()
    try:
        link = Link.new(data)
        table.put_item(Item=link.dict())
        logger.info(f"Created link: {link.id} — {link.url}")
        return link
    except Exception as e:
        logger.error(f"Error creating link: {e}")
        raise HTTPException(status_code=500, detail="Failed to create link")


# ── PUT /links/{id} ─────────────────────────────────────────
@router.put("/{link_id}", response_model=Link)
def update_link(link_id: str, data: LinkUpdate):
    table = get_table()
    try:
        # Fetch existing
        response = table.get_item(Key={"id": link_id})
        item = response.get("Item")
        if not item:
            raise HTTPException(status_code=404, detail="Link not found")

        # Build update expression dynamically
        updates = {k: v for k, v in data.dict().items() if v is not None}
        updates["updated_at"] = datetime.utcnow().isoformat()

        expr = "SET " + ", ".join(f"#{k} = :{k}" for k in updates)
        expr_names = {f"#{k}": k for k in updates}
        expr_values = {f":{k}": v for k, v in updates.items()}

        table.update_item(
            Key={"id": link_id},
            UpdateExpression=expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
        )

        # Return updated item
        updated = table.get_item(Key={"id": link_id})["Item"]
        logger.info(f"Updated link: {link_id}")
        return updated

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating link {link_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update link")


# ── DELETE /links/{id} ──────────────────────────────────────
@router.delete("/{link_id}", status_code=204)
def delete_link(link_id: str):
    table = get_table()
    try:
        response = table.get_item(Key={"id": link_id})
        if not response.get("Item"):
            raise HTTPException(status_code=404, detail="Link not found")
        table.delete_item(Key={"id": link_id})
        logger.info(f"Deleted link: {link_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting link {link_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete link")


# ── GET /links/tags/all ─────────────────────────────────────
@router.get("/tags/all", response_model=List[str])
def get_all_tags():
    """Returns a deduplicated list of all tags in use."""
    table = get_table()
    try:
        response = table.scan(ProjectionExpression="tags")
        items = response.get("Items", [])
        tags = set()
        for item in items:
            for tag in item.get("tags", []):
                tags.add(tag)
        return sorted(list(tags))
    except Exception as e:
        logger.error(f"Error fetching tags: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch tags")
