"""FastAPI service around the BWSSB pump twin (pump_3d_twin.py + pump_twin_bwssb.py).

The twin files are imported unchanged from PUMP_TWIN_DIR; this service only adds a clean JSON API
for the what-if simulation (the 3-D layers are left out, so a reply is about 50 KB instead of 1.3 MB).
"""

from __future__ import annotations

import hmac
import importlib
import os
import sys
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

TWIN_DIR = Path(os.environ.get("PUMP_TWIN_DIR", Path(__file__).parent / "twin")).resolve()
STATION = os.environ.get("PUMPTWIN_STATION", "Tataguni")
SOURCE = os.environ.get("PUMPTWIN_SOURCE", "demo")  # demo | api | csv
SUMMARY_TTL_S = float(os.environ.get("PUMPTWIN_SUMMARY_TTL_S", "30"))
API_KEY = os.environ.get("PUMPTWIN_API_KEY", "")
CORS_ORIGINS = [o.strip() for o in os.environ.get("PUMPTWIN_CORS", "").split(",") if o.strip()]

# The twin installs missing packages on import unless told not to; a service must not do that.
os.environ.setdefault("PUMP_TWIN_AUTOINSTALL", "0")

# Parts of the scenario the what-if screen needs. The 3-D layers are the large part and are skipped.
SCENARIO_KEYS = (
    "label", "faults", "kpi", "an", "health_detail", "health_index", "cards", "insights",
    "dots", "markers", "charts", "implausible",
)

# Demo pumps run near the best-efficiency point, each a little different.
DEMO_FLOW_FRACTION = {1: 0.95, 2: 1.0, 3: 1.02, 4: 0.9, 5: 1.05, 6: 0.98, 7: 1.0, 8: 0.93}


class Twin:
    """Everything the service holds after start-up. Filled by a background thread."""

    def __init__(self) -> None:
        self.state = "starting"  # starting | building | ready | error
        self.error: str | None = None
        self.p3: Any = None
        self.ptb: Any = None
        self.feed: Any = None
        self.twins: dict[int, Any] = {}
        self.raw: dict[int, dict] = {}
        self.pinned: set[int] = set()
        self.raw_at: dict[int, float] = {}
        self.summary: dict[int, tuple[float, dict]] = {}
        self.baseline: dict[int, tuple[int, dict]] = {}
        self.built_s = 0.0
        # The twin mutates shared state while processing (e.g. ambient temperature), as its own
        # server does under a lock, so one scenario runs at a time.
        self.lock = threading.RLock()


TW = Twin()


