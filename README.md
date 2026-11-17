# Project VISION

Local emergency healthcare coordination demo with a Marvel-inspired command interface.

## Start

Requires Python 3.10+ and Node/npm. Run `npm install`, then `./start-demo.sh`. Open http://127.0.0.1:8080 . Emergency backend runs at http://127.0.0.1:8000 and persists data in ignored `server/vision.db`.

## Demo flow

1. Create an SOS with a staff-assigned urgency, location and resource requirements.
2. Open Dispatch. Compare eligible hospitals by distance, ER load and required facilities.
3. Confirm a hospital. Backend atomically reserves resources and assigns the nearest available ambulance.
4. Advance the simulated ambulance four times to arrival. Confirm discharge to release reusable resources. Oxygen and blood are consumed rather than automatically replenished.
5. Edit verified capacity in Hospitals. Transfer supplies between hospitals and confirm receipt. Patient transfers require an arrived case and destination capacity; advance ambulance to arrival before receipt.

Seeded facilities, coordinates, travel estimates and ambulance movement are simulations. Recommendations are an explainable resource-matching heuristic, with an optional experimental trained-vitals risk modifier, not a clinically validated allocation model. Staff confirmation is mandatory for dispatch.

## Existing clinical ML modules

Original patient check-ins, face/voice/vitals models, clinical queue and reports are preserved. The startup script runs the original FastAPI backend on port 8001; the coordination server on 8000 proxies its original endpoints. In Dispatch, upload face image/video and voice audio with measured vitals. The original backend runs the trained face CNN, voice model and vitals model. Fusion weights usable vitals/face/voice at 0.6/0.2/0.2 and normalizes over usable signals; missing or unusable media is excluded and displayed explicitly. The stored combined advisory score breaks queue ties within staff-assigned urgency and increases distance weighting in eligible-hospital ranking. Model scores do not set bed/equipment requirements. Staff confirms dispatch. OpenCV Haar detection is used when MediaPipe landmarks are unavailable; this fallback supplies emotion-based CNN scores, not eye fatigue measurements. Do not claim autonomous diagnosis or clinically validated allocation.

## Validation

`npm run build`, `npx tsc --noEmit -p tsconfig.app.json`, `python3 server/test_flow.py`.

Local prototype has no authentication. Use synthetic data only. Deployment and production access controls are outside this local demo.

## Multimodal verification

`python3 server/test_multimodal_live.py FACE_IMAGE VOICE_WAV` tests actual inference, signal inclusion, persisted fusion, allocation, dispatch, arrival and resource release through the frontend proxy. Test with consented/public face media and synthetic audio; this validates software integration, not clinical accuracy. `cd backend && python test_fusion.py` tests missing/invalid-signal behavior.

White Wakanda/Avengers fan-theme uses downloaded artwork; credits in `public/images/SOURCES.md`. No Marvel affiliation.
