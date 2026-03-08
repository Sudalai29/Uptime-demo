# import sqlite3
# import os
# import logging

# logger = logging.getLogger(__name__)

# DB_FILE = os.getenv("LOCAL_DB_FILE", "linkvault-links.db")


# def get_table():
#     """
#     Similar to DynamoDB get_table().
#     Returns a SQLite connection.
#     """
#     conn = sqlite3.connect(DB_FILE)
#     conn.row_factory = sqlite3.Row
#     return conn


# def ensure_local_table():
#     """
#     Create table if it doesn't exist (similar to ensure_local_table in DynamoDB code).
#     """
#     conn = get_table()
#     cursor = conn.cursor()

#     cursor.execute("""
#         CREATE TABLE IF NOT EXISTS links (
#             id TEXT PRIMARY KEY,
#             url TEXT,
#             created_at TEXT
#         )
#     """)

#     conn.commit()
#     conn.close()

#     logger.info(f"Ensured local SQLite table: links")



import boto3
import os
import logging
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger(__name__)

TABLE_NAME = os.getenv("DYNAMODB_TABLE", "linkvault-links")
AWS_REGION  = os.getenv("AWS_REGION", "us-east-1")

# LOCAL_DYNAMO_URL is set in docker-compose for local dev
# In ECS it will be empty, so boto3 uses the real AWS endpoint
DYNAMO_ENDPOINT = os.getenv("LOCAL_DYNAMO_URL", None)


def get_table():
    kwargs = dict(region_name=AWS_REGION)
    if DYNAMO_ENDPOINT:
        kwargs["endpoint_url"] = DYNAMO_ENDPOINT
    dynamodb = boto3.resource("dynamodb", **kwargs)
    return dynamodb.Table(TABLE_NAME)


def ensure_local_table():
    """Create table in local DynamoDB if it doesn't exist (dev only)."""
    if not DYNAMO_ENDPOINT:
        return
    kwargs = dict(region_name=AWS_REGION, endpoint_url=DYNAMO_ENDPOINT)
    client = boto3.client("dynamodb", **kwargs)
    existing = client.list_tables()["TableNames"]
    if TABLE_NAME not in existing:
        client.create_table(
            TableName=TABLE_NAME,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        logger.info(f"Created local DynamoDB table: {TABLE_NAME}")
