from fastapi.testclient import TestClient

from pump_twin_api.main import create_app

from .conftest import make_runtime

BODY = {"mode": "consistent", "driver": "head_m", "over": {"head_m": 120}, "faults": {}}


def test_health_works_before_the_twin_is_ready():
    client = TestClient(create_app(runtime=make_runtime(state="building")))
    assert client.get("/health").json()["state"] == "building"


def test_v1_answers_503_while_building():
    client = TestClient(create_app(runtime=make_runtime(state="building")))
    assert client.get("/v1/meta").status_code == 503
    assert client.post("/v1/pumps/1/whatif", json=BODY).status_code == 503


def test_api_key_is_required_when_set(secured_client):
    assert secured_client.get("/v1/meta").status_code == 401
    assert secured_client.get("/v1/meta", headers={"x-api-key": "nope"}).status_code == 401
    assert secured_client.get("/v1/meta", headers={"x-api-key": "secret"}).status_code == 200
    assert secured_client.get("/health").status_code == 200  # health is open


def test_unknown_pump_is_404(client):
    assert client.get("/v1/pumps/9/whatif/defaults").status_code == 404


def test_whatif_returns_a_slim_scenario_with_a_baseline(client):
    reply = client.post("/v1/pumps/1/whatif", json={**BODY, "faults": {"impeller_wear": 0.5}})
    body = reply.json()
    assert reply.status_code == 200
    assert "layers" not in body["scenario"]  # the 3-D layers are left out
    assert body["scenario"]["kpi"]["pump_eff_pct"] == 82.0
    assert body["baseline"]["kpi"]["pump_eff_pct"] == 87.0
    assert body["scenario"]["health"]["impeller"] == 0.5
    assert body["notes"] == ["note"]


def test_unknown_input_and_out_of_range_fault_are_422(client):
    unknown = client.post("/v1/pumps/1/whatif", json={**BODY, "over": {"colour": 1}})
    assert unknown.status_code == 422 and unknown.json()["field"] == "colour"
    too_big = client.post("/v1/pumps/1/whatif", json={**BODY, "faults": {"impeller_wear": 3}})
    assert too_big.status_code == 422 and too_big.json()["field"] == "impeller_wear"
    no_such = client.post("/v1/pumps/1/whatif", json={**BODY, "faults": {"nope": 1}})
    assert no_such.status_code == 422


def test_a_target_the_pump_cannot_reach_is_422_with_the_field(client):
    reply = client.post("/v1/pumps/1/whatif", json={**BODY, "over": {"head_m": 900}})
    assert reply.status_code == 422
    assert reply.json() == {"error": "head m is outside the allowed range", "field": "head_m", "pump": 1}


def test_pinned_reading_is_used(client):
    assert client.put("/v1/pumps/1/reading", json={"flow": 1000.0}).json() == {"pump": 1, "pinned": True}
    reply = client.post("/v1/pumps/1/whatif", json=BODY).json()
    assert reply["baseline"]["kpi"]["flow_m3h"] == 1000.0
