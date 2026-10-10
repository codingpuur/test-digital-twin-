# Pump twin API

A FastAPI service around the BWSSB pump twin (`pump_3d_twin.py` and `pump_twin_bwssb.py`). It imports
those files unchanged and exposes the **what-if simulation** as JSON. The twin's own files, data and
caches are not in this repository: point `PUMP_TWIN_DIR` at the folder that holds them.

## Run

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt            # gmsh needs libglu1-mesa and libxrender1 on Linux
export PUMP_TWIN_DIR=/path/to/folder/with/the/twin/files
uvicorn pump_twin_api.main:app --port 8100
python smoke.py http://127.0.0.1:8100       # waits for the twin, then checks the endpoints against it
pip install -r requirements-dev.txt && pytest   # fast unit tests, no twin needed
```

The twin takes about 100 s to build at start. `GET /health` shows `building`, then `ready`.

## Layout

| Module                  | Role                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| `main.py`               | `create_app()`: wires settings, the runtime and the routers                   |
| `config.py`             | `Settings`, read from the environment                                         |
| `runtime.py`            | Builds the twin in a background thread; holds readings, caches and the lock   |
| `demo_feed.py`          | Synthetic readings for the `demo` source                                      |
| `scenario.py`           | What-if logic (validate, solve, slim the reply). Knows the twin, not HTTP     |
| `schemas.py`            | Request models                                                                |
| `deps.py`               | API key check, ready check, pump lookup, JSON response                        |
| `serialize.py`          | numpy and NaN safe JSON                                                       |
| `routes/`               | `health`, `meta`, `pumps`, `whatif`                                           |
| `tests/`                | Unit tests with a fake twin; `smoke.py` checks a running service              |

## Settings (environment)

| Variable               | Default    | Meaning                                                                        |
| ---------------------- | ---------- | ------------------------------------------------------------------------------ |
| `PUMP_TWIN_DIR`        | `./twin`   | Folder with the twin files, the STEP model, the Excel files and the config      |
| `PUMPTWIN_SOURCE`      | `demo`     | `demo` (synthetic readings), `api` (iPumpNet) or `csv` (Stage-4 export)        |
| `PUMPTWIN_STATION`     | `Tataguni` | Station name                                                                   |
| `PUMPTWIN_API_KEY`     | empty      | When set, every `/v1` call needs the header `x-api-key`                         |
| `PUMPTWIN_CORS`        | empty      | Comma-separated origins that may call the API from a browser                   |
| `IPUMPNET_EMAIL` etc.  |            | iPumpNet login for `api`, see the twin's `INTEGRATION.md`. Never commit these  |

`demo` readings are made up (each pump near its best-efficiency point). They show the screen and the
numbers move correctly, but they say nothing about a real pump. Use `api` or `csv` for real values.

## Endpoints

| Call                                         | Returns                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `GET /health`                                | State of the twin (no key needed)                                         |
| `GET /v1/meta`                               | Input fields, fault list and limits for building the form                 |
| `GET /v1/pumps`                              | One summary line per pump                                                 |
| `GET /v1/pumps/{n}/whatif/defaults`          | Current values and the reachable ranges                                   |
| `GET /v1/pumps/{n}/whatif/range`             | Ranges after a frequency or speed change (`?frequency_hz=` `?speed_rpm=&vfd=true`) |
| `POST /v1/pumps/{n}/whatif`                  | The scenario (about 50 KB: KPIs, health, cards, insights, charts) and the baseline |
| `PUT /v1/pumps/{n}/reading`                  | Pins a reading (iPumpNet field names) as the pump's current state          |

`POST` body: `{"mode": "consistent", "driver": "head_m", "vfd": false, "over": {"head_m": 120}, "faults": {"impeller_wear": 0.4}}`.
A target that cannot be reached answers `422 {"error": "...", "field": "..."}`.

`health` in a scenario is `1 = normal ... 0 = at limit` per component; `health_index` is 0 to 100.
