from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest
from fastapi.testclient import TestClient

from pump_twin_api.config import Settings
from pump_twin_api.main import create_app
from pump_twin_api.runtime import Runtime
from pump_twin_api.telemetry.store import TelemetryStore


class WhatIfError(ValueError):
    def __init__(self, msg, field_=None):
        super().__init__(msg)
        self.field = field_


def _part(name, role, sub=""):
    return SimpleNamespace(name=name, role=role, sub=sub, V=np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], float), F=np.array([[0, 1, 2]], np.uint32))


class FakeTwin:
    """Stands in for the real twin so the API can be tested without the 100 s model build."""

    S = {"ambient_c": 32.0}
    curve = SimpleNamespace(eta_bep=0.87)
    rparts = [
        _part("Impeller hub + centre disc + blades (double suction)", "IMPELLER"),
        _part("Bearing 6324 DE", "BEARING"),
        _part("Motor BHEL 1LA7710-4 1100 kW", "MOTOR"),
        _part("Base frame", "BASE"),
    ]

    def process(self, raw, faults, label="live"):
        wear = faults.get("impeller_wear", 0.0)
        bearing = faults.get("lubrication_degraded", 0.0)
        kpi = {"flow_m3h": raw.get("flow", raw.get("flow_rate", 0.0)), "head_m": 125.0, "pump_eff_pct": 87.0 - 10 * wear, "power_kw": 1000.0 + 50 * wear,
               "vib_pump_de": 1.8 + 6 * bearing, "timestamp": "t0", "usable": True}
        return SimpleNamespace(kpi=kpi, health={"impeller": wear, "bearings": bearing, "overall": max(wear, bearing)},
                               st=SimpleNamespace(pump=1), label=label, faults=faults)


def _whatif_row(twin, raw, over, mode, driver, vfd=False):
    if over.get("head_m", 0) > 300:
        raise WhatIfError("head m is outside the allowed range", "head_m")
    return {**raw, "flow": 2000.0}, ["note"], {"flow_m3h": 2000.0, "head_m": over.get("head_m", 120.0)}


def _payload(twin, run, shared):
    lub = run.faults.get("lubrication_degraded", 0.0)
    comps = {"impeller": round(100 - 100 * run.health["impeller"]), "volute": 100, "shaft": 93,
             "bearings": round(100 - 100 * lub), "seal": 100, "motor": 100}
    insights = {"charts": [], "sim": []}
    if lub:
        finding = {"level": "act", "area": "Pump bearings", "finding": "Pump bearing 117 °C, over the 80 °C alarm.", "recommendation": "Change the oil."}
        insights = {"charts": [finding], "sim": [finding, {"level": "watch", "area": "Motor", "finding": "Motor warm", "recommendation": "Check cooling."},
                                                   {"level": "info", "area": "Energy", "finding": "x", "recommendation": "y"}]}
    return {
        "kpi": run.kpi, "health_index": {"index": min(comps.values()), "components": comps, "worst": "bearings", "status": "ok"},
        "health_detail": {k: {"text": f"{k} reason"} for k in comps}, "cards": [], "insights": insights, "charts": {},
        "layers": ["x" * 10_000],  # the big 3-D part that must not be returned
    }


FAKE_P3 = SimpleNamespace(
    WHATIF_FIELDS=[{"k": "head_m"}, {"k": "flow_m3h"}],
    WHATIF_FAULTS=[("impeller_wear", "Impeller wear", 1.0, 0.05), ("lubrication_degraded", "Oil degraded", 1.0, 0.05)],
    WhatIfError=WhatIfError,
    HEALTH_LIMITS=dict(pump_vib=4.5, motor_vib=2.8, pump_brg_alarm=80.0, motor_brg_alarm=90.0, winding_alarm=130.0),
    health_bands=lambda: {"ok": 0.7, "act": 0.35},
    whatif_row=_whatif_row,
    whatif_defaults=lambda twin, raw: {"head_m": 120.0},
    whatif_ranges=lambda twin, raw, over=None, vfd=False: {"head_m": [100, 150]},
    whatif_limits=lambda twin: {"head_m": (0, 400)},
    health_of=lambda score: 1.0 - score,
    scenario_payload=_payload,
)


def make_runtime(state: str = "ready", api_key: str = "") -> Runtime:
    settings = Settings(twin_dir=Path("."), api_key=api_key, db_path=":memory:")
    rt = Runtime(settings, store=TelemetryStore(":memory:"))
    rt.state = state
    rt.p3 = FAKE_P3
    rt.twins = {1: FakeTwin()}
    rt.apply_reading(1, {"timestamp": 1_700_000_000, "flow": 2478.0, "pump_de_vibration": 1.8, "power": 1_008_000.0}, 1_700_000_000)
    return rt


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(runtime=make_runtime()))


@pytest.fixture
def secured_client() -> TestClient:
    return TestClient(create_app(runtime=make_runtime(api_key="secret")))
