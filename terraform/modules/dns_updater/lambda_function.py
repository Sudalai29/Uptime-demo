"""
dns_updater.py — Lambda triggered by ECS task state change.

When the ECS task reaches RUNNING state it fetches the task's
public IP and updates Route 53 A records for both api. and grafana.
subdomains to point at the new IP.

Trigger: EventBridge rule on ECS Task State Change → RUNNING
"""
import boto3
import json
import logging
import os
import time

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ecs    = boto3.client("ecs")
ec2    = boto3.client("ec2")
r53    = boto3.client("route53")

CLUSTER_NAME   = os.environ["CLUSTER_NAME"]
HOSTED_ZONE_ID = os.environ["HOSTED_ZONE_ID"]
API_DOMAIN     = os.environ["API_DOMAIN"]       # e.g. api.yourdomain.com
GRAFANA_DOMAIN = os.environ["GRAFANA_DOMAIN"]   # e.g. grafana.yourdomain.com


def get_task_public_ip(cluster: str, task_arn: str, retries: int = 6) -> str | None:
    """
    Fetch the public IP of a running ECS task.
    Retries up to 6 times with 5s delay — the ENI may not have a
    public IP immediately after the task reaches RUNNING state.
    """
    for attempt in range(retries):
        try:
            task = ecs.describe_tasks(cluster=cluster, tasks=[task_arn])["tasks"][0]
            attachments = task.get("attachments", [])

            eni_id = None
            for attachment in attachments:
                if attachment["type"] == "ElasticNetworkInterface":
                    for detail in attachment["details"]:
                        if detail["name"] == "networkInterfaceId":
                            eni_id = detail["value"]
                            break

            if not eni_id:
                logger.warning(f"No ENI found on attempt {attempt + 1}, retrying...")
                time.sleep(5)
                continue

            eni = ec2.describe_network_interfaces(NetworkInterfaceIds=[eni_id])
            public_ip = eni["NetworkInterfaces"][0].get("Association", {}).get("PublicIp")

            if not public_ip:
                logger.warning(f"No public IP on ENI {eni_id} yet (attempt {attempt + 1}), retrying...")
                time.sleep(5)
                continue

            return public_ip

        except Exception as e:
            logger.error(f"Error fetching task IP (attempt {attempt + 1}): {e}")
            time.sleep(5)

    return None


def update_route53(hosted_zone_id: str, domain: str, ip: str):
    """Upsert an A record pointing domain → ip."""
    r53.change_resource_record_sets(
        HostedZoneId=hosted_zone_id,
        ChangeBatch={
            "Comment": f"Auto-updated by dns_updater Lambda — {domain} → {ip}",
            "Changes": [{
                "Action": "UPSERT",
                "ResourceRecordSet": {
                    "Name": domain,
                    "Type": "A",
                    "TTL": 60,   # low TTL — IP changes on every restart
                    "ResourceRecords": [{"Value": ip}],
                }
            }]
        }
    )
    logger.info(f"Route 53 updated: {domain} → {ip}")


def handler(event, context):
    logger.info(f"Event: {json.dumps(event)}")

    detail      = event.get("detail", {})
    task_arn    = detail.get("taskArn", "")
    last_status = detail.get("lastStatus", "")

    if last_status != "RUNNING":
        logger.info(f"Task status is {last_status}, not RUNNING — skipping")
        return {"status": "skipped", "reason": f"status={last_status}"}

    # Only act on tasks from our cluster
    cluster_arn = detail.get("clusterArn", "")
    if CLUSTER_NAME not in cluster_arn:
        logger.info(f"Task is from a different cluster ({cluster_arn}), skipping")
        return {"status": "skipped", "reason": "wrong cluster"}

    logger.info(f"ECS task RUNNING: {task_arn} — fetching public IP...")

    public_ip = get_task_public_ip(CLUSTER_NAME, task_arn)

    if not public_ip:
        logger.error("Could not determine public IP after all retries — DNS not updated")
        raise RuntimeError("Failed to get public IP")

    logger.info(f"Public IP: {public_ip}")

    update_route53(HOSTED_ZONE_ID, API_DOMAIN,     public_ip)
    update_route53(HOSTED_ZONE_ID, GRAFANA_DOMAIN, public_ip)

    return {
        "status":     "success",
        "public_ip":  public_ip,
        "updated":    [API_DOMAIN, GRAFANA_DOMAIN],
    }
