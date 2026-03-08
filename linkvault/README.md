# LinkVault — Local Development Guide

## Prerequisites
- Docker & Docker Compose installed
- Python 3.11+ (for running tests locally without Docker)

---

## Option 1: Run with Docker Compose (Recommended)

This spins up the FastAPI app + DynamoDB Local together.

```bash
# Clone and go to project root
cd linkvault

# Start everything
docker-compose up --build

# API is live at:
#   http://localhost:8000
#   http://localhost:8000/docs   ← Swagger UI
#   http://localhost:8000/health

# Stop
docker-compose down
```

---

## Option 2: Run Directly on EC2 (without Docker)

```bash
# 1. Install Python deps
cd app
pip install -r requirements.txt

# 2. Copy env file
cp ../.env.example ../.env

# 3. Start DynamoDB Local separately (needs Java) OR point to real AWS DynamoDB
#    For real AWS: remove LOCAL_DYNAMO_URL from .env and set real AWS credentials

# 4. Run the app
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Option 3: Build & Run Docker image manually (no compose)

```bash
cd app

# Build
docker build -t linkvault:local .

# Run (needs a running DynamoDB Local or real AWS creds)
docker run -p 8000:8000 \
  -e DYNAMODB_TABLE=linkvault-links \
  -e AWS_REGION=us-east-1 \
  -e LOCAL_DYNAMO_URL=http://host.docker.internal:8001 \
  -e AWS_ACCESS_KEY_ID=local \
  -e AWS_SECRET_ACCESS_KEY=local \
  linkvault:local
```

---

## Run Tests

```bash
cd app
pip install -r requirements.txt
pytest tests/ -v
```

---

## API Endpoints

| Method | Endpoint            | Description              |
|--------|---------------------|--------------------------|
| GET    | /health             | Health check             |
| GET    | /links/             | List all links           |
| GET    | /links/?tag=python  | Filter by tag            |
| GET    | /links/?search=aws  | Search by title or URL   |
| GET    | /links/{id}         | Get single link          |
| POST   | /links/             | Create a new link        |
| PUT    | /links/{id}         | Update a link            |
| DELETE | /links/{id}         | Delete a link            |
| GET    | /links/tags/all     | List all tags in use     |

Full interactive docs: **http://localhost:8000/docs**

---

## Environment Variables

| Variable          | Description                              | Default             |
|-------------------|------------------------------------------|---------------------|
| DYNAMODB_TABLE    | DynamoDB table name                      | linkvault-links     |
| AWS_REGION        | AWS region                               | us-east-1           |
| LOCAL_DYNAMO_URL  | Local DynamoDB endpoint (dev only)       | (empty = use AWS)   |
| AWS_ACCESS_KEY_ID | AWS key (not needed on ECS — uses IAM role) | —               |

---

## Notes for ECS Deployment
- Remove `LOCAL_DYNAMO_URL` env var entirely — app will use real DynamoDB
- Remove `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — ECS task IAM role handles auth
- The `HEALTHCHECK` in Dockerfile is used by ECS to monitor container health
