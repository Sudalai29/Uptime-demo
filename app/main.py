from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from app.routes import monitors, checks, health
from app.routes.stats_route import router as stats_router
from app.models.db import ensure_local_tables
from app.checker import run_checks
from app.config import LOCAL_MODE, CHECK_INTERVAL_MINUTES, ALLOWED_ORIGINS
import logging, time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Uptime Monitor API",
    description="Monitor URLs — uptime, response times, CloudWatch metrics",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request logging middleware ─────────────────────────────
# Logs every request in structured format so CloudWatch Logs Insights
# can query request counts, error rates, and latency from log data.
@app.middleware("http")
async def log_requests(request: Request, call_next):
    path = request.url.path

    # Normalise dynamic paths so log queries group them correctly
    if path.startswith("/monitors/"):
        path = "/monitors/{id}"
    elif path.startswith("/checks/"):
        path = "/checks/{id}"

    start    = time.time()
    response = await call_next(request)
    latency_ms = round((time.time() - start) * 1000, 2)

    # Structured log line — parsed by CloudWatch Logs Insights
    logger.info(
        f'REQUEST method={request.method} path={path} '
        f'status={response.status_code} latency_ms={latency_ms}'
    )

    return response


app.include_router(health.router,   tags=["health"])
app.include_router(monitors.router, prefix="/monitors", tags=["monitors"])
app.include_router(checks.router,   prefix="/checks",   tags=["checks"])
app.include_router(stats_router,    tags=["stats"])

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
        scheduler.add_job(run_checks, trigger="interval", minutes=CHECK_INTERVAL_MINUTES, id="uptime_checks")
        scheduler.start()
        logger.info(f"Scheduler started — checking every {CHECK_INTERVAL_MINUTES} minute(s)")
    else:
        logger.info("Running on AWS — scheduler disabled (Lambda handles checks)")


@app.on_event("shutdown")
def shutdown():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
