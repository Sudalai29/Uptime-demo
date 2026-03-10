"""
stats_route.py — /stats endpoint for the React dashboard metrics panel.

Pulls live data directly from DynamoDB — no Prometheus needed.
Returns monitor counts, uptime summary, and recent check activity.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.models.db import get_monitors_table, get_checks_table
from boto3.dynamodb.conditions import Key
from datetime import datetime, timedelta
import logging

router  = APIRouter()
logger  = logging.getLogger(__name__)


@router.get("/stats")
def get_stats():
    """
    Summary stats for the React dashboard metrics panel.
    Called every 15s by the frontend — keep it fast.
    """
    monitors_table = get_monitors_table()
    checks_table   = get_checks_table()

    try:
        monitors = monitors_table.scan().get("Items", [])
    except Exception as e:
        logger.error(f"Stats: failed to fetch monitors: {e}")
        return JSONResponse({"error": "Failed to fetch stats"}, status_code=500)

    total  = len(monitors)
    paused = sum(1 for m in monitors if m.get("paused"))
    active = total - paused

    up_count        = 0
    down_count      = 0
    response_times  = []
    checks_last_hour = 0

    since_1h = (datetime.utcnow() - timedelta(hours=1)).isoformat()

    for monitor in monitors:
        if monitor.get("paused"):
            continue
        try:
            # Latest check result for this monitor
            latest = checks_table.query(
                KeyConditionExpression=Key("monitor_id").eq(monitor["id"]),
                ScanIndexForward=False,
                Limit=1,
            ).get("Items", [])

            if latest:
                if latest[0].get("status") == "up":
                    up_count += 1
                    if latest[0].get("response_ms"):
                        response_times.append(int(latest[0]["response_ms"]))
                else:
                    down_count += 1

            # Check count in last hour (for checks/hr display)
            recent = checks_table.query(
                KeyConditionExpression=(
                    Key("monitor_id").eq(monitor["id"]) &
                    Key("checked_at").gte(since_1h)
                ),
            ).get("Items", [])
            checks_last_hour += len(recent)

        except Exception as e:
            logger.warning(f"Stats: skipping monitor {monitor.get('id')}: {e}")

    avg_response = round(sum(response_times) / len(response_times), 1) if response_times else None

    return {
        "monitors": {
            "total":  total,
            "active": active,
            "paused": paused,
            "up":     up_count,
            "down":   down_count,
        },
        "checks": {
            "last_hour": checks_last_hour,
        },
        "performance": {
            "avg_response_ms": avg_response,
        },
        "generated_at": datetime.utcnow().isoformat(),
    }
