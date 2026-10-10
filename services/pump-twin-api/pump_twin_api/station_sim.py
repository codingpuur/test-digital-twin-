"""The pumping-station what-if model (wet well, eight pumps, lead/lag control). Pure Python.

Ported from the browser model so that the screen holds no simulation logic: it asks for a scenario
and plays back what comes out.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field

PUMP_NAMES = ("P-101", "P-102", "P-103", "P-104", "P-105", "P-106", "P-107", "P-108")
N = len(PUMP_NAMES)

VIBRATION_WARNING = 7.0
PRESSURE_WARNING = 8.0
HIGH_LEVEL_WARNING = 90.0
LOW_LEVEL_WARNING = 12.0

WELL_CAPACITY = 4200.0
MAX_PUMP_FLOW = 520.0
MAX_PUMP_POWER = 95.0

# Start/stop levels (%) of each pump under lead/lag control. Pumps 4-8 only join in an extreme storm.
LEAD_LAG = (
    (35, 20), (70, 55), (85, 68), (90, 76), (93, 80), (95, 84), (97, 88), (99, 90),
)


def flags(*on: int) -> list[bool]:
    return [i in on for i in range(N)]


@dataclass
class Controls:
    inflow: float = 800.0  # m3/h
    valve: float = 100.0  # discharge valve position, 0-100 %
    auto: bool = True  # lead/lag control
    on: list[bool] = field(default_factory=lambda: flags(0))
    speed: list[float] = field(default_factory=lambda: [80.0] * N)  # %
    trip: list[bool] = field(default_factory=lambda: flags())
    vibration_fault: list[bool] = field(default_factory=lambda: flags())


@dataclass
class State:
    t: float = 0.0  # simulated seconds since start
    level: float = 55.0  # wet-well level, %
    flow: float = 0.0  # m3/h
    pressure: float = 0.3  # bar
    power: list[float] = field(default_factory=lambda: [0.0] * N)  # kW
    vibration: list[float] = field(default_factory=lambda: [0.4] * N)  # mm/s
    running: list[bool] = field(default_factory=lambda: flags())


@dataclass(frozen=True)
class Scenario:
    id: str
    label: str
    description: str
    message: str
    controls: dict


SCENARIOS: tuple[Scenario, ...] = (
    Scenario("normal", "Normal operation", "Inflow 800 m³/h, auto lead/lag", "Normal operation restored",
             dict(inflow=800, valve=100, auto=True, on=flags(0), trip=flags(), vibration_fault=flags())),
    Scenario("storm", "Storm inflow", "Inflow rises to 1,800 m³/h", "Storm inflow: inflow rising to 1,800 m³/h",
             dict(inflow=1800, valve=100, auto=True, on=flags(0), trip=flags(), vibration_fault=flags())),
    Scenario("trip", "P-101 trip", "Pump 1 stops, vibration alarm", "P-101 tripped on high vibration",
             dict(inflow=900, valve=100, auto=True, on=flags(1), trip=flags(0), vibration_fault=flags(0))),
    Scenario("valve", "Discharge valve closed", "Pressure rises, flow drops", "Discharge valve DV-01 closed to 15 %",
             dict(inflow=900, valve=15, auto=False, on=flags(0, 1), trip=flags(), vibration_fault=flags())),
    Scenario("power", "Power failure", "All pumps stop", "Power failure: all pumps stopped",
             dict(inflow=900, valve=100, auto=False, on=flags(), trip=[True] * N, vibration_fault=flags())),
)
SCENARIO_BY_ID = {s.id: s for s in SCENARIOS}


def apply_scenario(controls: Controls, scenario: Scenario) -> Controls:
    merged = deepcopy(controls)
    for key, value in scenario.controls.items():
        setattr(merged, key, deepcopy(value))
    return merged


def step(state: State, controls: Controls, dt: float) -> tuple[State, Controls, list[str]]:
    """Advances the station by `dt` simulated seconds. Never mutates its inputs."""
    events: list[str] = []
    on = list(controls.on)

    if controls.auto:
        for i, (start, stop) in enumerate(LEAD_LAG):
            if controls.trip[i]:
                continue
            if state.level > start and not on[i]:
                on[i] = True
                if i > 0:
                    events.append(f"{PUMP_NAMES[i]} started (level {state.level:.0f} %)")
            elif state.level < stop and on[i]:
                on[i] = False
                if i > 0:
                    events.append(f"{PUMP_NAMES[i]} stopped (level {state.level:.0f} %)")

    valve_capacity = min(1.0, 0.25 + controls.valve / 130)
    running = [is_on and not controls.trip[i] for i, is_on in enumerate(on)]
    flow = sum(MAX_PUMP_FLOW * (controls.speed[i] / 100) * valve_capacity if r else 0.0 for i, r in enumerate(running))
    power = [MAX_PUMP_POWER * (controls.speed[i] / 100) ** 3 if r else 0.0 for i, r in enumerate(running)]

    def vibration_of(i: int, is_running: bool) -> float:
        if controls.vibration_fault[i]:
            return 9.4
        if not is_running:
            return 0.4
        return 2.6 + controls.speed[i] / 60 + (3.2 if controls.valve < 30 else 0.0)

    vibration = [vibration_of(i, r) for i, r in enumerate(running)]
    pressure = 2.2 + flow / 380 + ((100 - controls.valve) / 100) * 6.5 if flow > 0 else 0.3
    level = max(0.0, min(100.0, state.level + (controls.inflow - flow) / WELL_CAPACITY * dt))

    next_controls = deepcopy(controls)
    next_controls.on = on
    return State(state.t + dt, level, flow, pressure, power, vibration, running), next_controls, events


def alarms(state: State, controls: Controls) -> list[str]:
    out: list[str] = []
    if state.level > HIGH_LEVEL_WARNING:
        out.append("High level > 90 %")
    if state.level < LOW_LEVEL_WARNING and state.flow > 0:
        out.append("Low level < 12 %")
    if state.pressure > PRESSURE_WARNING:
        out.append("High pressure > 8 bar")
    for i, name in enumerate(PUMP_NAMES):
        if state.vibration[i] > VIBRATION_WARNING:
            out.append(f"{name} vibration {state.vibration[i]:.1f} mm/s")
        if controls.trip[i]:
            out.append(f"{name} tripped")
    return out


def run(scenario_id: str | None, overrides: dict | None, duration_s: float, step_s: float, state: State | None = None) -> dict:
    """Runs the model from the start (or from `state`) and returns the whole time series."""
    controls = Controls()
    scenario = SCENARIO_BY_ID.get(scenario_id) if scenario_id else None
    if scenario:
        controls = apply_scenario(controls, scenario)
    for key, value in (overrides or {}).items():
        setattr(controls, key, deepcopy(value))
    current = state or State()

    series = {"t": [], "level": [], "flow": [], "pressure": [], "power": [], "vibration": [], "running": []}
    events: list[dict] = [{"t": 0.0, "text": scenario.message}] if scenario else []
    alarm_log: list[dict] = []
    active: set[str] = set()

    def record(s: State) -> None:
        series["t"].append(round(s.t, 2))
        series["level"].append(round(s.level, 2))
        series["flow"].append(round(s.flow, 1))
        series["pressure"].append(round(s.pressure, 2))
        series["power"].append([round(p, 1) for p in s.power])
        series["vibration"].append([round(v, 2) for v in s.vibration])
        series["running"].append(list(s.running))

    record(current)
    steps = int(duration_s // step_s)
    for _ in range(steps):
        current, controls, new_events = step(current, controls, step_s)
        events += [{"t": round(current.t, 2), "text": text} for text in new_events]
        now = set(alarms(current, controls))
        alarm_log += [{"t": round(current.t, 2), "text": text} for text in sorted(now - active)]
        active = now
        record(current)

    return {
        "scenario": scenario_id, "step_s": step_s, "series": series, "events": events,
        "alarm_log": alarm_log, "alarms": sorted(active),
        "final": {"state": current, "controls": controls},
    }
