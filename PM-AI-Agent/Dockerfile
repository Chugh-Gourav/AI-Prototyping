# ==============================================================================
# PM-AI-AGENT: Container Image Specification (Dockerfile)
# ==============================================================================
# PRODUCT ROLE:
#   Defines the production multi-stage container build for Google Cloud Run.
#   Packages the FastAPI backend server, SQLite database, and StaySharp Agent.
# ==============================================================================

FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY agent/ ./agent/
COPY backend/ ./backend/

# Expose Cloud Run default port
EXPOSE 8080

# Run FastAPI with Uvicorn
CMD exec uvicorn backend.api_server:app --host 0.0.0.0 --port ${PORT}