def _demo_rows(p3: Any, base: Any, pumps: list[int]) -> dict[int, dict]:
    """Synthetic readings at the OEM best-efficiency point: for trying the service without data."""
    ptb = TW.ptb
    spec = ptb.SPECS[STATION]
    q_bep, h_bep, eta = base.curve.Q_bep_m3h, base.curve.H_bep_m, base.curve.eta_bep
    temp, p_suction, volts = 26.0, 1.2, 6600.0
    rho = float(ptb.water_density(temp))
    _, ids = ptb.pipe_area(spec["suction_od_mm"], spec["wall_mm"])
    _, idd = ptb.pipe_area(spec["discharge_od_mm"], spec["wall_mm"])
    dz = (spec["z_discharge_mm"] - spec["z_suction_mm"]) / 1000.0

    lo, hi = 1.0, 40.0
    for _ in range(60):  # discharge pressure that gives the target head under the twin's own formula
        mid = (lo + hi) / 2
        head = float(
            ptb.total_dynamic_head(
                p_suction * 1e5, mid * 1e5, q_bep / 3600, rho, ids, idd, dz,
                spec.get("k_friction_suction", 0.0), spec.get("k_friction_discharge", 0.0),
            )
        )
        lo, hi = (mid, hi) if head < h_bep else (lo, mid)

    p_el = rho * 9.80665 * (q_bep / 3600) * h_bep / eta / 0.96
    amps = p_el / (3**0.5 * volts * 0.88)
    row: dict[str, Any] = dict(
        timestamp=time.strftime("%Y-%m-%d %H:%M:%S"), suction_pressure=p_suction,
        discharge_pressure=round(mid, 3), suction_temperature=temp, discharge_temperature=temp + 0.4,
        flow_rate=q_bep / 3.6, voltage_r=volts, voltage_y=volts + 10, voltage_b=volts - 10,
        frequency=50.0, motor_rpm=float(spec["rpm"]), power=p_el, current_r=amps,
        current_y=amps * 1.005, current_b=amps * 0.995, power_factor_r=0.88, power_factor_y=0.88,
        power_factor_b=0.88, pump_de_vibration=1.8, pump_nde_vibration=1.6, motor_de_vibration=1.1,
        motor_nde_vibration=1.0, pump_de_bearing_temperature=58.0, pump_nde_bearing_temperature=55.0,
        motor_de_bearing_temperature=62.0, motor_nde_bearing_temperature=60.0,
        pump_bde_oil_temperature=52.0, pump_nbde_oil_temperature=50.0,
    )
    for pole in (11, 12, 21, 22, 31, 32):
        row[f"motor_winding_temp_pole_{pole}"] = 86.0 + (pole % 5)

    rows = {}
    for pump in pumps:
        flow = q_bep * DEMO_FLOW_FRACTION.get(pump, 1.0)
        shifted, _, _ = p3.whatif_row(base, row, {"flow_m3h": flow}, "consistent", "flow_m3h")
        rows[pump] = shifted
    return rows


def _build() -> None:
    try:
        TW.state = "building"
        started = time.time()
        if not TWIN_DIR.is_dir():
            raise RuntimeError(f"PUMP_TWIN_DIR {TWIN_DIR} not found")
        sys.path.insert(0, str(TWIN_DIR))
        TW.p3 = p3 = importlib.import_module("pump_3d_twin")
        TW.ptb = ptb = importlib.import_module("pump_twin_bwssb")
        count = int(ptb.SYSTEM_CURVES.get(STATION, {}).get("pumps_installed", 8))
        pumps = list(range(1, count + 1))

        if SOURCE != "demo":
            TW.feed = p3.make_feed(SOURCE, STATION, pumps)
            pumps = [p for p in pumps if p in TW.feed.pumps] or pumps
        step = p3.site_model_step(STATION, p3.HERE, rebuild=False) or str(TWIN_DIR / "assembly.step")
        base = p3.Pump3DTwin(step, STATION, pumps[0], settings={})
        TW.twins = {p: base if p == base.pump else p3.twin_for_pump(base, p) for p in pumps}

        if SOURCE == "demo":
            TW.raw = _demo_rows(p3, base, pumps)
        else:
            for pump in pumps:
                TW.raw[pump] = TW.feed.latest_row(pump)
        now = time.time()
        TW.raw_at = {p: now for p in TW.raw}
        TW.built_s = round(time.time() - started, 1)
        TW.state = "ready"
    except Exception as exc:  # reported by /health instead of crashing the process
        TW.state = "error"
        TW.error = f"{type(exc).__name__}: {exc}"


@asynccontextmanager
async def lifespan(_: FastAPI):
    threading.Thread(target=_build, name="twin-build", daemon=True).start()
    yield


app = FastAPI(title="Pump twin API", version="1.0.0", lifespan=lifespan)
if CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET", "POST", "PUT"],
        allow_headers=["content-type", "x-api-key"],
    )


def require_key(x_api_key: str | None = Header(default=None)) -> None:
    if API_KEY and not hmac.compare_digest(x_api_key or "", API_KEY):
        raise HTTPException(status_code=401, detail="Invalid API key")


