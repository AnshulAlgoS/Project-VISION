# Project VISION

Marvel-inspired healthcare command interface, adapted from an existing healthcare application.

React / TypeScript / Vite frontend and FastAPI backend. Existing modules include patient check-ins, OPD queues, monitoring, alerts and reports. Emergency dispatch, bed allocation and hospital inventory are not implemented.

## Run

`npm install` then `npm run dev`. Backend: `cd backend`, `pip install -r requirements.txt`, then `uvicorn app.main:app --reload --port 8000`. Configure provider credentials through environment variables; see `.env.example`.

This is a demonstration system and requires professional oversight.
