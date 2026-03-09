# ── Stage 1: Dependencies ─────────────────────────────────
# Separate layer so npm install only re-runs when package.json changes
FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
# ci is faster & deterministic vs install, also omits devDependencies in prod
RUN npm ci --prefer-offline


# ── Stage 2: Builder (prod only) ──────────────────────────
# Builds static files for S3 upload — not used in docker-compose
FROM node:20-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Output is in /app/dist — CI copies this to S3


# ── Stage 3: Dev server (local docker-compose) ────────────
# node:20-alpine is ~180MB vs node:20 which is ~1GB
FROM node:20-alpine AS dev

WORKDIR /app

# Copy pre-installed node_modules from deps stage
# This means docker-compose doesn't re-run npm install on every build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
