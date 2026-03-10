from fastapi import APIRouter, HTTPException
from typing import List
from app.models.monitor import Monitor, MonitorCreate, MonitorStatus, Check
from app.models.db import get_monitors_table, get_checks_table
from boto3.dynamodb.conditions import Key
from datetime import datetime, timedelta
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


# ── GET /monitors ──────────────────────────────────────────
@router.get("/", response_model=List[MonitorStatus])
def get_monitors():
    monitors_table = get_monitors_table()
    checks_table   = get_checks_table()

    try:
        monitors = monitors_table.scan().get("Items", [])
        result   = []

        for m in monitors:
            # Latest check
            checks = checks_table.query(
                KeyConditionExpression=Key("monitor_id").eq(m["id"]),
                ScanIndexForward=False,
                Limit=1,
            ).get("Items", [])
            latest = Check(**checks[0]) if checks else None

            # Uptime % and avg response over last 24hrs
            since = (datetime.utcnow() - timedelta(hours=24)).isoformat()
            recent = checks_table.query(
                KeyConditionExpression=(
                    Key("monitor_id").eq(m["id"]) &
                    Key("checked_at").gte(since)
                ),
                ScanIndexForward=False,
            ).get("Items", [])

            uptime_pct   = None
            avg_response = None

            if recent:
                up_count     = sum(1 for c in recent if c["status"] == "up")
                uptime_pct   = round((up_count / len(recent)) * 100, 1)
                response_times = [c["response_ms"] for c in recent if c.get("response_ms")]
                if response_times:
                    avg_response = round(sum(response_times) / len(response_times), 0)

            result.append(MonitorStatus(
                monitor=Monitor(**m),
                latest_check=latest,
                uptime_pct=uptime_pct,
                avg_response=avg_response,
            ))

        return result

    except Exception as e:
        logger.error(f"Error fetching monitors: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch monitors")


# ── POST /monitors ─────────────────────────────────────────
@router.post("/", response_model=Monitor, status_code=201)
def create_monitor(data: MonitorCreate):
    table = get_monitors_table()
    try:
        monitor = Monitor.new(data)
        table.put_item(Item=monitor.dict())
        logger.info(f"Created monitor: {monitor.name} → {monitor.url}")
        return monitor
    except Exception as e:
        logger.error(f"Error creating monitor: {e}")
        raise HTTPException(status_code=500, detail="Failed to create monitor")


# ── DELETE /monitors/{id} ──────────────────────────────────
@router.delete("/{monitor_id}", status_code=204)
def delete_monitor(monitor_id: str):
    table = get_monitors_table()
    try:
        resp = table.get_item(Key={"id": monitor_id})
        if not resp.get("Item"):
            raise HTTPException(status_code=404, detail="Monitor not found")
        table.delete_item(Key={"id": monitor_id})
        logger.info(f"Deleted monitor: {monitor_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting monitor: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete monitor")


# ── PATCH /monitors/{id}/pause ─────────────────────────────
@router.patch("/{monitor_id}/pause", response_model=Monitor)
def toggle_pause(monitor_id: str):
    table = get_monitors_table()
    try:
        resp = table.get_item(Key={"id": monitor_id})
        item = resp.get("Item")
        if not item:
            raise HTTPException(status_code=404, detail="Monitor not found")

        new_paused = not item.get("paused", False)
        table.update_item(
            Key={"id": monitor_id},
            UpdateExpression="SET paused = :p",
            ExpressionAttributeValues={":p": new_paused},
        )
        item["paused"] = new_paused
        return Monitor(**item)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to toggle pause")
