from __future__ import annotations

from fastapi import APIRouter, Depends

from ..deps import get_runtime
from ..runtime import Runtime

router = APIRouter()


@router.get("/health")
def health(rt: Runtime = Depends(get_runtime)) -> dict:
    return {
        "state": rt.state, "error": rt.error, "station": rt.settings.station, "source": rt.settings.source,
        "pumps": sorted(rt.twins), "built_s": rt.built_s, "twin_dir": str(rt.settings.twin_dir),
        "poll_interval_s": rt.settings.poll_interval_s, "readings_stored": rt.store.count(),
        "poll_errors": {p: v["error"] for p, v in rt.poll.items() if v.get("error")},
    }
