import httpx
import time
import logging
import os
from datetime import datetime
from app.models.db import get_monitors_table, get_checks_table
from app.models.monitor import Check
from app.metrics import (
    CHECKS_TOTAL, CHECKS_DURATION, MONITOR_UP,
    MONITORS_REGISTERED, MONITORS_PAUSED, ALERTS_SENT,
)

logger = logging.getLogger(__name__)

LOCAL_MODE = os.getenv("LOCAL_MODE", "true").lower() == "true"
SNS_TOPIC  = os.getenv("SNS_TOPIC_ARN", "")

BOT_BLOCK_CODES = {403, 401, 405, 406}


def ping(url: str) -> dict:
    try:
        start = time.time()
        response = httpx.get(
            url, timeout=10, follow_redirects=True,
            headers={"User-Agent": "UptimeMonitor/1.0"},
        )
        elapsed_ms = int((time.time() - start) * 1000)
        status = "up" if (response.status_code < 400 or response.status_code in BOT_BLOCK_CODES) else "down"
        return {"status": status, "status_code": response.status_code, "response_ms": elapsed_ms, "error": None}
    except httpx.TimeoutException:
        return {"status": "down", "status_code": None, "response_ms": None, "error": "Timeout"}
    except httpx.ConnectError:
        return {"status": "down", "status_code": None, "response_ms": None, "error": "Connection failed"}
    except Exception as e:
        return {"status": "down", "status_code": None, "response_ms": None, "error": str(e)}


def save_check(monitor_id: str, result: dict):
    table = get_checks_table()
    check = Check(monitor_id=monitor_id, checked_at=datetime.utcnow().isoformat(), **result)
    table.put_item(Item=check.dict())
    return check


def notify_down(monitor: dict, error: str):
    ALERTS_SENT.labels(type="down").inc()
    msg = f"🔴 DOWN: {monitor['name']} ({monitor['url']}) — {error or 'No response'}"
    if LOCAL_MODE:
        logger.warning(f"[ALERT] {msg}")
    else:
        try:
            import boto3
            boto3.client("sns").publish(
                TopicArn=SNS_TOPIC,
                Subject=f"🔴 ALERT — {monitor['name']} is DOWN",
                Message=f"{monitor['name']} unreachable.\nURL: {monitor['url']}\nTime: {datetime.utcnow().isoformat()} UTC\nError: {error or 'No response'}",
            )
        except Exception as e:
            logger.error(f"SNS error: {e}")


def notify_up(monitor: dict, response_ms: int):
    ALERTS_SENT.labels(type="recovery").inc()
    msg = f"✅ RECOVERED: {monitor['name']} ({monitor['url']}) — {response_ms}ms"
    if LOCAL_MODE:
        logger.info(f"[ALERT] {msg}")
    else:
        try:
            import boto3
            boto3.client("sns").publish(
                TopicArn=SNS_TOPIC,
                Subject=f"✅ RESOLVED — {monitor['name']} is back UP",
                Message=f"{monitor['name']} recovered.\nURL: {monitor['url']}\nTime: {datetime.utcnow().isoformat()} UTC\nResponse: {response_ms}ms",
            )
        except Exception as e:
            logger.error(f"SNS error: {e}")


def run_checks():
    logger.info("Running uptime checks...")
    monitors_table = get_monitors_table()

    try:
        monitors = monitors_table.scan().get("Items", [])
    except Exception as e:
        logger.error(f"Failed to fetch monitors: {e}")
        return

    paused_count = sum(1 for m in monitors if m.get("paused"))
    MONITORS_REGISTERED.set(len(monitors))
    MONITORS_PAUSED.set(paused_count)

    checks_table = get_checks_table()

    for monitor in monitors:
        if monitor.get("paused"):
            continue

        name, url, monitor_id = monitor["name"], monitor["url"], monitor["id"]
        logger.info(f"Checking {url}...")
        result = ping(url)
        save_check(monitor_id, result)

        # Record Prometheus metrics
        CHECKS_TOTAL.labels(monitor_name=name, status=result["status"]).inc()
        MONITOR_UP.labels(monitor_name=name, url=url).set(1 if result["status"] == "up" else 0)
        if result["response_ms"] is not None:
            CHECKS_DURATION.labels(monitor_name=name).observe(result["response_ms"])

        # Detect state change for alerts
        try:
            prev = checks_table.query(
                KeyConditionExpression="monitor_id = :mid",
                ExpressionAttributeValues={":mid": monitor_id},
                ScanIndexForward=False, Limit=2,
            ).get("Items", [])
            prev_status = prev[1]["status"] if len(prev) > 1 else None
        except Exception:
            prev_status = None

        if result["status"] == "down" and prev_status != "down":
            notify_down(monitor, result["error"])
        elif result["status"] == "up" and prev_status == "down":
            notify_up(monitor, result["response_ms"])

        logger.info(f"  {url} → {result['status'].upper()} ({result.get('status_code','N/A')}) {result.get('response_ms','N/A')}ms")

    logger.info(f"Completed checks for {len(monitors)} monitors.")
