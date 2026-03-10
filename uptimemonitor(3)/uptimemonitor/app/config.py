"""
config.py — Single source of truth for all environment variables.

Local dev:  values come from docker-compose.yml environment section
AWS prod:   values come from ECS task definition environment / secrets
CI/CD:      values come from GitHub Actions secrets → passed as build args
"""
import os

# ── Runtime mode ───────────────────────────────────────────
LOCAL_MODE = os.getenv("LOCAL_MODE", "true").lower() == "true"

# ── AWS region ─────────────────────────────────────────────
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# ── DynamoDB ───────────────────────────────────────────────
# LOCAL_DYNAMO_URL is only set in dev (docker-compose).
# In prod it's unset, so boto3 uses real AWS DynamoDB automatically.
DYNAMO_ENDPOINT  = os.getenv("LOCAL_DYNAMO_URL", None)
MONITORS_TABLE   = os.getenv("MONITORS_TABLE", "uptime-monitors")
CHECKS_TABLE     = os.getenv("CHECKS_TABLE",   "uptime-checks")

# ── SNS alerts ─────────────────────────────────────────────
# Prod: arn:aws:sns:us-east-1:123456789012:uptime-monitor-alerts
# Dev:  empty string — alerts just log to console
SNS_TOPIC_ARN = os.getenv("SNS_TOPIC_ARN", "")

# ── API ────────────────────────────────────────────────────
# Prod: https://api.yourdomain.com
# Dev:  empty — Vite proxy handles routing
API_URL = os.getenv("API_URL", "")

# ── CORS ───────────────────────────────────────────────────
# Prod: https://yourdomain.com,https://www.yourdomain.com
# Dev:  * (open)
ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = (
    ["*"] if ALLOWED_ORIGINS_RAW == "*"
    else [o.strip() for o in ALLOWED_ORIGINS_RAW.split(",")]
)

# ── CloudWatch ─────────────────────────────────────────────
# Namespace for all custom metrics pushed by the app.
# In prod, the ECS task IAM role must have cloudwatch:PutMetricData permission.
# In LOCAL_MODE, all CloudWatch calls are silently skipped.
CLOUDWATCH_NAMESPACE = "UptimeMonitor"

# ── Scheduler ──────────────────────────────────────────────
# Dev: 1 minute  |  Prod: 5 minutes (Lambda runs checks)
CHECK_INTERVAL_MINUTES = int(os.getenv("CHECK_INTERVAL_MINUTES", "5"))

# ── Grafana ────────────────────────────────────────────────
# Prod: https://grafana.yourdomain.com
# Dev:  http://localhost:3001 (set via VITE_GRAFANA_URL in .env)
GRAFANA_URL = os.getenv("GRAFANA_URL", "")

# ── Validation — warn loudly in prod if critical vars are missing ──
import logging
logger = logging.getLogger(__name__)

if not LOCAL_MODE:
    missing = []
    if not SNS_TOPIC_ARN:   missing.append("SNS_TOPIC_ARN")
    if not ALLOWED_ORIGINS_RAW or ALLOWED_ORIGINS_RAW == "*":
        missing.append("ALLOWED_ORIGINS (currently open — set to your domain)")
    if missing:
        logger.warning(f"⚠️  PROD CONFIG: missing or insecure variables: {', '.join(missing)}")
