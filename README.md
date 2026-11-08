# SafeTruck AI

A local workplace safety monitoring system that detects potential missing helmets and safety vests, tracks workers, stores incidents in PostgreSQL, and provides a React dashboard for incident review. AI detections are potential violations that require human assessment.

## Current features

- Separate YOLO person tracking (ByteTrack) and custom PPE detection with worker-to-PPE association.
- Multi-frame violation confirmation, alert cooldowns, and Apple Silicon MPS inference where available.
- FastAPI incident creation and retrieval backed by PostgreSQL in Docker.
- Responsive dashboard with all-time statistics, 14-day incident activity, and violation distribution.
- Server-side history filters, deterministic timestamp sorting, pagination, and incident details.
- Pending, reviewed, and dismissed review states persisted through a validated PATCH endpoint.
- Automatic refresh 8 seconds after each completed fetch, manual refresh, last successful update time, loading, empty, and failure states. Requests time out after 15 seconds; polling never overlaps and is cancelled on unmount or filter changes.

## Technology and architecture

Python, Ultralytics YOLO, OpenCV, PyTorch/MPS, ByteTrack, FastAPI, SQLModel/SQLAlchemy, PostgreSQL 17, React 19, TypeScript, Vite, Tailwind CSS 4, Lucide React, and Recharts.

```text
Webcam → main.py (tracking + PPE) → POST /api/incidents → FastAPI → PostgreSQL
React dashboard → Vite /api proxy → FastAPI queries / aggregates / review updates
```

```text
backend/
  database.py           Existing database configuration and session dependency
  models.py             Existing table plus API response and dashboard schemas
  main.py               Existing routes, dashboard router, safe storage error response
  dashboard.py          Filtered pagination, aggregates, review updates
frontend/
  src/components/       Cards, charts, incident table, detail/review dialog, status badge
  src/hooks/            Polling, cancellation, timeout, and refresh state
  src/layouts/          Responsive navigation and app shell
  src/pages/            Dashboard composition and filters
  src/services/         Typed API client
  src/types/            Incident and dashboard contracts
  .env.example          Public API/proxy configuration only
requirements-backend.txt
requirements-dev.txt
tests/test_dashboard.py
docs/openapi.json       Generated FastAPI contract, including existing routes
```

## Local setup

Use Python 3.10+ (3.11 or 3.12 is recommended for the ML environment), Node.js 20.19+ or 22.12+, npm, and Docker Desktop. Backend/dashboard checks were run with Python 3.13 and Node 22; the ML pipeline was not reinstalled or rerun for Phase 5.

From the repository root:

```bash
cd ~/Desktop/safeTruckAi
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-backend.txt
```

Keep your existing `.env` and Docker volume. For a new installation only, copy `.env.example` to `.env` and choose your local credentials before starting PostgreSQL. The existing compose file publishes PostgreSQL at `127.0.0.1:5433`. Never replace credentials for an already initialized volume without intentionally updating the database role too. Do not run `docker compose down -v` on a database you want to retain.

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Start FastAPI in a second terminal, from the repository root:

```bash
source .venv/bin/activate
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

API documentation: <http://127.0.0.1:8000/docs>. The existing startup creates missing tables; Phase 5 requires no migration or column changes. The timestamp mapping explicitly retains the existing `timestamp with time zone` storage type across SQLModel versions.

Start React in another terminal:

```bash
cd ~/Desktop/safeTruckAi/frontend
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>. Vite proxies `/api` to `http://127.0.0.1:8000`; no CORS configuration is needed for this setup. Optional `frontend/.env.local` values are documented in `frontend/.env.example`. `API_PROXY_TARGET` stays in Vite's server process; `VITE_API_BASE_URL` is public browser configuration. Never use a `VITE_` variable for credentials. A separately hosted frontend must use a same-origin reverse proxy or explicitly configured backend CORS; Vite's development proxy is not a production server.

Start the existing AI detector from the repository root in its working ML environment:

```bash
python -m pip install -r requirements.txt
python main.py
```

