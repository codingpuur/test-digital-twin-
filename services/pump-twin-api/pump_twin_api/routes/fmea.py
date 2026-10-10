from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from .. import fmea
from ..deps import get_pump, get_runtime, json_response, require_key
from ..runtime import Runtime

router = APIRouter(prefix="/v1/pumps/{pump}/fmea", dependencies=[Depends(require_key)])


@router.get("")
def failure_modes(pump: int = Depends(get_pump), rt: Runtime = Depends(get_runtime)) -> Response:
    """`state` is computing (ask again in a few seconds), ready, unavailable or error."""
    return json_response(fmea.get(rt, pump))
