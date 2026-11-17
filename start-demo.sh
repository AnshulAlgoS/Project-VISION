#!/bin/sh
cd "$(dirname "$0")" || exit 1
if [ ! -x .venv/bin/python ]; then
  echo 'Run python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt first.'
  exit 1
fi
.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001 &
ML_PID=$!
python3 server/main.py &
BACKEND_PID=$!
trap 'kill "$BACKEND_PID" "$ML_PID" 2>/dev/null' EXIT INT TERM
npm run dev -- --host 127.0.0.1