Keep `models/best.pt`, `yolo26n.pt`, and `custom_tracker.yaml` in their current locations. The detector requires OpenCV camera access and posts to port 8000. Press `q` in its OpenCV window to stop. Root ML requirements retain their existing packages and add the `requests` dependency imported by the detector; Ultralytics supplies PyTorch. Training remains unchanged and requires the external `construction-ppe.yaml` dataset configuration.

## API contract

| Method | Endpoint                           | Behavior                                                                                                              |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                          | Process liveness; does not assert camera or database health                                                           |
| POST   | `/api/incidents`                   | Existing detector contract: `{ "worker_id": 8, "violation": "no_helmet" }`; returns 201                               |
| GET    | `/api/incidents?limit=50`          | Preserved legacy array, newest ID first, limit 1–100                                                                  |
| GET    | `/api/incidents/{id}`              | Actual stored incident, or 404                                                                                        |
| PATCH  | `/api/incidents/{id}`              | `{ "status": "pending" \| "reviewed" \| "dismissed" }`; updated record or 404                                         |
| GET    | `/api/dashboard/incidents`         | `{ items, total, offset, limit }`; optional `violation`, `status`, `sort=newest\|oldest`, `offset>=0`, `limit=1..100` |
| GET    | `/api/dashboard/statistics`        | `{ total, pending, no_helmet, no_vest }` across all stored incidents                                                  |
| GET    | `/api/dashboard/analytics?days=14` | UTC daily counts for 1–90 inclusive calendar days ending today, including zero days; all-time violation distribution  |

Invalid inputs return FastAPI 422 validation errors. Missing incidents return 404. Database failures during requests return 503 with a generic `detail` message; credentials and SQL are not exposed. Statistics and distribution include dismissed records and do not follow table filters. Chart headings explicitly state their time windows. Each API response represents its own query snapshot, so incoming detections may cause small differences between simultaneously refreshed widgets.

The inspected PostgreSQL database uses timezone-aware timestamps. The model explicitly retains that type, and incident responses normalize timestamps to an explicit UTC offset. The UI shows incident times in the browser's local zone and labels that zone; daily chart buckets remain UTC. The response serializer also accepts naive UTC values from SQLite tests or older installations; no timestamp migration is performed.

## Validation

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
cd frontend
npm run typecheck
npm run build
npm run preview
```

The default pytest suite uses disposable in-memory SQLite and overrides the database dependency, so it never writes to your incident database. It verifies totals beyond a page, filters, stable ordering, pagination, UTC boundaries/zero days, review persistence, input rejection, legacy API compatibility, missing records, and safe storage errors. The same suite can run with `TEST_DATABASE_URL` pointing to a **disposable** PostgreSQL database whose name includes `_phase5_test_`. The fixture creates and drops tables there. Never point it at your real database.

The generated API contract can be refreshed with:

```bash
python -c 'import json; from backend.main import app; from pathlib import Path; Path("docs/openapi.json").write_text(json.dumps(app.openapi(), indent=2) + "\n")'
```

## Limitations and future work

- Local MVP with no authentication, role controls, review attribution, or review audit history. Do not expose it publicly as-is. Concurrent reviewers use last-write-wins updates.
- Tracking IDs are temporary tracks, not worker identities, and may change after re-entry.
- No screenshots, video capture, browser webcam streaming, or uploads; details explicitly state that evidence is unavailable.
- API connection status indicates successful database-backed requests, not camera health or detector uptime.
- Offset pagination can shift when new incidents arrive; timestamp ties use incident ID for deterministic ordering.
- Aggregates query the existing table without schema/index changes. Larger deployments may need indexes, retention policies, date-range filtering, and cursor pagination.
- Inference accuracy, model training, and existing MPS optimizations are unchanged and were not validated by the dashboard checks.
- Future phases: authentication, evidence capture, camera metadata, review audit trails, and operational health reporting.

No build output, dependencies, secrets, local databases, or weights should be committed. Phase 5 changes are intentionally left uncommitted for review.

Suggested commit: `feat: build React safety monitoring dashboard with incident analytics`
