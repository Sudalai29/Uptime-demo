from fastapi import APIRouter
from fastapi.responses import PlainTextResponse, JSONResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from app.models.db import get_monitors_table, get_checks_table
from app.metrics import MONITORS_REGISTERED, MONITORS_PAUSED
from boto3.dynamodb.conditions import Key
from datetime import datetime, timedelta
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


# ── /metrics — Prometheus scrape endpoint ─────────────────
@router.get("/metrics", response_class=PlainTextResponse)
def prometheus_metrics():
    """
    Prometheus scrapes this endpoint every 15s.
    Returns all metrics in Prometheus text format.
    """
    return PlainTextResponse(
        content=generate_latest().decode("utf-8"),
        media_type=CONTENT_TYPE_LATEST,
    )


# ── /stats — JSON summary for React dashboard ─────────────
@router.get("/stats")
def get_stats():
    """
    Summary stats for the React dashboard metrics panel.
    Returns counts, uptime averages, and recent activity.
    """
    monitors_table = get_monitors_table()
    checks_table   = get_checks_table()

    try:
        monitors = monitors_table.scan().get("Items", [])
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return JSONResponse({"error": "Failed to fetch stats"}, status_code=500)

    total    = len(monitors)
    paused   = sum(1 for m in monitors if m.get("paused"))
    active   = total - paused

    # For each active monitor get latest check
    up_count   = 0
    down_count = 0
    response_times = []
    checks_last_hour = 0

    since_1h = (datetime.utcnow() - timedelta(hours=1)).isoformat()

    for monitor in monitors:
        if monitor.get("paused"):
            continue
        try:
            # Latest check
            latest = checks_table.query(
                KeyConditionExpression=Key("monitor_id").eq(monitor["id"]),
                ScanIndexForward=False, Limit=1,
            ).get("Items", [])

            if latest:
                status = latest[0].get("status")
                if status == "up":
                    up_count += 1
                    if latest[0].get("response_ms"):
                        response_times.append(latest[0]["response_ms"])
                else:
                    down_count += 1

            # Checks in last hour
            recent = checks_table.query(
                KeyConditionExpression=(
                    Key("monitor_id").eq(monitor["id"]) &
                    Key("checked_at").gte(since_1h)
                ),
            ).get("Items", [])
            checks_last_hour += len(recent)

        except Exception:
            pass

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
