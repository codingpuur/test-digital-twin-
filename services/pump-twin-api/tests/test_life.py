from types import SimpleNamespace

from fastapi.testclient import TestClient

from pump_twin_api.main import create_app

from .conftest import FAKE_P3, make_runtime


def test_unavailable_without_a_history_source():
    client = TestClient(create_app(runtime=make_runtime()))
    for path in ("/life", "/report?period=week", "/history?days=10"):
        body = client.get(f"/v1/pumps/1{path}").json()
        assert body["state"] == "unavailable", path


class FakeLife:
    hist = {1: [1, 2, 3]}
    status = {1: "ready"}

    def assess(self, pump):
        return {"pump": pump, "components": [{"key": "bearings"}], "life_used": {"bearings": 0.2}}

    def report(self, pump, period, assessment):
        return {"pump": pump, "period": period, "hours": 24}


def _client():
    rt = make_runtime()
    rt.life = FakeLife()
    rt.p3 = SimpleNamespace(
        **vars(FAKE_P3), HERE="/nonexistent", LIFE_CONFIG_FILE="cfg.json",
        insights_for=lambda kind, **kw: [{"finding": "life ok"}],
        anim_history=lambda life, pump, days: {"t": ["2026-10-01 00:00"], "days": days},
    )
    return TestClient(create_app(runtime=rt)), rt


def test_assessment_adds_findings_and_tells_the_twin_the_life_used():
    client, rt = _client()
    body = client.get("/v1/pumps/1/life").json()
    assert body["state"] == "ready" and body["insights"] == [{"finding": "life ok"}]
    assert rt.twins[1].life_used == {"bearings": 0.2}


def test_report_and_history_pass_their_arguments_through():
    client, _ = _client()
    assert client.get("/v1/pumps/1/report?period=month").json()["period"] == "month"
    assert client.get("/v1/pumps/1/history?days=7").json()["days"] == 7
    assert client.get("/v1/pumps/1/report?period=year").status_code == 422
