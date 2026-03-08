from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from app.routes import monitors, checks, health
from app.models.db import ensure_local_tables
from app.checker import run_checks
import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

LOCAL_MODE       = os.getenv("LOCAL_MODE", "true").lower() == "true"
CHECK_INTERVAL   = int(os.getenv("CHECK_INTERVAL_MINUTES", "5"))

app = FastAPI(
    title="Uptime Monitor API",
    description="Monitor URLs and track uptime & response times",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router,    tags=["health"])
app.include_router(monitors.router,  prefix="/monitors", tags=["monitors"])
app.include_router(checks.router,    prefix="/checks",   tags=["checks"])

scheduler = BackgroundScheduler()


@app.on_event("startup")
def startup():
    # Create local DynamoDB tables if needed
    ensure_local_tables()

    if LOCAL_MODE:
        # Run once immediately on startup so you don't wait 5 mins to see data
        logger.info("Running initial checks on startup...")
        try:
            run_checks()
        except Exception as e:
            logger.warning(f"Initial check failed (is DynamoDB ready?): {e}")

        # Schedule recurring checks
        scheduler.add_job(
            run_checks,
            trigger="interval",
            minutes=CHECK_INTERVAL,
            id="uptime_checks",
        )
        scheduler.start()
        logger.info(f"Scheduler started — checking every {CHECK_INTERVAL} minute(s)")
    else:
        # On AWS, Lambda + EventBridge handles scheduling
        logger.info("Running on AWS — scheduler disabled (Lambda handles checks)")


@app.on_event("shutdown")
def shutdown():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
