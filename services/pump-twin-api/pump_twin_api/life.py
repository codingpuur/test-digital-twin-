"""Degradation ("life"), the period report and the history time-lapse.

They are built from months of history, so they need a source that has it: iPumpNet (`api`) or the
Stage-4 CSV export (`csv`). The twin's LifeTracker reads that history in the background at start-up
and keeps its state in `life_dir`; until it is ready, `status` says what it is doing.
"""

from __future__ import annotations

import os
import threading
from typing import Any

from .runtime import Runtime

PERIODS = ("day", "week", "month")


def start(rt: Runtime, pumps: list[int]) -> None:
    """Creates the tracker and reads the history behind it. Called once the twins exist."""
    if rt.feed is None:
        return
    p3 = rt.p3
    rt.settings.life_dir.mkdir(parents=True, exist_ok=True)
    rt.life = p3.LifeTracker(next(iter(rt.twins.values())), rt.settings.station, pumps,
                             state_dir=str(rt.settings.life_dir), lock=rt.lock)

    def boot() -> None:
        p3.life_bootstrap(rt.life, rt.feed, pumps, pumps[0], say=lambda *_: None)

    threading.Thread(target=boot, name="life-bootstrap", daemon=True).start()


def unavailable(rt: Runtime, pump: int) -> dict | None:
    if rt.life is None:
        return {"pump": pump, "state": "unavailable",
                "error": "Needs history: start the service with PUMPTWIN_SOURCE=api or csv"}
    return None


def assessment(rt: Runtime, pump: int) -> dict:
    if (reply := unavailable(rt, pump)) is not None:
        return reply
    p3, life = rt.p3, rt.life
    config = os.path.join(p3.HERE, p3.LIFE_CONFIG_FILE)
    key = (len(life.hist.get(pump) or []), os.path.getmtime(config) if os.path.exists(config) else 0,
           life.status.get(pump))
    cached = rt.life_cache.get(pump)
    if cached and cached[0] == key:
        return cached[1]
    try:
        with rt.lock:
            result = life.assess(pump)
            result["insights"] = p3.insights_for("life", life=result)
            used = result.get("life_used") or {}
            if used != (getattr(rt.twins[pump], "life_used", None) or {}):
                rt.twins[pump].life_used = used  # the what-if's runtime health terms count it
    except Exception as exc:
        result = {"pump": pump, "components": [], "status": f"assessment failed: {type(exc).__name__}: {exc}"}
    if not result.get("components"):
        result["status"] = life.status.get(pump)
    reply = {"pump": pump, "state": "ready" if result.get("components") else "preparing", **result}
    rt.life_cache[pump] = (key, reply)
    return reply


def report(rt: Runtime, pump: int, period: str) -> dict:
    if (reply := unavailable(rt, pump)) is not None:
        return reply
    try:
        return {"state": "ready", **rt.life.report(pump, period, assessment(rt, pump))}
    except Exception as exc:
        return {"pump": pump, "state": "error", "error": f"{type(exc).__name__}: {exc}"}


def history(rt: Runtime, pump: int, days: int) -> dict:
    if (reply := unavailable(rt, pump)) is not None:
        return reply
    data: Any = rt.p3.anim_history(rt.life, pump, days)
    if not data:
        return {"pump": pump, "state": "preparing", "status": rt.life.status.get(pump)}
    return {"pump": pump, "state": "ready", **data}
