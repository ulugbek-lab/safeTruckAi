# Portfolio and resume copy

## Short portfolio description

SafeTruck AI is a local computer vision and full-stack safety monitoring MVP built with Python, YOLO, ByteTrack, FastAPI, PostgreSQL, React, and TypeScript. It combines separate person-tracking and PPE models with temporal evidence confirmation and per-track alert cooldowns, then persists potential violations for dashboard review. The dashboard provides server-aggregated analytics, filtered history, and review updates. Validation includes backend and detector regression tests, isolated PostgreSQL/browser integration checks, and measured per-class model limitations.

## Resume bullets

- Built an end-to-end local PPE incident monitoring pipeline integrating YOLO/ByteTrack inference, a FastAPI API, PostgreSQL persistence, and a responsive React/TypeScript dashboard.
- Implemented multi-frame missing-PPE confirmation and per-track/per-violation alert cooldowns while keeping general person tracking separate from the custom PPE model.
- Added database-backed pagination, filtering, UTC incident analytics, and validated review updates; verified behavior with 20 regression tests on both SQLite and PostgreSQL.
- Evaluated a ten-epoch model on 200 validation images, reported per-class precision/recall and mAP, and documented the runtime-resolution tradeoff instead of presenting validation metrics as production accuracy.

Use only the bullets that reflect your own contribution and interview discussion. Do not claim deployment, permanent worker identification, evidence recording, safety certification, or real-world accident reduction.

## Five engineering achievements with evidence

| Achievement | Implementation evidence | Verification and limits |
| --- | --- | --- |
| Separation of tracking from PPE detection | `main.py`: general model uses `classes=[0]` and ByteTrack; custom model supplies four selected PPE labels | Real MPS inference/ByteTrack on two local validation images; no identity recognition or tracking benchmark |
| Temporal alert suppression | Eight missing-PPE observations, unknown-evidence tolerance, compliant-PPE reset, latched alerts, 30-second cooldown | Controlled loop and helper tests; successful HTTP submission and duplicate suppression against a disposable PostgreSQL API |
| Durable incident/review workflow | FastAPI create/detail/PATCH schemas and SQLModel persistence | Browser review of a synthetic record was verified through the API; original incident rows remained unchanged |
| Correct dashboard aggregates and resilient refresh | Whole-table SQL aggregates, UTC calendar buckets, type/status filters, stable timestamp/ID ordering, cancellation and sequential polling | Pagination/UTC/outage regression checks; real browser filters, empty states, and two-page navigation |
| Honest evaluation and repeatability | `scripts/evaluate_model.py`, checkpoint/data fingerprints, 416/320-pixel evaluation artifacts, `scripts/verify_postgres.py` | 200-image validation, 20 tests on each database engine, actual UI screenshots, explicit camera-permission and field-validation limits |

## Interview explanation (about 45 seconds)

“I separated general person tracking from PPE detection so the custom model's labels would not define worker identity. The difficult integration was turning noisy frame detections into reviewable incidents: I used body-region association, multi-frame confirmation, and cooldowns, then persisted incidents through FastAPI. The React dashboard queries real database aggregates rather than estimating totals from one page. I tested review writes in a disposable PostgreSQL database to protect existing records. Model evaluation showed that missing-PPE recall is still limited, especially at the smaller runtime resolution, so I present the project as a local engineering MVP that requires human review.”
