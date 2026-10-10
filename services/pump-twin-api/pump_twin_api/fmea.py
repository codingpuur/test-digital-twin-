"""Failure modes ("what would it look like"): the twin runs every mode of the FMEA workbook on today's reading.

That is a few dozen twin runs, so it is done once per reading, in the background, and the screen asks
until it is ready. The twin is held for the duration, so a what-if waits meanwhile.
"""

from __future__ import annotations

import threading
from typing import Any

from .runtime import Runtime

WORKBOOK = "Failure_Modes_1.xlsx"


def _compute(rt: Runtime, pump: int, stamp: str) -> None:
    entry: dict[str, Any] = {"stamp": stamp}
    try:
        p3 = rt.p3
        with rt.lock:
            base, rows = p3.simulate_failure_modes(rt.twins[pump], rt.raw[pump], str(rt.settings.twin_dir / WORKBOOK))
        fm = p3.fm_dashboard(base, rows)
        fm["insights"] = p3.insights_for("fm", fmea=fm)
        entry.update(state="ready", fm=fm)
    except Exception as exc:  # the workbook is the user's file: report, do not crash the service
        entry.update(state="error", error=f"{type(exc).__name__}: {exc}")
    rt.fmea[pump] = entry


def get(rt: Runtime, pump: int) -> dict:
    if not (rt.settings.twin_dir / WORKBOOK).exists():
        return {"pump": pump, "state": "unavailable", "error": f"{WORKBOOK} is not in the twin folder"}
    stamp = str(rt.raw[pump].get("timestamp"))
    entry = rt.fmea.get(pump)
    if entry is None or entry["stamp"] != stamp:
        if pump in rt.fmea_running:
            return {"pump": pump, "state": "computing", "stale": entry.get("fm") if entry else None}
        rt.fmea_running.add(pump)

        def work() -> None:
            try:
                _compute(rt, pump, stamp)
            finally:
                rt.fmea_running.discard(pump)

        threading.Thread(target=work, daemon=True).start()
        return {"pump": pump, "state": "computing", "stale": entry.get("fm") if entry else None}
    return {"pump": pump, "timestamp": stamp, **{k: v for k, v in entry.items() if k != "stamp"}}
