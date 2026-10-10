from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from .. import catalog
from ..deps import get_runtime, json_response, require_key, require_ready
from ..runtime import Runtime

router = APIRouter(prefix="/v1", dependencies=[Depends(require_key), Depends(require_ready)])


@router.get("/meta")
def meta(rt: Runtime = Depends(get_runtime)) -> Response:
    p3 = rt.p3
    return json_response({
        "station": rt.settings.station, "source": rt.settings.source, "pumps": sorted(rt.twins),
        "fields": p3.WHATIF_FIELDS,
        "faults": [dict(key=k, label=label, max=mx, step=st) for k, label, mx, st in p3.WHATIF_FAULTS],
        "drivers": ["head_m", "flow_m3h", "power_kw"],
        **catalog.meta(p3),
    })
