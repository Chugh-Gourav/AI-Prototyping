# ==============================================================================
# PM-AI-AGENT: Unified Production Container (Dockerfile)
# ==============================================================================
# Multi-stage build:
# Stage 1 builds the React Vite frontend
# Stage 2 sets up Python 3.11, seeds the SQLite catalog, and serves both via FastAPI
# ==============================================================================

# --- Stage 1: Build React Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production Python Backend ---
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent/ ./agent/
COPY backend/ ./backend/
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Seed initial verified catalog into SQLite on container build
RUN python backend/seed_data.py

EXPOSE 8080

CMD exec uvicorn backend.api_server:app --host 0.0.0.0 --port ${PORT}
