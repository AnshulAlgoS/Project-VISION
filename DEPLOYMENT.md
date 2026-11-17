# Vercel + Render deployment

Deploy backend first. Repo: https://github.com/AnshulAlgoS/Project-VISION ; branch: main.

## Render backend (Docker)

1. Render → New → Blueprint → connect this repository. The checked-in `render.yaml` defines one Docker web service and a 1GB persistent disk. Review the paid service/disk plan before creating it. Alternatively New Web Service → Docker, repository root `.`, Dockerfile `./Dockerfile`, Docker build context `.`.
2. Use Standard or a plan with at least 2GB RAM as a starting point for three ML models; actual memory use depends on media. A 512MB service may run out of memory. Do not create a second Render frontend service.
3. Dockerfile handles build/start. Leave Render Docker Command blank. It runs `uvicorn app.hosted:app --app-dir backend --host 0.0.0.0 --port ${PORT:-10000} --workers 1`.
4. Environment:

| Key | Value |
|---|---|
| `PORT` | `10000` |
| `VISION_DB_PATH` | `/app/data/vision.db` |
| `ALLOWED_ORIGINS` | `https://YOUR-PROJECT.vercel.app` |

Attach a disk mounted at `/app/data` if creating manually. SQLite requires one service instance / one worker. Without a disk the demo state resets on redeploy. Comma-separate additional exact frontend origins, including any custom domain; no trailing slash.

5. Deploy. Copy the actual service URL. Verify `https://YOUR-SERVICE.onrender.com/health` returns `status: ok` and all three models true; `/state` returns hospitals, cases and ambulances.

`app.hosted` serves coordination and original clinical routes in one process. Do not use the older `app.main` start command alone: it lacks coordination endpoints. Docker installs CPU Torch and FFmpeg. First build/model startup can take several minutes.

## Vercel frontend

1. Add New Project → import this same repository → branch main.
2. Root Directory: repository root (`.`). Framework Preset: Vite. Install: `npm ci`. Build: `npm run build`. Output: `dist`.
3. Add the following variable for Production (and Preview only if desired):

```text
VITE_API_BASE_URL=https://YOUR-ACTUAL-RENDER-SERVICE.onrender.com
```

No `/api` suffix or trailing slash. This is a public URL, not a secret. Never put provider keys into VITE variables.

4. Deploy. Copy the Vercel production URL into Render `ALLOWED_ORIGINS` and redeploy Render. If you change Vercel variables, redeploy Vercel too: Vite embeds them at build time.
5. `vercel.json` provides SPA routing for `/patient`, `/post-op`, `/opd-queue`, `/reports` etc.

## Optional server-only providers

No API keys are required for trained face, voice or vitals models or resource matching.

- `NVIDIA_API_KEY`: optional external text summary provider; without it summaries use the deterministic fallback.
- `VISION_ENABLE_MONGODB=1`, `MONGODB_URI`, `MONGODB_DB_NAME=vision`: explicit opt-in MongoDB persistence for original clinical analyses/users/documents metadata. Without MongoDB, these original clinical lists are in memory and reset on restart. Coordination data is persisted independently in SQLite.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`: optional real WhatsApp delivery. Leave unset for demo; live messaging is not required for dispatch simulation.

Set secrets only on Render. Leave optional variables absent rather than entering example placeholders. Neither platform needs GitHub/VERCEL tokens when deploying through its dashboard Git integration.

## Verify after deployment

- Open homepage, then create a synthetic SOS request.
- Dispatch → upload consenting/public face media and a voice sample, enter synthetic vitals → run multimodal assessment. Check included/excluded signals and score.
- Confirm eligible hospital → bed count and ambulance availability change. Advance simulated ambulance to arrival, then discharge → reusable resources return.
- Verify `/patient`, `/post-op`, `/opd-queue`, `/reports` loads and refreshes directly.
- Transfers → move supplies, confirm receipt, verify counts.

Software integration is tested locally. Remote deployments must still be checked after creation. This is an unauthenticated hackathon demo with simulated facilities, movement and advisory model scores; use synthetic data only.

## Troubleshooting

- HTML instead of JSON: `VITE_API_BASE_URL` missing/wrong, or old Vercel build. Set actual Render URL and redeploy.
- CORS: Render `ALLOWED_ORIGINS` must include exact browser origin, no trailing slash; redeploy after changing it.
- `/state` returns 404: Render started `app.main` rather than `app.hosted`.
- Out of memory: increase Render instance memory; keep one worker.
- Model loading failure: inspect Render logs and `/health`. Required model artifacts are committed under `backend/app/models`.
- Face excluded: use a well-lit face image or short video; no detected face is explicitly excluded, not assigned a zero-risk score.
- Voice excluded: silent, undecodable or unavailable-model audio is excluded. FFmpeg is included in Docker.

Official references: https://vercel.com/docs/frameworks/frontend/vite , https://render.com/docs/docker , https://render.com/docs/disks , https://render.com/docs/configure-environment-variables .

## Current live URLs

Frontend: https://vision-ten-dun.vercel.app/
Backend: https://project-vision-ny6c.onrender.com/

The checked-in Vercel `/api/:path*` rewrite proxies to this Render service. With this setup leave `VITE_API_BASE_URL` unset (the browser uses same-origin `/api`). Direct browser calls to Render still require `ALLOWED_ORIGINS=https://vision-ten-dun.vercel.app`. If the Render URL changes, update the rewrite destination.

Runtime memory optimizations: OpenCV detection + the same face CNN are the default (`VISION_FACE_DETECTOR=opencv`); MediaPipe is optional in development. Voice serving computes training-compatible MFCCs using NumPy/SciPy and omits unused pitch inference. Audio decoding is limited to ten seconds. MFCC and classifier parity is checked against librosa at three sample rates. This lowers memory/CPU overhead but is not a guarantee that every media workload fits a 512MB instance.

MongoDB is disabled by default, even if an old `MONGODB_URI` remains in Render. The current deployment uses SQLite for coordination and in-memory original clinical lists. Do not enable MongoDB for this demo.
