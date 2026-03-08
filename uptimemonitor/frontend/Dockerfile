# ── Stage 1: Builder ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

# ── Stage 2: Dev server (local only) ──────────────────────
# For local dev we don't use the builder stage —
# docker-compose mounts source and runs vite dev server directly.
# This stage is used when you want to build & serve the static files
# via a lightweight HTTP server (closer to production S3+CloudFront).
FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