def require_ready() -> None:
    if TW.state != "ready":
        raise HTTPException(status_code=503, detail=f"Twin is {TW.state}" + (f": {TW.error}" if TW.error else ""))


def get_pump(pump: int) -> int:
    require_ready()
    if pump not in TW.twins:
        raise HTTPException(status_code=404, detail=f"Pump {pump} not found; have {sorted(TW.twins)}")
    return pump


def json_response(payload: Any, status: int = 200) -> Response:
    # The twin ships a strict encoder that handles numpy values and NaN/inf.
    return Response(TW.p3.json_strict(payload), status_code=status, media_type="application/json")


def _refresh(pump: int, force: bool = False) -> None:
    """Re-reads the live row from the source (never for a demo or a pinned reading)."""
    if SOURCE == "demo" or pump in TW.pinned or TW.feed is None:
        return
    if force or time.time() - TW.raw_at.get(pump, 0) > SUMMARY_TTL_S:
        row = TW.feed.latest_row(pump, force=True) if getattr(TW.feed, "kind", "") == "api" else TW.feed.latest_row(pump, "last")
        TW.raw[pump], TW.raw_at[pump] = row, time.time()


def _slim(run: Any) -> dict:
    shared: dict = {}
    pay = TW.p3.scenario_payload(TW.twins[run.st.pump], run, shared)
    out = {k: pay[k] for k in SCENARIO_KEYS if k in pay}
    # health_of turns the twin's "0 = normal" score into "1 = normal .. 0 = at limit".
    out["health"] = {k: round(TW.p3.health_of(v), 3) for k, v in run.health.items()}
    return out


class WhatIfRequest(BaseModel):
    mode: Literal["consistent", "raw"] = "consistent"
    driver: Literal["head_m", "flow_m3h", "power_kw"] = "head_m"
    vfd: bool = False
    over: dict[str, float | None] = Field(default_factory=dict)
    faults: dict[str, float] = Field(default_factory=dict)


# --- routes -------------------------------------------------------------------------------------


@app.get("/health")
def health() -> dict:
    return {
        "state": TW.state, "error": TW.error, "station": STATION, "source": SOURCE,
        "pumps": sorted(TW.twins), "built_s": TW.built_s, "twin_dir": str(TWIN_DIR),
    }


@app.get("/v1/meta", dependencies=[Depends(require_key), Depends(require_ready)])
def meta() -> Response:
    p3 = TW.p3
    return json_response({
        "station": STATION, "source": SOURCE, "pumps": sorted(TW.twins),
        "fields": p3.WHATIF_FIELDS,
        "faults": [dict(key=k, label=label, max=mx, step=st) for k, label, mx, st in p3.WHATIF_FAULTS],
        "drivers": ["head_m", "flow_m3h", "power_kw"],
    })


@app.get("/v1/pumps", dependencies=[Depends(require_key), Depends(require_ready)])
def pumps() -> Response:
    out = []
    with TW.lock:
        for pump in sorted(TW.twins):
            cached = TW.summary.get(pump)
            if cached and time.time() - cached[0] < SUMMARY_TTL_S:
                out.append(cached[1])
                continue
            _refresh(pump)
            run = TW.twins[pump].process(TW.raw[pump], {})
            pay = _slim(run)
            item = {
                "pump": pump, "timestamp": run.kpi.get("timestamp"), "usable": run.kpi.get("usable"),
                **{k: run.kpi.get(k) for k in ("flow_m3h", "head_m", "power_kw", "pump_eff_pct", "region")},
                "health_index": pay.get("health_index"),
            }
            TW.summary[pump] = (time.time(), item)
            out.append(item)
    return json_response({"pumps": out})


@app.put("/v1/pumps/{pump}/reading", dependencies=[Depends(require_key)])
def set_reading(pump: int, row: dict[str, Any]) -> dict:
    """Pins a reading (iPumpNet CSV field names) as the pump's current state, e.g. from our platform."""
    get_pump(pump)
    with TW.lock:
        TW.raw[pump], TW.raw_at[pump] = row, time.time()
        TW.pinned.add(pump)
        TW.summary.pop(pump, None)
        TW.baseline.pop(pump, None)
    return {"pump": pump, "pinned": True}


