from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from pump_twin_api.config import Settings
from pump_twin_api.main import create_app
from pump_twin_api.runtime import Runtime


class WhatIfError(ValueError):
    def __init__(self, msg, field_=None):
        super().__init__(msg)
        self.field = field_


class FakeTwin:
    """Stands in for the real twin so the API can be tested without the 100 s model build."""

    S = {"ambient_c": 32.0}
    curve = SimpleNamespace(eta_bep=0.87)

    def process(self, raw, faults, label="live"):
        wear = faults.get("impeller_wear", 0.0)
        kpi = {"flow_m3h": raw["flow"], "pump_eff_pct": 87.0 - 10 * wear, "timestamp": "t0", "usable": True}
        return SimpleNamespace(
            kpi=kpi, health={"impeller": wear, "overall": wear}, st=SimpleNamespace(pump=1), label=label
        )


def _whatif_row(twin, raw, over, mode, driver, vfd=False):
    if over.get("head_m", 0) > 300:
        raise WhatIfError("head m is outside the allowed range", "head_m")
    return {**raw, "flow": 2000.0}, ["note"], {"flow_m3h": 2000.0, "head_m": over.get("head_m", 120.0)}


FAKE_P3 = SimpleNamespace(
    WHATIF_FIELDS=[{"k": "head_m"}, {"k": "flow_m3h"}],
    WHATIF_FAULTS=[("impeller_wear", "Impeller wear", 1.0, 0.05)],
    WhatIfError=WhatIfError,
    whatif_row=_whatif_row,
    whatif_defaults=lambda twin, raw: {"head_m": 120.0},
    whatif_ranges=lambda twin, raw, over=None, vfd=False: {"head_m": [100, 150]},
    whatif_limits=lambda twin: {"head_m": (0, 400)},
    health_of=lambda score: 1.0 - score,
    scenario_payload=lambda twin, run, shared: {
        "kpi": run.kpi, "health_index": {"index": 99}, "cards": [], "insights": {}, "charts": {},
        "layers": ["x" * 10_000],  # the big 3-D part that must not be returned
    },
)


def make_runtime(state: str = "ready", api_key: str = "") -> Runtime:
    rt = Runtime(Settings(twin_dir=Path("."), api_key=api_key))
    rt.state = state
    rt.p3 = FAKE_P3
    rt.twins = {1: FakeTwin()}
    rt.raw = {1: {"flow": 2478.0, "timestamp": "t0"}}
    return rt


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(runtime=make_runtime()))


@pytest.fixture
def secured_client() -> TestClient:
    return TestClient(create_app(runtime=make_runtime(api_key="secret")))
