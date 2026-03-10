"""
AWS Lambda entry point.
EventBridge calls this every 5 minutes in production.
The actual logic lives in checker.py — shared with local APScheduler.
"""
from app.checker import run_checks


def handler(event, context):
    run_checks()
    return {"statusCode": 200, "body": "Checks complete"}
