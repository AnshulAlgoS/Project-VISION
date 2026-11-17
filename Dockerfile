FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 MPLCONFIGDIR=/tmp/matplotlib OMP_NUM_THREADS=1
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libglib2.0-0 libgl1 libgomp1 && rm -rf /var/lib/apt/lists/*
COPY backend/requirements-render.txt /app/backend/requirements-render.txt
RUN pip install --no-cache-dir torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir -r backend/requirements-render.txt
COPY backend /app/backend
COPY server /app/server
RUN mkdir -p /app/data
EXPOSE 10000
CMD ["sh", "-c", "uvicorn app.hosted:app --app-dir backend --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
