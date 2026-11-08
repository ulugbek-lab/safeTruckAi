# SafeTruck AI — final validation and portfolio readiness

**Date:** 2026-11-08 (Asia/Seoul)
**Repository:** `/Users/beki/Desktop/safeTruckAi`
**Scope:** Final verification, focused cleanup, model evaluation, and portfolio documentation. No retraining, deployment, commits, or pushes.

## Assessment

The project is ready to present as a **local, measured full-stack computer vision MVP**, with an explicit physical-camera acceptance gap: this execution host could not open the physical webcam because camera authorization was unavailable. A complete physical webcam → detected violation → stored incident → dashboard sequence was therefore **not** demonstrated in Phase 6.

The evidence does establish that the existing models can run on MPS with ByteTrack, detector confirmation/cooldown code behaves under controlled inputs, the detector's real HTTP helper can persist incidents through FastAPI/PostgreSQL, and the dashboard can display, filter, paginate, and review those records. The integration records were explicitly synthetic and confined to a disposable database.

**Final local setup caveat:** the root `.env` was edited during verification. It now contains a later duplicate `DATABASE_URL` with the example password, which overrides the earlier assignment and fails PostgreSQL authentication. The agent did not edit or restore this file. The last HTTP read of the running API timed out. Repair of this concurrently edited configuration is pending the user's choice; current local startup is not an all-green result. The same 20 PostgreSQL tests still pass when the running container's working credentials are supplied only in process memory, and all six existing rows remain unchanged.

It is not ready for unattended safety enforcement or public exposure. Missing-PPE recall remains limited; authentication and additional security controls are absent.

## Tests executed

| Check | Execution and outcome | Evidence boundary |
| --- | --- | --- |
| Existing backend baseline | `python -m pytest -q`: 14 passed before changes | Isolated SQLite; no live camera or ML inference |
| Expanded backend/detector suite | `python -m pytest -q`: 20 passed | In-memory SQLite plus controlled detector inputs; no production writes |
| PostgreSQL regression | `python scripts/verify_postgres.py`: 20 passed | Newly created disposable database; database session timezone set to Asia/Seoul by the fixture |
| Configured PostgreSQL reads | Health, legacy list, dashboard list, statistics, and analytics returned 200 | Real existing database; TestClient without startup table writes |
| Detector HTTP integration | Eight controlled missing-helmet observations reached the confirmation threshold; `save_event` submitted two synthetic records to a live API on port 8002; an immediate duplicate was suppressed | Real HTTP/FastAPI/PostgreSQL path, not a camera-generated detection |
| Browser review persistence | Changed synthetic incident 1 to Reviewed, observed “Review saved,” and verified Reviewed through the API | Disposable database; existing records never reviewed or modified by these tests |
| Browser filtering/analytics | Correct totals and 50/50 distribution for two records; Reviewed filter returned one; Reviewed + Missing vest returned zero | Actual React app and API, synthetic isolated records |
| Browser pagination/sorting | Expanded only the disposable database to 13 synthetic records; verified pages of 10 and 3; oldest-first reset to page 1 and began with incident 1 | Tests frontend controls and server integration, not real-world event volume |
| Browser loading/empty/refresh | Observed initial loading, zero statistics, empty charts/history, successful refresh, and updated records | Real frontend against disposable API |
| Browser interruption | Stopped the disposable API and observed “Connection interrupted” plus an explicit stale-snapshot message | Expected Vite proxy 500 during the deliberate outage; no real PostgreSQL service was stopped |
| Responsive/browser errors | Desktop, tablet (818 CSS px), small mobile (354 CSS px), no document-level horizontal overflow; no console warnings/errors before intentional outage | Browser viewport overrides were reset after testing |
| Frontend checks | `npm run typecheck` and `npm run build` passed | TypeScript compilation and Vite production bundle, not deployment |
| Model validation | Fresh CPU evaluation at 416 and 320 pixels completed on 200 images / 2,961 objects | Existing validation split, all 12 classes, no retraining |
| Actual MPS/ByteTrack smoke | Two local validation images processed by the general tracking model and custom PPE model using runtime parameters | Real inference/tracking; not a video identity-continuity benchmark |
| Physical camera probe | OpenCV reported “not authorized” (status 0), requested permission, then failed initialization; `camera_opened=false`, `frame_read=false` | **Blocked** by macOS authorization; no images/video saved or transmitted |
| Final edited-config preflight | Failed with a clear exit code 2; no test database created | Current `.env` credentials differ from the initialized container; not a failing application assertion |
| Working-credential recheck | 20 PostgreSQL tests passed again; six rows unchanged | Existing container credentials held only in process memory; edited `.env` left intact |
| ML environment dependencies | `python -m pip check`: no broken requirements found | Existing working ML environment, no dependency replacement |
| Repository checks | Python syntax and local documentation links passed; `git diff --check`, protected-file fingerprints, ignore rules, targeted candidate-file secret/large-file scan | Current files only; not a complete security audit or Git-history purge |