@app.get("/v1/pumps/{pump}/whatif/defaults", dependencies=[Depends(require_key)])
def whatif_defaults(pump: int = Depends(get_pump)) -> Response:
    p3 = TW.p3
    with TW.lock:
        _refresh(pump)
        raw, twin = TW.raw[pump], TW.twins[pump]
        return json_response({
            "pump": pump, "defaults": p3.whatif_defaults(twin, raw),
            "ranges": p3.whatif_ranges(twin, raw), "limits": p3.whatif_limits(twin),
            "timestamp": raw.get("timestamp"),
        })


@app.get("/v1/pumps/{pump}/whatif/range", dependencies=[Depends(require_key)])
def whatif_range(
    frequency_hz: float | None = None, speed_rpm: float | None = None, vfd: bool = False,
    pump: int = Depends(get_pump),
) -> Response:
    over = {k: v for k, v in (("frequency_hz", frequency_hz), ("speed_rpm", speed_rpm)) if v is not None}
    with TW.lock:
        return json_response(TW.p3.whatif_ranges(TW.twins[pump], TW.raw[pump], over, vfd=vfd))


@app.post("/v1/pumps/{pump}/whatif", dependencies=[Depends(require_key)])
def whatif(body: WhatIfRequest, pump: int = Depends(get_pump)) -> Response:
    p3 = TW.p3
    unknown = [k for k in body.over if k not in {f["k"] for f in p3.WHATIF_FIELDS} | {"ambient_c"}]
    if unknown:
        raise HTTPException(422, detail={"error": f"Unknown input: {', '.join(unknown)}", "field": unknown[0]})
    limits = {k: mx for k, _, mx, _ in p3.WHATIF_FAULTS}
    for key, value in body.faults.items():
        if key not in limits or not 0 <= value <= limits[key]:
            raise HTTPException(422, detail={"error": f"Fault {key} must be 0 to {limits.get(key)}", "field": key})

    over = {k: v for k, v in body.over.items() if v not in ("", None)}
    faults = {k: float(v) for k, v in body.faults.items() if float(v or 0) != 0}
    twin = TW.twins[pump]
    started = time.time()
    with TW.lock:
        _refresh(pump)
        raw = TW.raw[pump]
        try:
            raw2, notes, solved = p3.whatif_row(twin, raw, over, body.mode, body.driver, vfd=body.vfd)
        except p3.WhatIfError as exc:
            return json_response({"error": str(exc), "field": exc.field, "pump": pump}, status=422)
        ambient = twin.S["ambient_c"]
        if over.get("ambient_c") not in (None, ""):
            twin.S["ambient_c"] = float(over["ambient_c"])
        try:
            run = twin.process(raw2, faults, label="what-if")
        finally:
            twin.S["ambient_c"] = ambient
        pct = run.kpi["pump_eff_pct"]
        if body.mode == "raw" and (pct > 100 * (twin.curve.eta_bep + 0.02) or pct < 20):
            solved["implausible"] = True
        run.implausible = bool(solved.get("implausible"))

        cached = TW.baseline.get(pump)
        if cached is None or cached[0] != id(raw):  # the reading changed: recompute the baseline
            TW.baseline[pump] = cached = (id(raw), _slim(twin.process(raw, {})))
        scenario = _slim(run)
        baseline = cached[1]

    return json_response({
        "pump": pump, "ms": round((time.time() - started) * 1000, 1), "notes": notes, "solved": solved,
        "scenario": scenario,
        "baseline": {k: baseline[k] for k in ("kpi", "cards", "health", "health_index") if k in baseline},
        "reading_timestamp": raw.get("timestamp"),
    })
