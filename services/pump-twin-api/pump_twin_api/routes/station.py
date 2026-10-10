from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field

from .. import station_sim as sim
from ..deps import json_response, require_key

router = APIRouter(prefix="/v1/station/simulation", dependencies=[Depends(require_key)])


class RunIn(BaseModel):
    scenario: str | None = Field(default=None, description="normal | storm | trip | valve | power")
    controls: dict = Field(default_factory=dict, description="Overrides: inflow, valve, auto, on, speed, trip, vibration_fault")
    duration_s: float = Field(default=600.0, gt=0, le=86400)
    step_s: float = Field(default=5.0, ge=0.5, le=60)


def _check(body: RunIn) -> None:
    from fastapi import HTTPException

    if body.scenario and body.scenario not in sim.SCENARIO_BY_ID:
        raise HTTPException(422, detail={"error": f"Unknown scenario {body.scenario}", "field": "scenario"})
    allowed = set(sim.Controls.__dataclass_fields__)
    bad = [k for k in body.controls if k not in allowed]
    if bad:
        raise HTTPException(422, detail={"error": f"Unknown control: {', '.join(bad)}", "field": bad[0]})
    for key in ("on", "speed", "trip", "vibration_fault"):
        if key in body.controls and len(body.controls[key]) != sim.N:
            raise HTTPException(422, detail={"error": f"{key} needs {sim.N} values, one per pump", "field": key})


@router.get("/meta")
def meta() -> dict:
    return {
        "pumps": list(sim.PUMP_NAMES),
        "limits": {"vibration_mm_s": sim.VIBRATION_WARNING, "pressure_bar": sim.PRESSURE_WARNING,
                   "high_level_pct": sim.HIGH_LEVEL_WARNING, "low_level_pct": sim.LOW_LEVEL_WARNING},
        "lead_lag": [{"pump": sim.PUMP_NAMES[i], "start_pct": a, "stop_pct": b} for i, (a, b) in enumerate(sim.LEAD_LAG)],
        "scenarios": [{"id": s.id, "label": s.label, "description": s.description, "message": s.message,
                       "controls": s.controls} for s in sim.SCENARIOS],
        "defaults": sim.Controls().__dict__,
    }


@router.post("/run")
def run(body: RunIn) -> Response:
    _check(body)
    result = sim.run(body.scenario, body.controls, body.duration_s, body.step_s)
    final = result.pop("final")
    result["final"] = {"state": final["state"].__dict__, "controls": final["controls"].__dict__}
    return json_response(result)
