from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Response

from .. import scenario
from ..deps import get_pump, get_runtime, json_response, require_key, require_ready
from ..runtime import Runtime

router = APIRouter(prefix="/v1", dependencies=[Depends(require_key)])


@router.get("/pumps", dependencies=[Depends(require_ready)])
def pumps(rt: Runtime = Depends(get_runtime)) -> Response:
    return json_response({"pumps": scenario.pump_summaries(rt)})


@router.put("/pumps/{pump}/reading")
def set_reading(row: dict[str, Any], pump: int = Depends(get_pump), rt: Runtime = Depends(get_runtime)) -> dict:
    """Pins a reading (iPumpNet field names) as the pump's current state, e.g. from our platform."""
    rt.pin(pump, row)
    return {"pump": pump, "pinned": True}
