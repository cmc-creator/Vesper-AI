# Use Python 3.10
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies for python-magic
RUN apt-get update && apt-get install -y libmagic1 && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend/ ./backend/
COPY firebase-service-account.json* ./ 2>/dev/null || true

# Copy .env if it exists
COPY .env* ./ 2>/dev/null || true

# Expose port (Railway will override with $PORT)
EXPOSE 8000

# Start the server
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
