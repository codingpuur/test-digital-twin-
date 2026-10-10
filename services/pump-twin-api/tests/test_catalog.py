from pump_twin_api import catalog, enrich

from .conftest import FAKE_P3

THRESHOLDS = {"ok": 70, "act": 35}


def test_bands_come_from_the_twin():
    assert catalog.bands(FAKE_P3) == THRESHOLDS


def test_health_status_edges():
    assert [catalog.health_status(v, THRESHOLDS) for v in (100, 70, 69.9, 35, 34.9, 0)] == ["ok", "ok", "watch", "watch", "act", "act"]


def test_cad_roles_map_to_components():
    assert catalog.component_of_role("BEARING_FRAME") == "bearings"
    assert catalog.component_of_role("SUCTION_PIPE") == "volute"
    assert catalog.component_of_role("BASE") is None
    assert catalog.component_of_role("NOT_A_ROLE") is None


def test_every_component_has_a_part_to_focus_on():
    assert set(catalog.FOCUS_PART) == set(catalog.COMPONENTS)


def test_kpi_deltas_say_whether_a_change_is_good():
    base = {"pump_eff_pct": 87.0, "vib_pump_de": 1.8, "flow_m3h": 2400.0, "power_kw": 1000.0, "head_m": 127.0}
    scen = {"pump_eff_pct": 83.0, "vib_pump_de": 1.8, "flow_m3h": 2500.0, "power_kw": 900.0, "head_m": 127.0}
    rows = {r["key"]: r for r in enrich.kpi_deltas(base, scen)}
    assert rows["pump_eff_pct"]["direction"] == "worse"  # higher is better, and it fell
    assert rows["power_kw"]["direction"] == "improved"  # lower is better, and it fell
    assert rows["vib_pump_de"]["direction"] == "same"
    assert rows["flow_m3h"]["direction"] == "changed"  # neither direction is good or bad
    assert rows["head_m"]["direction"] == "same"
    assert "npsh_margin_ratio" not in rows  # missing from both: left out


def test_alarms_are_deduped_sorted_and_tied_to_a_component():
    finding = {"level": "watch", "area": "Motor", "finding": "Motor warm", "recommendation": "Check"}
    critical = {"level": "act", "area": "Pump bearings", "finding": "Bearing hot", "recommendation": "Oil"}
    info = {"level": "info", "area": "Energy", "finding": "kWh", "recommendation": ""}
    rows = enrich.alarm_rows({"a": [finding, info], "b": [finding, critical]})
    assert [(r["severity"], r["component"]) for r in rows] == [("act", "bearings"), ("watch", "motor")]


def test_alarm_list_is_capped():
    many = [{"level": "act", "area": "Motor", "finding": f"f{i}", "recommendation": ""} for i in range(10)]
    assert len(enrich.alarm_rows({"a": many}, limit=4)) == 4
