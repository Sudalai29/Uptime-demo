from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.models.monitor import Check
from app.models.db import get_checks_table, get_monitors_table
from boto3.dynamodb.conditions import Key
from datetime import datetime, timedelta
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


# ── GET /checks/{monitor_id} ───────────────────────────────
@router.get("/{monitor_id}", response_model=List[Check])
def get_checks(
    monitor_id: str,
    hours: int = Query(24, description="How many hours of history to return"),
    limit: int = Query(288, description="Max number of results"),   # 288 = every 5min for 24hrs
):
    monitors_table = get_monitors_table()
    checks_table   = get_checks_table()

    try:
        # Verify monitor exists
        resp = monitors_table.get_item(Key={"id": monitor_id})
        if not resp.get("Item"):
            raise HTTPException(status_code=404, detail="Monitor not found")

        since = (datetime.utcnow() - timedelta(hours=hours)).isoformat()

        checks = checks_table.query(
            KeyConditionExpression=(
                Key("monitor_id").eq(monitor_id) &
                Key("checked_at").gte(since)
            ),
            ScanIndexForward=False,
            Limit=limit,
        ).get("Items", [])

        return checks

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching checks for {monitor_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch checks")
