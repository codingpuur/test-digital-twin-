"""What-if logic. Knows the twin, not HTTP."""

from __future__ import annotations

import time
from typing import Any

from . import enrich
from .runtime import Runtime
from .schemas import WhatIfRequest

# Parts of a scenario the what-if screen needs. The 3-D layers are the large part and are skipped.
SCENARIO_KEYS = (
    "label", "faults", "kpi", "an", "health_detail", "health_index", "cards", "insights",
    "dots", "markers", "charts", "implausible",
)
BASELINE_KEYS = ("kpi", "cards", "health", "health_index")


class InvalidScenario(ValueError):
    def __init__(self, message: str, field: str | None = None) -> None:
        super().__init__(message)
        self.field = field


def validate(rt: Runtime, body: WhatIfRequest) -> None:
    allowed = {f["k"] for f in rt.p3.WHATIF_FIELDS} | {"ambient_c"}
    unknown = [k for k in body.over if k not in allowed]
    if unknown:
        raise InvalidScenario(f"Unknown input: {', '.join(unknown)}", unknown[0])
    limits = {key: mx for key, _, mx, _ in rt.p3.WHATIF_FAULTS}
    for key, value in body.faults.items():
        if key not in limits or not 0 <= value <= limits[key]:
            raise InvalidScenario(f"Fault {key} must be 0 to {limits.get(key)}", key)


def slim(rt: Runtime, pump: int, run: Any) -> dict:
    shared: dict = {}
    payload = rt.p3.scenario_payload(rt.twins[pump], run, shared)
    out = {k: payload[k] for k in SCENARIO_KEYS if k in payload}
    # health_of turns the twin's "0 = normal" score into "1 = normal .. 0 = at limit".
    out["health"] = {k: round(rt.p3.health_of(v), 3) for k, v in run.health.items()}
    return out


def pump_summaries(rt: Runtime) -> list[dict]:
    out = []
    with rt.lock:
        for pump in sorted(rt.twins):
            cached = rt.summary.get(pump)
            if cached and time.time() - cached[0] < rt.settings.summary_ttl_s:
                out.append(cached[1])
                continue
            run = rt.twins[pump].process(rt.raw[pump], {})
            item = {
                "pump": pump, "timestamp": run.kpi.get("timestamp"), "usable": run.kpi.get("usable"),
                **{k: run.kpi.get(k) for k in ("flow_m3h", "head_m", "power_kw", "pump_eff_pct", "region")},
                "health_index": slim(rt, pump, run).get("health_index"),
            }
            rt.summary[pump] = (time.time(), item)
            out.append(item)
    return out


def defaults(rt: Runtime, pump: int) -> dict:
    p3 = rt.p3
    with rt.lock:
        raw, twin = rt.raw[pump], rt.twins[pump]
        return {
            "pump": pump, "defaults": p3.whatif_defaults(twin, raw), "ranges": p3.whatif_ranges(twin, raw),
            "limits": p3.whatif_limits(twin), "timestamp": raw.get("timestamp"),
        }


def ranges(rt: Runtime, pump: int, over: dict[str, float], vfd: bool) -> dict:
    with rt.lock:
        return rt.p3.whatif_ranges(rt.twins[pump], rt.raw[pump], over, vfd=vfd)


def run_whatif(rt: Runtime, pump: int, body: WhatIfRequest) -> dict:
    """Solves the scenario. Raises InvalidScenario when the target cannot be reached."""
    p3 = rt.p3
    validate(rt, body)
    over = {k: v for k, v in body.over.items() if v not in ("", None)}
    faults = {k: float(v) for k, v in body.faults.items() if float(v or 0) != 0}
    twin = rt.twins[pump]
    started = time.time()
    with rt.lock:
        raw = rt.raw[pump]
        try:
            raw2, notes, solved = p3.whatif_row(twin, raw, over, body.mode, body.driver, vfd=body.vfd)
        except p3.WhatIfError as exc:
            raise InvalidScenario(str(exc), exc.field) from exc
        ambient = twin.S["ambient_c"]
        if over.get("ambient_c") not in (None, ""):
            twin.S["ambient_c"] = float(over["ambient_c"])
        try:
            run = twin.process(raw2, faults, label="what-if")
        finally:
            twin.S["ambient_c"] = ambient
        efficiency = run.kpi["pump_eff_pct"]
        if body.mode == "raw" and (efficiency > 100 * (twin.curve.eta_bep + 0.02) or efficiency < 20):
            solved["implausible"] = True
        run.implausible = bool(solved.get("implausible"))

        cached = rt.baseline.get(pump)
        if cached is None or cached[0] != id(raw):  # the reading changed: recompute the baseline
            rt.baseline[pump] = cached = (id(raw), slim(rt, pump, twin.process(raw, {})))
        scenario = slim(rt, pump, run)
        baseline = cached[1]
    return {
        "pump": pump, "ms": round((time.time() - started) * 1000, 1), "notes": notes, "solved": solved,
        "scenario": scenario, "baseline": {k: baseline[k] for k in BASELINE_KEYS if k in baseline},
        "view": enrich.scenario_view(p3, baseline, scenario),
        "reading_timestamp": raw.get("timestamp"),
    }
