import pytest

from pump_twin_api import station_sim as sim


def run_for(seconds, controls=None, state=None):
    controls, state = controls or sim.Controls(), state or sim.State()
    for _ in range(int(seconds)):
        state, controls, _ = sim.step(state, controls, 1)
    return state, controls


def test_step_does_not_mutate_its_inputs():
    state, controls = sim.State(), sim.Controls()
    sim.step(state, controls, 1)
    assert state == sim.State() and controls == sim.Controls()


def test_level_rises_when_inflow_exceeds_pump_flow():
    controls = sim.Controls(auto=False, on=sim.flags())
    assert run_for(60, controls)[0].level > 55


def test_lag_pumps_start_under_storm_inflow():
    controls = sim.apply_scenario(sim.Controls(), sim.SCENARIO_BY_ID["storm"])
    assert run_for(900, controls)[1].on[1] is True


def test_power_failure_stops_every_pump():
    controls = sim.apply_scenario(sim.Controls(), sim.SCENARIO_BY_ID["power"])
    state, _ = run_for(5, controls)
    assert state.flow == 0 and state.running == sim.flags()


def test_trip_scenario_raises_the_alarms():
    controls = sim.apply_scenario(sim.Controls(), sim.SCENARIO_BY_ID["trip"])
    state, controls = run_for(2, controls)
    found = sim.alarms(state, controls)
    assert "P-101 tripped" in found and any(a.startswith("P-101 vibration") for a in found)


def test_closing_the_valve_raises_the_pressure():
    open_valve = run_for(5, sim.Controls(auto=False, on=sim.flags(0, 1)))[0].pressure
    closed = run_for(5, sim.apply_scenario(sim.Controls(), sim.SCENARIO_BY_ID["valve"]))[0].pressure
    assert closed > open_valve


def test_level_stays_between_0_and_100():
    assert run_for(5000, sim.Controls(inflow=2000, auto=False, on=sim.flags()))[0].level <= 100
    assert run_for(5000, sim.Controls(inflow=0))[0].level >= 0


def test_all_eight_pumps_are_modelled():
    state = sim.State()
    assert len(state.power) == len(state.vibration) == len(sim.Controls().speed) == len(sim.LEAD_LAG) == 8


def test_run_returns_a_series_events_and_the_alarm_log():
    out = sim.run("storm", None, 3600, 10)
    assert len(out["series"]["t"]) == 361 and out["series"]["t"][-1] == 3600
    assert out["events"][0] == {"t": 0.0, "text": "Storm inflow: inflow rising to 1,800 m³/h"}
    assert any("started" in e["text"] for e in out["events"])
    assert out["final"]["state"].t == 3600


def test_run_logs_an_alarm_once_when_it_starts():
    out = sim.run("trip", None, 30, 5)
    texts = [a["text"] for a in out["alarm_log"]]
    assert texts.count("P-101 tripped") == 1
    assert "P-101 tripped" in out["alarms"]


def test_run_applies_overrides_over_the_scenario():
    out = sim.run("normal", {"inflow": 3000}, 600, 10)
    assert out["series"]["level"][-1] > out["series"]["level"][0]


def test_unknown_scenario_is_just_the_defaults():
    assert sim.run("nope", None, 10, 5)["events"] == []


@pytest.mark.parametrize("path", ["meta"])
def test_station_api_meta(client, path):
    meta = client.get(f"/v1/station/simulation/{path}").json()
    assert meta["pumps"][0] == "P-101" and len(meta["pumps"]) == 8
    assert [s["id"] for s in meta["scenarios"]] == ["normal", "storm", "trip", "valve", "power"]
    assert meta["limits"]["high_level_pct"] == 90 and len(meta["lead_lag"]) == 8


def test_station_api_run_and_validation(client):
    ok = client.post("/v1/station/simulation/run", json={"scenario": "storm", "duration_s": 120, "step_s": 10})
    assert ok.status_code == 200 and len(ok.json()["series"]["t"]) == 13
    assert ok.json()["final"]["controls"]["inflow"] == 1800
    assert client.post("/v1/station/simulation/run", json={"scenario": "nope"}).status_code == 422
    assert client.post("/v1/station/simulation/run", json={"controls": {"colour": 1}}).status_code == 422
    assert client.post("/v1/station/simulation/run", json={"controls": {"on": [True]}}).status_code == 422
    assert client.post("/v1/station/simulation/run", json={"duration_s": 0}).status_code == 422
