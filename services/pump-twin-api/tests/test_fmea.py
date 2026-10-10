import dataclasses
import time
from types import SimpleNamespace

from fastapi.testclient import TestClient

from pump_twin_api.main import create_app

from .conftest import FAKE_P3, make_runtime


def _client(tmp_path, with_workbook: bool):
    rt = make_runtime()
    rt.settings = dataclasses.replace(rt.settings, twin_dir=tmp_path)
    if with_workbook:
        (tmp_path / "Failure_Modes_1.xlsx").write_bytes(b"x")
    rt.p3 = SimpleNamespace(
        **vars(FAKE_P3),
        simulate_failure_modes=lambda twin, raw, path: ("base", [{"mode": "bearing"}]),
        fm_dashboard=lambda base, rows: {"baseline": base, "groups": rows},
        insights_for=lambda kind, **kw: [{"finding": "x"}],
    )
    return TestClient(create_app(runtime=rt))


def test_unavailable_without_the_workbook(tmp_path):
    body = _client(tmp_path, False).get("/v1/pumps/1/fmea").json()
    assert body["state"] == "unavailable"


def test_computes_in_the_background_then_serves_the_cached_result(tmp_path):
    client = _client(tmp_path, True)
    assert client.get("/v1/pumps/1/fmea").json()["state"] in ("computing", "ready")
    for _ in range(50):
        body = client.get("/v1/pumps/1/fmea").json()
        if body["state"] == "ready":
            break
        time.sleep(0.05)
    assert body["state"] == "ready"
    assert body["fm"]["groups"] == [{"mode": "bearing"}]
    assert body["fm"]["insights"] == [{"finding": "x"}]
