#!/bin/sh
cd "$(dirname "$0")" || exit 1
python3 server/main.py &
BACKEND_PID=$!
trap 'kill "$BACKEND_PID" 2>/dev/null' EXIT INT TERM
npm run dev -- --host 127.0.0.1
