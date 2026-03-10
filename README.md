# Uptime Monitor — Local Dev Guide

## Run everything with Docker Compose

```bash
docker-compose up --build
```

- API: http://localhost:8000/docs
- DynamoDB Local: http://localhost:8001

## Run frontend

```bash
cd frontend
npm install
npm run dev
# http://<ec2-ip>:3000
```

## How it works locally

1. Docker Compose starts FastAPI + DynamoDB Local
2. On startup, FastAPI creates DynamoDB tables automatically
3. APScheduler runs `run_checks()` immediately, then every 1 minute
4. Add a monitor via the UI → it gets pinged on next check cycle
5. Check logs: `docker logs uptime-api -f`

## Environment variables

| Variable               | Local value              | Production value         |
|------------------------|--------------------------|--------------------------|
| LOCAL_MODE             | true                     | false                    |
| LOCAL_DYNAMO_URL       | http://dynamodb-local:8001 | (empty)                |
| CHECK_INTERVAL_MINUTES | 1                        | 5                        |
| MONITORS_TABLE         | uptime-monitors          | uptime-monitors          |
| CHECKS_TABLE           | uptime-checks            | uptime-checks            |
| SNS_TOPIC_ARN          | (not needed locally)     | arn:aws:sns:...          |

## On AWS (ECS + Lambda)

- Remove `LOCAL_MODE` and `LOCAL_DYNAMO_URL` from ECS task env vars
- Deploy `lambda_handler.py` as a Lambda function
- EventBridge rule triggers Lambda every 5 minutes
- ECS Fargate runs only the FastAPI (no scheduler)
