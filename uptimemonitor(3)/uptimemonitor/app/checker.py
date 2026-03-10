import httpx, time, logging
from datetime import datetime
from app.models.db import get_monitors_table, get_checks_table
from app.models.monitor import Check
from app.config import LOCAL_MODE, SNS_TOPIC_ARN, AWS_REGION
from app.cloudwatch import (
    push_check_metrics,
    push_summary_metrics,
    push_incident_metric,
    push_alert_metric,
)

logger = logging.getLogger(__name__)

BOT_BLOCK_CODES = {403, 401, 405, 406}


def ping(url: str) -> dict:
    try:
        start    = time.time()
        response = httpx.get(url, timeout=10, follow_redirects=True, headers={"User-Agent": "UptimeMonitor/1.0"})
        elapsed  = int((time.time() - start) * 1000)
        status   = "up" if (response.status_code < 400 or response.status_code in BOT_BLOCK_CODES) else "down"
        return {"status": status, "status_code": response.status_code, "response_ms": elapsed, "error": None}
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


def _send_sns(subject: str, message: str):
    """Send SNS notification — only in prod when SNS_TOPIC_ARN is configured."""
    if not SNS_TOPIC_ARN:
        logger.warning("SNS_TOPIC_ARN not set — skipping SNS notification")
        return
    try:
        import boto3
        boto3.client("sns", region_name=AWS_REGION).publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject,
            Message=message,
        )
    except Exception as e:
        logger.error(f"SNS publish failed: {e}")


def notify_down(monitor: dict, error: str):
    push_alert_metric("down")
    push_incident_metric(monitor["name"])
    msg = f"🔴 DOWN: {monitor['name']} ({monitor['url']}) — {error or 'No response'}"
    logger.warning(f"[ALERT] {msg}")
    if not LOCAL_MODE:
        _send_sns(
            subject=f"🔴 ALERT — {monitor['name']} is DOWN",
            message=f"{monitor['name']} is unreachable.\nURL: {monitor['url']}\nTime: {datetime.utcnow().isoformat()} UTC\nError: {error or 'No response'}",
        )


def notify_up(monitor: dict, response_ms: int):
    push_alert_metric("recovery")
    msg = f"✅ RECOVERED: {monitor['name']} ({monitor['url']}) — {response_ms}ms"
    logger.info(f"[ALERT] {msg}")
    if not LOCAL_MODE:
        _send_sns(
            subject=f"✅ RESOLVED — {monitor['name']} is back UP",
            message=f"{monitor['name']} has recovered.\nURL: {monitor['url']}\nTime: {datetime.utcnow().isoformat()} UTC\nResponse: {response_ms}ms",
        )


def run_checks():
    logger.info("Running uptime checks...")
    monitors_table = get_monitors_table()

    try:
        all_monitors = monitors_table.scan().get("Items", [])
    except Exception as e:
        logger.error(f"Failed to fetch monitors: {e}")
        return

    active_monitors = [m for m in all_monitors if not m.get("paused")]
    checks_table    = get_checks_table()
    up_count = down_count = 0

    for monitor in active_monitors:
        name, url, mid = monitor["name"], monitor["url"], monitor["id"]
        result = ping(url)
        save_check(mid, result)

        # Push per-monitor metrics to CloudWatch (no-op in local mode)
        push_check_metrics(
            monitor_name=name,
            url=url,
            status=result["status"],
            response_ms=result.get("response_ms"),
        )

        if result["status"] == "up":
            up_count += 1
        else:
            down_count += 1

        # State change detection — only alert on transitions
        try:
            prev = checks_table.query(
                KeyConditionExpression="monitor_id = :mid",
                ExpressionAttributeValues={":mid": mid},
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

    # Push aggregate summary metrics once per cycle
    push_summary_metrics(
        total=len(all_monitors),
        active=len(active_monitors),
        paused=len(all_monitors) - len(active_monitors),
        up=up_count,
        down=down_count,
    )

    logger.info(f"Completed: {up_count} up, {down_count} down out of {len(active_monitors)} active monitors.")
