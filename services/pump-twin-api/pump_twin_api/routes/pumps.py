from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from .. import scenario
from ..deps import get_runtime, json_response, require_key, require_ready
from ..runtime import Runtime

router = APIRouter(prefix="/v1", dependencies=[Depends(require_key)])


@router.get("/pumps", dependencies=[Depends(require_ready)])
def pumps(rt: Runtime = Depends(get_runtime)) -> Response:
    return json_response({"pumps": scenario.pump_summaries(rt)})
