from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from app.routes import monitors, checks, health
from app.routes.metrics_route import router as metrics_router
from app.models.db import ensure_local_tables
from app.checker import run_checks
from app.metrics import API_REQUESTS, API_LATENCY
import logging, os, time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

LOCAL_MODE     = os.getenv("LOCAL_MODE", "true").lower() == "true"
CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL_MINUTES", "5"))

app = FastAPI(
    title="Uptime Monitor API",
    description="Monitor URLs — uptime, response times, Prometheus metrics",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── API request tracking middleware ───────────────────────
# Automatically records every request — method, endpoint, status, latency
@app.middleware("http")
async def track_requests(request: Request, call_next):
    # Normalise path — strip IDs so /monitors/abc123 → /monitors/{id}
    path = request.url.path
    if path.startswith("/monitors/"):
        path = "/monitors/{id}"
    elif path.startswith("/checks/"):
        path = "/checks/{id}"

    start = time.time()
    response = await call_next(request)
    latency_ms = (time.time() - start) * 1000

    # Don't track the /metrics scrape itself — that would be noise
    if path != "/metrics":
        API_REQUESTS.labels(
            method=request.method,
            endpoint=path,
            status_code=response.status_code,
        ).inc()
        API_LATENCY.labels(
            method=request.method,
            endpoint=path,
        ).observe(latency_ms)

    return response


app.include_router(health.router,    tags=["health"])
app.include_router(monitors.router,  prefix="/monitors", tags=["monitors"])
app.include_router(checks.router,    prefix="/checks",   tags=["checks"])
app.include_router(metrics_router,   tags=["metrics"])

scheduler = BackgroundScheduler()


@app.on_event("startup")
def startup():
    ensure_local_tables()
    if LOCAL_MODE:
        logger.info("Running initial checks on startup...")
        try:
            run_checks()
        except Exception as e:
            logger.warning(f"Initial check failed (is DynamoDB ready?): {e}")
        scheduler.add_job(run_checks, trigger="interval", minutes=CHECK_INTERVAL, id="uptime_checks")
        scheduler.start()
        logger.info(f"Scheduler started — checking every {CHECK_INTERVAL} minute(s)")
    else:
        logger.info("Running on AWS — scheduler disabled (Lambda handles checks)")


@app.on_event("shutdown")
def shutdown():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
