"""Failure modes ("what would it look like"): the twin runs every mode of the FMEA workbook on today's reading.

That is a few dozen twin runs, so it is done once per reading, in the background, and the screen asks
until it is ready. The twin is held for the duration, so a what-if waits meanwhile.
"""

from __future__ import annotations

import threading
import time
from typing import Any

from .runtime import Runtime

WORKBOOK = "Failure_Modes_1.xlsx"


def _compute(rt: Runtime, pump: int, stamp: str) -> None:
    entry: dict[str, Any] = {"at": time.time(), "timestamp": stamp}
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
    """The newest result. An older one is served while a fresh one is computed (`refreshing`)."""
    if not (rt.settings.twin_dir / WORKBOOK).exists():
        return {"pump": pump, "state": "unavailable", "error": f"{WORKBOOK} is not in the twin folder"}
    entry = rt.fmea.get(pump)
    is_fresh = entry is not None and time.time() - entry["at"] < rt.settings.fmea_ttl_s
    if not is_fresh and pump not in rt.fmea_running:
        rt.fmea_running.add(pump)
        stamp = str(rt.raw[pump].get("timestamp"))

        def work() -> None:
            try:
                _compute(rt, pump, stamp)
            finally:
                rt.fmea_running.discard(pump)

        threading.Thread(target=work, daemon=True).start()
    if entry is None:
        return {"pump": pump, "state": "computing"}
    return {"pump": pump, "refreshing": not is_fresh, **{k: v for k, v in entry.items() if k != "at"}}
