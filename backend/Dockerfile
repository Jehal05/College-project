FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /code

# Every dependency pinned (requirements.lock.txt) so the demo image is the same every time.
COPY requirements.lock.txt .
RUN pip install --no-cache-dir -r requirements.lock.txt

COPY . .

# Run as a normal user, not root. The SQLite file is written in /code, so that folder belongs to this user.
RUN useradd --create-home --uid 10001 app && chown -R app:app /code
USER app

EXPOSE 8000

# Docker marks the container "unhealthy" if /health stops answering (same check as docker-compose.yml; the slim image has no curl).
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3)"

# No --reload: the demo must not restart by itself. For development use:
#   docker compose run --service-ports api uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
