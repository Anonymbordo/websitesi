FROM python:3.12-slim

# Ensure Python outputs are not buffered so logs appear immediately
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway at runtime sets $PORT. We read it in start.py.
EXPOSE 8000

CMD ["python", "start.py"]
