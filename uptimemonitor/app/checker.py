import httpx
import time
import logging
import os
from datetime import datetime
from app.models.db import get_monitors_table, get_checks_table
from app.models.monitor import Check

logger = logging.getLogger(__name__)

LOCAL_MODE = os.getenv("LOCAL_MODE", "true").lower() == "true"
SNS_TOPIC  = os.getenv("SNS_TOPIC_ARN", "")


# ── Ping a single URL ──────────────────────────────────────
def ping(url: str) -> dict:
    try:
        start = time.time()
        response = httpx.get(
            url,
            timeout=10,
            follow_redirects=True,
            headers={"User-Agent": "UptimeMonitor/1.0"},
        )
        elapsed_ms = int((time.time() - start) * 1000)

        status = "up" if response.status_code < 400 else "down"
        return {
            "status":      status,
            "status_code": response.status_code,
            "response_ms": elapsed_ms,
            "error":       None,
        }

    except httpx.TimeoutException:
        return {"status": "down", "status_code": None, "response_ms": None, "error": "Timeout"}
    except httpx.ConnectError:
        return {"status": "down", "status_code": None, "response_ms": None, "error": "Connection failed"}
    except Exception as e:
        return {"status": "down", "status_code": None, "response_ms": None, "error": str(e)}


# ── Save a check result to DynamoDB ───────────────────────
def save_check(monitor_id: str, result: dict):
    table = get_checks_table()
    check = Check(
        monitor_id=monitor_id,
        checked_at=datetime.utcnow().isoformat(),
        **result,
    )
    table.put_item(Item=check.dict())
    return check


# ── Alert when site goes down ──────────────────────────────
def notify_down(monitor: dict, error: str):
    msg = f"🔴 DOWN: {monitor['name']} ({monitor['url']}) — {error or 'No response'}"
    if LOCAL_MODE:
        logger.warning(f"[ALERT] {msg}")
    else:
        # Real SNS alert on AWS
        try:
            import boto3
            sns = boto3.client("sns")
            sns.publish(
                TopicArn=SNS_TOPIC,
                Subject=f"🔴 ALERT — {monitor['name']} is DOWN",
                Message=(
                    f"{monitor['name']} is unreachable.\n"
                    f"URL: {monitor['url']}\n"
                    f"Time: {datetime.utcnow().isoformat()} UTC\n"
                    f"Error: {error or 'No response'}"
                ),
            )
        except Exception as e:
            logger.error(f"Failed to send SNS alert: {e}")


def notify_up(monitor: dict, response_ms: int):
    msg = f"✅ RECOVERED: {monitor['name']} ({monitor['url']}) — {response_ms}ms"
    if LOCAL_MODE:
        logger.info(f"[ALERT] {msg}")
    else:
        try:
            import boto3
            sns = boto3.client("sns")
            sns.publish(
                TopicArn=SNS_TOPIC,
                Subject=f"✅ RESOLVED — {monitor['name']} is back UP",
                Message=(
                    f"{monitor['name']} has recovered.\n"
                    f"URL: {monitor['url']}\n"
                    f"Time: {datetime.utcnow().isoformat()} UTC\n"
                    f"Response time: {response_ms}ms"
                ),
            )
        except Exception as e:
            logger.error(f"Failed to send SNS recovery alert: {e}")


# ── Main check runner — called by scheduler & Lambda ──────
def run_checks():
    logger.info("Running uptime checks...")
    monitors_table = get_monitors_table()

    try:
        response = monitors_table.scan()
        monitors = response.get("Items", [])
    except Exception as e:
        logger.error(f"Failed to fetch monitors: {e}")
        return

    checks_table = get_checks_table()

    for monitor in monitors:
        if monitor.get("paused"):
            continue

        url        = monitor["url"]
        monitor_id = monitor["id"]

        logger.info(f"Checking {url}...")
        result = ping(url)
        check  = save_check(monitor_id, result)

        # Get previous check to detect state changes (up→down or down→up)
        try:
            prev = checks_table.query(
                KeyConditionExpression="monitor_id = :mid",
                ExpressionAttributeValues={":mid": monitor_id},
                ScanIndexForward=False,   # newest first
                Limit=2,                  # current + previous
            ).get("Items", [])

            prev_status = prev[1]["status"] if len(prev) > 1 else None
        except Exception:
            prev_status = None

        # Only alert on state change to avoid spam
        if result["status"] == "down" and prev_status != "down":
            notify_down(monitor, result["error"])
        elif result["status"] == "up" and prev_status == "down":
            notify_up(monitor, result["response_ms"])

        logger.info(
            f"  {url} → {result['status'].upper()} "
            f"({result.get('status_code', 'N/A')}) "
            f"{result.get('response_ms', 'N/A')}ms"
        )

    logger.info(f"Completed checks for {len(monitors)} monitors.")
