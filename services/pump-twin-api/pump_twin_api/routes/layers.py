from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response

from .. import layers
from ..deps import get_pump, get_runtime, json_response, require_key
from ..runtime import Runtime

router = APIRouter(prefix="/v1/pumps/{pump}/layers", dependencies=[Depends(require_key)])

Which = Literal["baseline", "scenario"]


def _run(rt: Runtime, pump: int, which: Which):
    run = rt.runs.get((pump, which))
    if run is None:
        raise HTTPException(status_code=404, detail=f"No {which} run for pump {pump} yet; run the what-if first")
    return run


@router.get("")
def layer_index(which: Which = "baseline", pump: int = Depends(get_pump), rt: Runtime = Depends(get_runtime)) -> Response:
    run = _run(rt, pump, which)
    return json_response({"pump": pump, "which": which, "layers": layers.index(rt.p3, run)})


@router.get("/{key}")
def layer(key: str, which: Which = "baseline", pump: int = Depends(get_pump), rt: Runtime = Depends(get_runtime)) -> Response:
    detail = layers.detail(rt.p3, _run(rt, pump, which), key)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"No layer {key}")
    return json_response({"pump": pump, "which": which, **detail})
