from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from .. import scenario
from ..deps import get_pump, get_runtime, json_response, require_key
from ..runtime import Runtime
from ..schemas import WhatIfRequest

router = APIRouter(prefix="/v1/pumps/{pump}/whatif", dependencies=[Depends(require_key)])


@router.get("/defaults")
def defaults(pump: int = Depends(get_pump), rt: Runtime = Depends(get_runtime)) -> Response:
    return json_response(scenario.defaults(rt, pump))


@router.get("/range")
def whatif_range(
    frequency_hz: float | None = None, speed_rpm: float | None = None, vfd: bool = False,
    pump: int = Depends(get_pump), rt: Runtime = Depends(get_runtime),
) -> Response:
    over = {k: v for k, v in (("frequency_hz", frequency_hz), ("speed_rpm", speed_rpm)) if v is not None}
    return json_response(scenario.ranges(rt, pump, over, vfd))


@router.post("")
def whatif(body: WhatIfRequest, pump: int = Depends(get_pump), rt: Runtime = Depends(get_runtime)) -> Response:
    try:
        return json_response(scenario.run_whatif(rt, pump, body))
    except scenario.InvalidScenario as exc:  # bad input, or a target the pump cannot reach
        return json_response({"error": str(exc), "field": exc.field, "pump": pump}, status=422)
