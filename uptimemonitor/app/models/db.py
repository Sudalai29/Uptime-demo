import boto3
import logging
from app.config import AWS_REGION, DYNAMO_ENDPOINT, MONITORS_TABLE, CHECKS_TABLE

logger = logging.getLogger(__name__)


def get_resource():
    kwargs = dict(region_name=AWS_REGION)
    if DYNAMO_ENDPOINT:
        kwargs["endpoint_url"] = DYNAMO_ENDPOINT
    return boto3.resource("dynamodb", **kwargs)


def get_monitors_table():
    return get_resource().Table(MONITORS_TABLE)


def get_checks_table():
    return get_resource().Table(CHECKS_TABLE)


def ensure_local_tables():
    """Create tables in DynamoDB Local if they don't exist. Dev only."""
    if not DYNAMO_ENDPOINT:
        return

    client = boto3.client("dynamodb", region_name=AWS_REGION, endpoint_url=DYNAMO_ENDPOINT)
    existing = client.list_tables()["TableNames"]

    if MONITORS_TABLE not in existing:
        client.create_table(
            TableName=MONITORS_TABLE,
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        logger.info(f"Created local table: {MONITORS_TABLE}")

    if CHECKS_TABLE not in existing:
        client.create_table(
            TableName=CHECKS_TABLE,
            KeySchema=[
                {"AttributeName": "monitor_id", "KeyType": "HASH"},
                {"AttributeName": "checked_at",  "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "monitor_id", "AttributeType": "S"},
                {"AttributeName": "checked_at",  "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        logger.info(f"Created local table: {CHECKS_TABLE}")
