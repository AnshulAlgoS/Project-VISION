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

Seeded facilities, coordinates, travel estimates and ambulance movement are simulations. Recommendations are an explainable resource-matching heuristic, not an LLM or validated clinical model. Staff confirmation is mandatory for dispatch.

## Existing clinical ML modules

Original patient check-ins, face/voice/vitals models, clinical queue and reports are preserved. They require the separate original FastAPI backend and its dependencies/provider configuration. The default lightweight coordination server does not run these models. They are not yet connected to allocation ranking. Do not claim autonomous diagnosis or clinically validated allocation.

## Validation

`npm run build`, `npx tsc --noEmit -p tsconfig.app.json`, `python3 server/test_flow.py`.

Local prototype has no authentication. Use synthetic data only. Deployment and production access controls are outside this local demo.
