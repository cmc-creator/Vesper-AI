# Use Python 3.10 slim image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy backend requirements
COPY backend/requirements.txt /app/backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ /app/backend/

# Expose port (Railway sets $PORT)
EXPOSE 8000

# Start command
CMD cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
