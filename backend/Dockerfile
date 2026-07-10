FROM python:3.12-slim

# Install system dependencies (libpq-dev and build-essential are required for psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY app/ app/
COPY alembic/ alembic/
COPY alembic.ini .

# Create upload directory
RUN mkdir -p uploads/audio

EXPOSE 8000

# Run alembic migrations and start uvicorn
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
