from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query, Response

from .. import life
from ..deps import get_pump, get_runtime, json_response, require_key
from ..runtime import Runtime

router = APIRouter(prefix="/v1/pumps/{pump}", dependencies=[Depends(require_key)])


@router.get("/life")
def degradation(pump: int = Depends(get_pump), rt: Runtime = Depends(get_runtime)) -> Response:
    """Degradation rows, trends, residuals with their bands and the likely causes."""
    return json_response(life.assessment(rt, pump))


@router.get("/report")
def period_report(
    period: Literal["day", "week", "month"] = "day",
    pump: int = Depends(get_pump), rt: Runtime = Depends(get_runtime),
) -> Response:
    return json_response(life.report(rt, pump, period))


@router.get("/history")
def time_lapse(
    days: int = Query(30, ge=1, le=365), pump: int = Depends(get_pump), rt: Runtime = Depends(get_runtime),
) -> Response:
    """Six-hourly history for the time-lapse."""
    return json_response(life.history(rt, pump, days))
