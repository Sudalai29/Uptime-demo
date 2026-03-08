"""
Central metrics registry.
All Prometheus metrics are defined here so they can be
imported by both checker.py and the /metrics route.
"""
from prometheus_client import Counter, Gauge, Histogram, CollectorRegistry

# Use the default registry
CHECKS_TOTAL = Counter(
    "uptime_checks_total",
    "Total number of checks performed",
    ["monitor_name", "status"],   # labels: status=up|down
)

CHECKS_DURATION = Histogram(
    "uptime_check_duration_ms",
    "Response time of each check in milliseconds",
    ["monitor_name"],
    buckets=[50, 100, 200, 500, 1000, 2000, 5000],
)

MONITOR_UP = Gauge(
    "uptime_monitor_up",
    "Current status of each monitor (1=up, 0=down)",
    ["monitor_name", "url"],
)

MONITORS_REGISTERED = Gauge(
    "uptime_monitors_registered_total",
    "Total number of monitors currently registered",
)

MONITORS_PAUSED = Gauge(
    "uptime_monitors_paused_total",
    "Number of monitors currently paused",
)

ALERTS_SENT = Counter(
    "uptime_alerts_sent_total",
    "Total number of alerts sent",
    ["type"],   # type=down|recovery
)
