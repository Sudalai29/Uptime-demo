"""
cloudwatch.py — Publish custom app metrics to AWS CloudWatch.

In LOCAL_MODE these calls are silently skipped (no AWS needed locally).
In prod (LOCAL_MODE=false) metrics are pushed after every check cycle so
Grafana can query them via the CloudWatch datasource.

Namespace: UptimeMonitor
Dimensions: MonitorName, Environment
"""
import logging
import boto3
from datetime import datetime
from app.config import LOCAL_MODE, AWS_REGION

logger = logging.getLogger(__name__)

# Lazy client — only created when actually needed in prod
_client = None


def _cw():
    global _client
    if _client is None:
        _client = boto3.client("cloudwatch", region_name=AWS_REGION)
    return _client


NAMESPACE = "UptimeMonitor"


def put_metric(metric_name: str, value: float, unit: str = "None", dimensions: list = None):
    """
    Push a single metric to CloudWatch.
    Silently skips in LOCAL_MODE — no AWS credentials needed for local dev.
    """
    if LOCAL_MODE:
        return

    try:
        _cw().put_metric_data(
            Namespace=NAMESPACE,
            MetricData=[{
                "MetricName": metric_name,
                "Value": value,
                "Unit": unit,
                "Timestamp": datetime.utcnow(),
                "Dimensions": dimensions or [],
            }],
        )
    except Exception as e:
        # Never let metric failures break the app
        logger.warning(f"CloudWatch put_metric failed ({metric_name}): {e}")


def push_check_metrics(monitor_name: str, url: str, status: str, response_ms: int | None):
    """
    Called after each individual URL check.
    Pushes per-monitor status and response time.
    """
    env_dim = [{"Name": "Environment", "Value": "prod"}]
    monitor_dim = [
        {"Name": "MonitorName", "Value": monitor_name},
        {"Name": "Environment", "Value": "prod"},
    ]

    # 1 = up, 0 = down  (stored as a gauge-style metric)
    put_metric("MonitorStatus", 1 if status == "up" else 0, "None", monitor_dim)

    if response_ms is not None:
        put_metric("ResponseTimeMs", float(response_ms), "Milliseconds", monitor_dim)

    # Also push a check count so we can graph checks/min
    put_metric("ChecksTotal", 1, "Count", monitor_dim)

    if status == "down":
        put_metric("ChecksFailed", 1, "Count", monitor_dim)


def push_summary_metrics(total: int, active: int, paused: int, up: int, down: int):
    """
    Called once at the end of each full check cycle.
    Pushes aggregate counts — shown as the top-level summary panels in Grafana.
    """
    env_dim = [{"Name": "Environment", "Value": "prod"}]

    put_metric("MonitorsTotal",  float(total),  "Count", env_dim)
    put_metric("MonitorsActive", float(active), "Count", env_dim)
    put_metric("MonitorsPaused", float(paused), "Count", env_dim)
    put_metric("MonitorsUp",     float(up),     "Count", env_dim)
    put_metric("MonitorsDown",   float(down),   "Count", env_dim)


def push_incident_metric(monitor_name: str):
    """Called when a monitor transitions up→down (new incident)."""
    put_metric("Incidents", 1, "Count", [
        {"Name": "MonitorName", "Value": monitor_name},
        {"Name": "Environment", "Value": "prod"},
    ])


def push_alert_metric(alert_type: str):
    """Called when an SNS alert is sent. type = 'down' | 'recovery'"""
    put_metric("AlertsSent", 1, "Count", [
        {"Name": "AlertType", "Value": alert_type},
        {"Name": "Environment", "Value": "prod"},
    ])
