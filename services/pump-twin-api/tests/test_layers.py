import base64

from .conftest import make_runtime
from fastapi.testclient import TestClient

from pump_twin_api.main import create_app

BODY = {"mode": "consistent", "driver": "head_m", "over": {"head_m": 120}, "faults": {"impeller_wear": 0.5}}


def _client():
    return TestClient(create_app(runtime=make_runtime()))


def test_layers_need_a_run_first():
    assert _client().get("/v1/pumps/1/layers").status_code == 404


def test_layer_index_lists_only_the_layers_the_run_has():
    client = _client()
    client.post("/v1/pumps/1/whatif", json=BODY)
    body = client.get("/v1/pumps/1/layers", params={"which": "scenario"}).json()
    assert [item["key"] for item in body["layers"]] == ["cavitation"]
    assert body["layers"][0]["about"] == "Where vapour forms."


def test_layer_values_are_one_byte_per_vertex_and_opacity_is_kept():
    client = _client()
    client.post("/v1/pumps/1/whatif", json=BODY)
    body = client.get("/v1/pumps/1/layers/cavitation", params={"which": "scenario"}).json()
    assert list(base64.b64decode(body["values"]["0"])) == [0, 127, 254]
    assert body["opacity"] == {"0": 0.5}
    assert body["extras"][0]["kind"] == "lines"


def test_an_untouched_request_does_not_replace_the_scenario_being_viewed():
    client = _client()
    client.post("/v1/pumps/1/whatif", json=BODY)
    client.post("/v1/pumps/1/whatif", json={"mode": "consistent", "driver": "head_m", "over": {}, "faults": {}})
    scenario = client.get("/v1/pumps/1/layers/cavitation", params={"which": "scenario"}).json()
    baseline = client.get("/v1/pumps/1/layers/cavitation", params={"which": "baseline"}).json()
    assert scenario["values"]["0"] != baseline["values"]["0"]


def test_unknown_layer_is_404():
    client = _client()
    client.post("/v1/pumps/1/whatif", json=BODY)
    assert client.get("/v1/pumps/1/layers/velocity", params={"which": "scenario"}).status_code == 404
