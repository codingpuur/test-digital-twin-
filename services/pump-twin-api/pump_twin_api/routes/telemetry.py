from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel

from ..deps import get_pump, get_runtime, json_response, require_key, require_ready
from ..runtime import Runtime
from ..telemetry import channels
from ..telemetry.rows import parse_ts, row_values

router = APIRouter(prefix="/v1", dependencies=[Depends(require_key)])
MAX_POINTS = 2000


class TelemetryIn(BaseModel):
    ts: str | float | None = None  # ISO time or epoch seconds; now when left out
    values: dict[str, Any]  # channel (iPumpNet / CSV field name) -> number


def limits_of(rt: Runtime) -> dict[str, float]:
    return dict(getattr(rt.p3, "HEALTH_LIMITS", {}))


@router.get("/telemetry/channels", dependencies=[Depends(require_ready)])
def channel_catalog(rt: Runtime = Depends(get_runtime)) -> Response:
    return json_response({"channels": channels.catalog(limits_of(rt))})


@router.get("/pumps/{pump}/telemetry/latest")
def latest(pump: int = Depends(get_pump), rt: Runtime = Depends(get_runtime)) -> Response:
    found = rt.store.latest(pump)
    if found is None:
        raise HTTPException(404, detail=f"No readings for pump {pump} yet")
    ts, values = found
    limits = limits_of(rt)
    readings = []
    for key, stored in values.items():
        ch = channels.CHANNEL_BY_KEY.get(key)
        if ch is None:  # a field the twin reads but the screen has no label for
            continue
        readings.append({
            "channel": key, "label": ch.label, "unit": ch.unit, "decimals": ch.decimals, "group": ch.group,
            "value": channels.display_value(ch, stored), "limit": channels.limit_of(ch, limits),
            "status": channels.status_of(ch, stored, limits),
        })
    order = {c.key: i for i, c in enumerate(channels.CHANNELS)}
    readings.sort(key=lambda r: order[r["channel"]])
    poll = rt.poll.get(pump, {})
    return json_response({
        "pump": pump, "ts": ts, "age_s": round(time.time() - ts, 1), "source": rt.settings.source,
        "poll_error": poll.get("error"), "readings": readings,
    })


@router.get("/pumps/{pump}/telemetry/history")
def history(
    channel: list[str] = Query(default=[], description="Repeat for several channels; none means a default set"),
    from_: float | None = Query(default=None, alias="from", description="Epoch seconds; default: 1 hour ago"),
    to: float | None = Query(default=None, description="Epoch seconds; default: now"),
    step_s: float = Query(default=60.0, ge=1.0),
    pump: int = Depends(get_pump),
    rt: Runtime = Depends(get_runtime),
) -> Response:
    t1 = time.time() if to is None else to
    t0 = t1 - 3600 if from_ is None else from_
    if t0 >= t1:
        raise HTTPException(422, detail={"error": "'from' must be before 'to'", "field": "from"})
    keys = channel or ["power", "pump_de_vibration", "pump_de_bearing_temperature", "flow_rate"]
    unknown = [k for k in keys if k not in channels.CHANNEL_BY_KEY]
    if unknown:
        raise HTTPException(422, detail={"error": f"Unknown channel: {', '.join(unknown)}", "field": "channel"})
    step = max(step_s, (t1 - t0) / MAX_POINTS)  # never more points than a screen can use
    data = rt.store.history(pump, keys, t0, t1, step)
    limits = limits_of(rt)
    series = []
    for key in keys:
        ch = channels.CHANNEL_BY_KEY[key]
        series.append({
            "channel": key, "label": ch.label, "unit": ch.unit, "decimals": ch.decimals, "limit": channels.limit_of(ch, limits),
            "points": [[ts, channels.display_value(ch, v)] for ts, v in data[key]],
        })
    return json_response({"pump": pump, "from": t0, "to": t1, "step_s": step, "series": series})


@router.post("/pumps/{pump}/telemetry")
def ingest(body: TelemetryIn, pump: int = Depends(get_pump), rt: Runtime = Depends(get_runtime)) -> dict:
    """Push a reading (for instance from our platform's own poller). It becomes the pump's what-if start."""
    values = row_values(body.values)
    if not values:
        raise HTTPException(422, detail={"error": "No numeric values in the reading", "field": "values"})
    ts = parse_ts(body.ts)
    rt.apply_reading(pump, {"timestamp": ts, **values}, ts)
    return {"pump": pump, "ts": ts, "accepted": len(values)}