The regression suite emitted a Starlette/httpx TestClient deprecation warning; all assertions passed. A later configured-credential preflight failed and is explicitly recorded above. No test failure was hidden or relabeled as a success.

### Detector behavior covered

The six new detector tests cover safe import without camera/model initialization; head/torso association; eight-observation confirmation with unknown-frame tolerance and compliant-PPE priority; per-track/per-type cooldown and its expiry; failed API submissions leaving cooldown available; and the actual inference loop under controlled inputs, including a single latched alert, expected tracking parameters, stale worker expiry, and capture/window cleanup. Controlled boxes/frames are unit fixtures, not fabricated accuracy or camera results.

## Actual model evaluation

The checkpoint `models/best.pt` retains training metrics and ten epoch rows. Original standalone CSV/plot artifacts were not located in the project or searched user locations. The local Construction-PPE dataset was available at `/opt/homebrew/datasets/construction-ppe`.

Evaluation used Python 3.11.18, Ultralytics 8.4.204, PyTorch 2.15.0, CPU, batch 2, workers 0, and the same 200-image validation split. Values below are on a 0–1 scale and are rounded; full precision, checkpoint/dataset fingerprints, and all 12 per-class results are in the JSON artifacts.

| Protocol | Precision | Recall | mAP50 | mAP50–95 |
| --- | ---: | ---: | ---: | ---: |
| Saved checkpoint | 0.783480 | 0.515120 | 0.569230 | 0.369690 |
| Fresh validation, 416 px | 0.784590 | 0.515109 | 0.568909 | 0.369979 |
| Fresh validation, runtime 320 px | 0.744758 | 0.447814 | 0.492896 | 0.305100 |

The aggregate includes all 12 classes, not only the application's four PPE classes. Runtime-resolution per-class results:

| Class | Objects | Precision | Recall | mAP50 | mAP50–95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| helmet | 294 | 0.904775 | 0.564626 | 0.610446 | 0.425218 |
| vest | 340 | 0.820166 | 0.629412 | 0.700033 | 0.497822 |
| no_helmet | 179 | 0.715288 | 0.350893 | 0.390648 | 0.231672 |
| no_vest | 130 | 0.795818 | 0.469231 | 0.507057 | 0.321220 |

The saved configuration is a ten-epoch, 416-pixel, batch-2 MPS run. Saved metrics match history row 9, whose mAP50–95 is slightly higher than row 10; the exported checkpoint's own epoch field is stripped (`-1`). No active epoch value was invented.

The model still misses many missing-PPE objects, especially at 320 pixels. Ten epochs and one validation split do not establish convergence, calibration, domain generalization, or performance under workplace lighting/occlusion. Validator precision/recall uses its evaluation protocol and does not directly equal application precision/recall at PPE confidence 0.20. No end-to-end incident accuracy, field benchmark, tracking score, or end-to-end FPS was measured.

The real MPS smoke check produced one tracked person and nine PPE boxes on the first local image, and zero tracked people and six PPE boxes on the second. These counts only establish successful execution, not correctness of each predicted box.

See [model evaluation](model-evaluation.md), [416-pixel raw results](model-evaluation.json), and [320-pixel raw results](model-evaluation-320.json).

## Bugs fixed and cleanup

- **Import side effects:** moved model/camera initialization and the existing loop behind `run()` and a main guard. Previously importing the detector immediately loaded models and attempted to open the webcam; it is now safe to import the submission/state helpers for tests and an isolated demo.
- **Capture lifecycle:** release a failed camera handle before raising the existing initialization error. Successful runs retain the existing `finally` cleanup.
- **Unused CSV remnants:** removed unused `csv`, `datetime`, `Path`, and `LOG_FILE` declarations. Current incident logging is HTTP/PostgreSQL, not CSV.
- **Undeclared tracking dependency:** declared `lap>=0.5.12,<1` in ML requirements. The installed ByteTrack matching code imports lap and otherwise attempts a runtime installation; lap 0.5.14 was already present in the tested ML environment.
- **Ignored but tracked incident log:** removed `events.csv` from Git tracking while preserving its local contents. Ignore rules alone did not protect the already tracked file. Its removal from tracking is intentionally staged; nothing was committed. Prior history was not rewritten.
- **Evaluation script syntax:** final syntax checks caught and removed a stray character before the `validation_label_files` dictionary key. The model evaluator now parses again; metrics were produced by the successfully executed evaluator before this later file edit.
- **Verification diagnostics:** the PostgreSQL helper now reports a failed connection preflight without a raw traceback or credential output and exits before creating a test database.
- **Small frontend cleanup:** removed a duplicate ChevronRight alias and replaced the stale “Phase 05” sidebar label with “Local MVP.” No new pages or dashboard behavior were added.
- **Test cleanup:** eliminated the duplicated test environment setup; `tests/conftest.py` remains responsible for choosing the default isolated URL before imports.
- **Safe demo configuration:** the detector's existing incident URL now accepts `SAFETRUCK_API_URL`, retaining its default. This allows integration checks without writing synthetic records into the real database.

