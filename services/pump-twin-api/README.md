# Pump twin API

A FastAPI service around the BWSSB pump twin (`pump_3d_twin.py` and `pump_twin_bwssb.py`). It imports
those files unchanged. **All business logic and all telemetry come from here**; the platform's screens
only draw what they are given.

The twin's own files, data and caches are not in this repository: point `PUMP_TWIN_DIR` at the folder
that holds them.

## Run

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt            # gmsh needs libglu1-mesa and libxrender1 on Linux
export PUMP_TWIN_DIR=/path/to/folder/with/the/twin/files
uvicorn pump_twin_api.main:app --port 8100
python smoke.py http://127.0.0.1:8100       # waits for the twin, then checks every endpoint against it
pip install -r requirements-dev.txt && pytest   # fast unit tests, no twin needed
```

The twin takes about 100 s to build at start. `GET /health` shows `building`, then `ready`.

## What it owns

| Area | Owned here (not in the screens) |
| ---- | ------------------------------- |
| Pump what-if | Solving, health, findings, curves, and the **view**: component status, KPI deltas (better or worse), alarms, the worst component and the part to focus on |
| Rules | KPI catalog (label, unit, decimals, higher or lower is better), health bands (70/35), status labels, which CAD part belongs to which component |
| Telemetry | Live readings, history, the alarm limit and **status of every channel**, units (power in kW) |
| Station simulation | The wet-well and eight-pump model with lead/lag control (ported from the browser) |
| 3-D model | The parts and their geometry |

## Settings (environment)

| Variable               | Default                    | Meaning                                                                  |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------ |
| `PUMP_TWIN_DIR`        | `./twin`                   | Folder with the twin files, the STEP model, the Excel files and config    |
| `PUMPTWIN_SOURCE`      | `demo`                     | `demo` (synthetic readings), `api` (iPumpNet) or `csv` (Stage-4 export)  |
| `PUMPTWIN_STATION`     | `Tataguni`                 | Station name                                                             |
| `PUMPTWIN_DB`          | `data/telemetry.sqlite3`   | Telemetry store (SQLite). Use `:memory:` for tests                        |
| `PUMPTWIN_POLL_S`      | `30`                       | How often the source is read into the store                              |
| `PUMPTWIN_BACKFILL_H`  | `6`                        | Hours of history made (demo) or fetched (api, csv) at start-up           |
| `PUMPTWIN_API_KEY`     | empty                      | When set, every `/v1` call needs the header `x-api-key`                   |
| `PUMPTWIN_CORS`        | empty                      | Comma-separated origins that may call the API from a browser             |
| `IPUMPNET_EMAIL` etc.  |                            | iPumpNet login for `api`, see the twin's `INTEGRATION.md`. Never commit  |

`demo` readings are made up (each pump near its best-efficiency point, drifting a little). They show the
screens and the numbers move correctly, but they say nothing about a real pump. The `api` and `csv`
sources, including their history back-fill, are written against the twin's own feeds and have **not been
run** without a login or a CSV.

## Endpoints

All under `/v1` except `/health`. Errors that the user can fix answer `422 {"error", "field"}`.

| Call | Returns |
| ---- | ------- |
| `GET /health` | State of the twin, readings stored, poll errors (no key needed) |
| `GET /v1/meta` | Inputs, faults, KPI catalog, health bands, status labels, components |
| `GET /v1/pumps` | One summary line per pump (poll this) |
| `GET /v1/pumps/{n}/whatif/defaults` and `/whatif/range` | Current values and the reachable ranges |
| `POST /v1/pumps/{n}/whatif` | `scenario` and `baseline` (about 50 KB), and `view` for the screen |
| `GET /v1/telemetry/channels` | Every signal with label, unit, group and alarm limit |
| `GET /v1/pumps/{n}/telemetry/latest` | The newest reading, each channel with its `status` and `limit` |
| `GET /v1/pumps/{n}/telemetry/history?channel=&from=&to=&step_s=` | Series per channel (never more than 2000 points) |
| `POST /v1/pumps/{n}/telemetry` | Push a reading `{ts, values}`; it also becomes the what-if start |
| `GET /v1/model/parts` and `/v1/model/mesh` | Parts with their component; geometry (cached by ETag) |
| `GET /v1/station/simulation/meta` | Scenarios, limits, lead/lag levels |
| `POST /v1/station/simulation/run` | A scenario run as a time series with events and alarms |

`POST .../whatif` body: `{"mode": "consistent", "driver": "head_m", "vfd": false, "over": {"head_m": 120}, "faults": {"impeller_wear": 0.4}}`.

## Layout

| Module | Role |
| ------ | ---- |
| `main.py` | `create_app()`: settings, runtime, routers |
| `config.py` | `Settings`, read from the environment |
| `runtime.py` | Builds the twin in a background thread; holds readings, the store, the poller |
| `scenario.py` | What-if logic (validate, solve, slim the reply). Knows the twin, not HTTP |
| `catalog.py`, `enrich.py` | The business rules, and the view built from a scenario |
| `station_sim.py` | The station model |
| `telemetry/` | `channels` (limits, status), `store` (SQLite), `rows` (parsing), `demo` (synthetic source) |
| `model_parts.py` | Parts and geometry |
| `demo_feed.py`, `schemas.py`, `deps.py`, `serialize.py` | Start readings, request models, auth and lookups, safe JSON |
| `routes/` | `health`, `meta`, `pumps`, `whatif`, `telemetry`, `station`, `model` |
| `tests/` | Unit tests with a fake twin; `smoke.py` checks a running service |

## Moving the store to Postgres or Timescale

`telemetry/store.py` has five methods (`append`, `append_many`, `latest`, `history`, `span`). A Postgres
version with the same methods can replace it in `Runtime.__init__`; nothing else changes.
