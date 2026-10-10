import time

from pump_twin_api.telemetry import channels
from pump_twin_api.telemetry.demo import DemoSource
from pump_twin_api.telemetry.rows import parse_ts, row_values, to_row
from pump_twin_api.telemetry.store import TelemetryStore

LIMITS = dict(pump_vib=4.5, motor_vib=2.8, winding_alarm=130.0)


def test_store_keeps_the_latest_reading_per_pump():
    store = TelemetryStore()
    store.append(1, 100.0, {"power": 5.0, "flow_rate": 600.0})
    store.append(1, 200.0, {"power": 6.0})
    store.append(2, 300.0, {"power": 9.0})
    assert store.latest(1) == (200.0, {"power": 6.0})
    assert store.latest(3) is None
    assert store.span(1) == (100.0, 200.0) and store.count() == 4


def test_the_same_pump_channel_and_time_is_replaced():
    store = TelemetryStore()
    store.append(1, 100.0, {"power": 5.0})
    store.append(1, 100.0, {"power": 7.0})
    assert store.count() == 1 and store.latest(1) == (100.0, {"power": 7.0})


def test_history_is_averaged_per_bucket_and_ordered():
    store = TelemetryStore()
    for ts, value in [(0, 1.0), (30, 3.0), (60, 5.0), (90, 7.0), (500, 9.0)]:
        store.append(1, float(ts), {"v": value})
    series = store.history(1, ["v", "missing"], 0.0, 100.0, 60.0)
    assert series["v"] == [(0.0, 2.0), (60.0, 6.0)]  # 500 is outside the window
    assert series["missing"] == []


def test_row_values_drop_text_and_non_numbers():
    assert row_values({"timestamp": "t", "a": "1.5", "b": "x", "c": float("nan"), "d": True, "e": 2}) == {"a": 1.5, "e": 2.0}


def test_timestamps_read_epoch_iso_and_milliseconds():
    assert parse_ts(1_700_000_000) == 1_700_000_000.0
    assert parse_ts(1_700_000_000_000) == 1_700_000_000.0
    assert parse_ts("2026-10-10T10:00:00Z") == parse_ts("2026-10-10 10:00:00")  # no zone means UTC
    assert abs(parse_ts(None) - time.time()) < 2


def test_to_row_round_trips():
    row = to_row(1_700_000_000.0, {"power": 5.0})
    assert row == {"timestamp": "2023-11-14 22:13:20", "power": 5.0}
    assert parse_ts(row["timestamp"]) == 1_700_000_000.0


def test_status_is_decided_from_the_limit():
    vib = channels.CHANNEL_BY_KEY["pump_de_vibration"]
    assert [channels.status_of(vib, v, LIMITS) for v in (1.0, 4.49, 4.5, 8.0)] == ["ok", "ok", "act", "act"]
    assert channels.status_of(channels.CHANNEL_BY_KEY["frequency"], 50.0, LIMITS) is None  # no limit for it


def test_power_is_shown_in_kilowatts():
    power = channels.CHANNEL_BY_KEY["power"]
    assert channels.display_value(power, 1_008_000.0) == 1008.0


def test_demo_source_is_deterministic_and_stays_close_to_the_base():
    source = DemoSource({1: {"timestamp": "x", "flow_rate": 688.0, "pump_de_vibration": 1.8, "frequency": 50.0}})
    a, b = source.values_at(1, 1_700_000_000.0), source.values_at(1, 1_700_000_000.0)
    assert a == b and a["frequency"] == 50.0
    flows = [source.values_at(1, 1_700_000_000.0 + 60 * i)["flow_rate"] for i in range(200)]
    assert min(flows) > 688 * 0.97 and max(flows) < 688 * 1.03 and len(set(flows)) > 50


def test_demo_history_covers_the_window():
    source = DemoSource({1: {"flow_rate": 688.0}})
    points = list(source.history(1, 0.0, 3600.0, 60.0))
    assert len(points) == 61 and points[0][0] == 0.0 and points[-1][0] == 3600.0


def test_api_latest_flags_a_channel_over_its_limit(client):
    client.post("/v1/pumps/1/telemetry", json={"values": {"pump_de_vibration": 6.2, "power": 1_000_000.0, "frequency": 50.0}})
    latest = client.get("/v1/pumps/1/telemetry/latest").json()
    by_channel = {r["channel"]: r for r in latest["readings"]}
    assert by_channel["pump_de_vibration"]["status"] == "act" and by_channel["pump_de_vibration"]["limit"] == 4.5
    assert by_channel["power"]["value"] == 1000.0 and by_channel["power"]["unit"] == "kW"
    assert by_channel["frequency"]["status"] is None
    assert latest["age_s"] < 5


def test_api_ingest_becomes_the_what_if_start(client):
    reply = client.post("/v1/pumps/1/telemetry", json={"ts": 1_700_000_500, "values": {"flow_rate": 700.0}})
    assert reply.json() == {"pump": 1, "ts": 1_700_000_500.0, "accepted": 1}
    body = client.post("/v1/pumps/1/whatif", json={"mode": "consistent", "driver": "head_m", "over": {}, "faults": {}}).json()
    assert body["reading_timestamp"] == "2023-11-14 22:21:40"


def test_api_ingest_rejects_an_empty_reading(client):
    assert client.post("/v1/pumps/1/telemetry", json={"values": {"note": "text"}}).status_code == 422


def test_api_history_returns_series_with_limits(client):
    for i in range(5):
        client.post("/v1/pumps/1/telemetry", json={"ts": 1_700_001_000 + 60 * i, "values": {"pump_de_vibration": 1.0 + i}})
    reply = client.get("/v1/pumps/1/telemetry/history", params={"channel": "pump_de_vibration", "from": 1_700_000_900, "to": 1_700_001_400, "step_s": 60})
    series = reply.json()["series"][0]
    assert [round(v, 1) for _, v in series["points"]] == [1.0, 2.0, 3.0, 4.0, 5.0]
    assert series["limit"] == 4.5 and series["unit"] == "mm/s"


def test_api_history_validation(client):
    assert client.get("/v1/pumps/1/telemetry/history", params={"channel": "nope"}).status_code == 422
    assert client.get("/v1/pumps/1/telemetry/history", params={"from": 10, "to": 5}).status_code == 422


def test_api_history_never_returns_more_points_than_a_screen_can_use(client):
    reply = client.get("/v1/pumps/1/telemetry/history", params={"channel": "power", "from": 0, "to": 100_000_000, "step_s": 1}).json()
    assert reply["step_s"] >= 100_000_000 / 2000


def test_api_channels_catalog(client):
    catalog = client.get("/v1/telemetry/channels").json()["channels"]
    vib = next(c for c in catalog if c["key"] == "pump_de_vibration")
    assert vib["limit"] == 4.5 and vib["group"] == "Vibration"


def test_api_latest_404_without_readings(client):
    client.app.state.runtime.twins[2] = client.app.state.runtime.twins[1]
    assert client.get("/v1/pumps/2/telemetry/latest").status_code == 404