No tracking thresholds, PPE association rules, model weights, training pipeline, MPS selection, database schema, or existing API contracts were rewritten.

## Data preservation and deployment preparation

The configured database contained **six incident rows** at the Phase 6 preservation check. SHA-256 over ordered IDs, tracking IDs, violations, timestamps, and statuses was identical before and after the PostgreSQL regression and browser-demo sessions. The demo's 13 synthetic records were in a newly created temporary database; that entire temporary database was removed at shutdown. No existing incident was overwritten, deleted, or updated by these checks.

Protected content checks passed for `models/best.pt`, `yolo26n.pt`, `train.py`, `custom_tracker.yaml`, `compose.yaml`, `backend/database.py`, and the retained local `events.csv`.

The root `.env` fingerprint changed during the session without an agent edit; it was preserved pending clarification. `frontend/.env.example` was also edited outside the agent's changes and was left as found. Neither file was restored over the newer content.

Ignore rules cover environment secrets, databases, build/dependency output, datasets, recordings/captures/evidence directories, video formats, and exported model weights. A targeted scan of current candidate source files found no matching secret patterns or files over 5 MB. This is not a guarantee about every possible secret or past Git history. Generated UI documentation screenshots are intentional small portfolio assets; no camera evidence capture was implemented.

No deployment was performed. Before exposing incident data publicly, add authentication, authorization, TLS, explicit origin/proxy configuration, request limits, appropriate retention/backups, and operational monitoring. The Vite development proxy is not a production hosting setup. API connection status does not prove camera health.

## Commands

For a new environment, install dependencies and configure `.env` as described in the root README. Preserve an existing environment, credentials, and Docker volume.

```bash
# Terminal 1, repository root / working Python environment
docker compose up -d postgres
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2
cd frontend
npm ci
npm run dev

# Terminal 3, repository root / ML environment with camera authorization
python main.py
```

Validation:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
python scripts/verify_postgres.py
npm --prefix frontend run typecheck
npm --prefix frontend run build
python scripts/evaluate_model.py --dataset /path/to/construction-ppe --imgsz 416 --output docs/model-evaluation.json
python scripts/evaluate_model.py --dataset /path/to/construction-ppe --imgsz 320 --output docs/model-evaluation-320.json
```

For synthetic incident demonstrations use `python scripts/verify_postgres.py --serve --port 8002`, an alternate frontend on port 5174, and the explicitly isolated helper command in the [demo guide](demo-guide.md). Do not send synthetic test records to the default incident database.

Test packages were installed in the existing temporary test environment `/tmp/safetruck-phase5-venv`; the working conda ML environment was used for inference/validation without dependency replacement. The pre-existing API (8000), frontend (5173), and PostgreSQL processes were not stopped; the API's final HTTP read timed out after the configuration change, so their presence is not a final health claim. Only agent-owned QA services/tabs were stopped. A temporary PostgreSQL role/database creation privilege is needed for the optional regression/demo helper.

## Remaining limits and manual acceptance

1. Resolve the concurrently edited root `.env`: keep one working `DATABASE_URL` matching the initialized database, remove the later placeholder override, and restart the API from its terminal. Do not rotate database roles or remove volumes to fix this mismatch. The user's choice to repair or retain the edited settings was requested and remains pending.
2. Grant camera permission to the Python/terminal host and repeat the physical webcam sequence in the demo guide. Confirm a real frame, temporary tracks, a model-produced potential incident, and dashboard arrival. This remains unverified, not a claimed success.
3. Low missing-PPE recall, potential false detections, and ambiguous region associations require human assessment. No workplace validation or safety benefit claim is supported.
4. Tracking IDs can change after re-entry or occlusion. There is no permanent identity or camera metadata.
5. Synchronous incident HTTP requests can delay inference during outages; cooldown/history state is process-local, with no durable offline queue or cross-process deduplication.
6. Reviews have no identity attribution or audit trail; concurrent updates are last-write-wins. Offset pagination may shift while new incidents arrive.
7. No recording, streaming, automatic evidence screenshots, new dashboard pages, complex authentication, or infrastructure rewrite was introduced.

## Portfolio deliverables

- [Professional README](../README.md): problem, technologies, architecture, actual features, setup, measured model results, and deployment boundary.
- [Demo guide](demo-guide.md): real webcam instructions plus a separate, explicitly synthetic database/dashboard demonstration.
- [Portfolio/resume copy](portfolio.md): concise description and five implementation-backed engineering achievements.
- [Actual dashboard](assets/dashboard.png) and [incident history](assets/incident-history.png) screenshots from existing records.
- [Review screenshot](assets/review-demo.png) clearly labeled as synthetic/disposable in the demo guide.
- [Machine-readable test evidence](validation-evidence.json) and both model metric artifacts.

**Readiness conclusion:** suitable for a portfolio presentation as a local MVP with reproducible tests and honest evaluation. The final local configuration preflight is failing, and physical-camera acceptance remains blocked by permissions; field reliability and public deployment readiness are not established. No commits or pushes were made.
