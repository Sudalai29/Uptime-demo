# ── Stage 1: Builder ──────────────────────────────────────
# Use slim for building (alpine struggles with some C extensions in boto3)
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build tools, then clean up in same layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY app/requirements.txt .

# Install ONLY prod deps into an isolated prefix — no pytest, no test tools
RUN pip install --upgrade pip --quiet && \
    pip install \
      --no-cache-dir \
      --no-compile \
      --prefix=/install \
      -r requirements.txt


# ── Stage 2: Runtime ──────────────────────────────────────
# Distroless would be ideal but slim is fine and easier to debug
FROM python:3.11-slim AS runtime

# No shell tools, no pip, no gcc in the final image
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && pip uninstall -y pip setuptools wheel 2>/dev/null || true

# Non-root user
RUN useradd --create-home --no-log-init appuser
WORKDIR /home/appuser

# Copy only the installed packages from builder
COPY --from=builder /install /usr/local

# Copy app source
COPY --chown=appuser:appuser app/ .

USER appuser

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONOPTIMIZE=1 \
    PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
