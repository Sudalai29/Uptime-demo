"""
App-specific Prometheus metrics.
Default Python/process metrics (memory, GC, file descriptors) are
disabled — we only expose metrics that are meaningful for an uptime monitor.
"""
from prometheus_client import (
    Counter, Gauge, Histogram,
    CollectorRegistry, REGISTRY,
    disable_created_metrics,
)
from prometheus_client import GC_COLLECTOR, PLATFORM_COLLECTOR, PROCESS_COLLECTOR

try:
    REGISTRY.unregister(GC_COLLECTOR)
except Exception:
    pass
try:
    REGISTRY.unregister(PLATFORM_COLLECTOR)
except Exception:
    pass
try:
    REGISTRY.unregister(PROCESS_COLLECTOR)
except Exception:
    pass

# Suppresses the auto-generated _created timestamp metrics
disable_created_metrics()


# ── Monitor status ─────────────────────────────────────────
MONITOR_UP = Gauge(
    "uptime_monitor_status",
    "Current status of each monitored URL (1=up, 0=down)",
    ["monitor_name", "url"],
)

MONITORS_REGISTERED = Gauge(
    "uptime_monitors_total",
    "Total number of monitors registered",
)

MONITORS_PAUSED = Gauge(
    "uptime_monitors_paused",
    "Number of monitors currently paused",
)

MONITORS_UP_COUNT = Gauge(
    "uptime_monitors_up_count",
    "Number of monitors currently reporting UP",
)

MONITORS_DOWN_COUNT = Gauge(
    "uptime_monitors_down_count",
    "Number of monitors currently reporting DOWN",
)


# ── Check results ──────────────────────────────────────────
CHECKS_TOTAL = Counter(
    "uptime_checks_total",
    "Total checks performed",
    ["monitor_name", "status"],   # status=up|down
)

CHECKS_DURATION = Histogram(
    "uptime_response_ms",
    "HTTP response time in milliseconds for each monitored URL",
    ["monitor_name"],
    buckets=[50, 100, 200, 300, 500, 750, 1000, 2000, 5000],
)


# ── Incidents & alerts ─────────────────────────────────────
ALERTS_SENT = Counter(
    "uptime_alerts_total",
    "Total alerts sent",
    ["type"],   # type=down|recovery
)

INCIDENTS_TOTAL = Counter(
    "uptime_incidents_total",
    "Total number of incidents (monitor going from up→down)",
    ["monitor_name"],
)


# ── API usage ──────────────────────────────────────────────
API_REQUESTS = Counter(
    "uptime_api_requests_total",
    "Total API requests received",
    ["method", "endpoint", "status_code"],
)

API_LATENCY = Histogram(
    "uptime_api_latency_ms",
    "API endpoint response time in milliseconds",
    ["method", "endpoint"],
    buckets=[5, 10, 25, 50, 100, 250, 500, 1000],
)
