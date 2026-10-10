"""Synthetic readings around a base reading, so the service works without iPumpNet or a CSV."""

from __future__ import annotations

import math
from typing import Any, Iterator

from .rows import row_values

# key -> (kind, amplitude, period_s). "rel": multiplies by 1 + amplitude * wave; "abs": adds amplitude * wave.
_RULES: dict[str, tuple[str, float, float]] = {
    "flow_rate": ("rel", 0.012, 1800), "power": ("rel", 0.01, 1800),
    "suction_pressure": ("rel", 0.004, 2400), "discharge_pressure": ("rel", 0.004, 2400),
    "pump_de_vibration": ("abs", 0.12, 900), "pump_nde_vibration": ("abs", 0.10, 900),
    "motor_de_vibration": ("abs", 0.08, 900), "motor_nde_vibration": ("abs", 0.07, 900),
}
_TEMP_KEYS = ("bearing_temperature", "winding_temp_pole", "oil_temperature")


def _wave(ts: float, period: float, phase: float) -> float:
    return math.sin(2 * math.pi * ts / period + phase) + 0.15 * math.sin(ts * 0.37 + phase)


class DemoSource:
    def __init__(self, base_rows: dict[int, dict[str, Any]]) -> None:
        self._base = {pump: row_values(row) for pump, row in base_rows.items()}

    def values_at(self, pump: int, ts: float) -> dict[str, float]:
        phase = pump * 1.3
        out = {}
        for key, base in self._base[pump].items():
            kind, amp, period = _RULES.get(key, (None, 0.0, 1.0))
            if kind is None and any(t in key for t in _TEMP_KEYS):
                kind, amp, period = "abs", 1.2, 3600
            if kind == "rel":
                out[key] = base * (1 + amp * _wave(ts, period, phase))
            elif kind == "abs":
                out[key] = base + amp * _wave(ts, period, phase)
            else:
                out[key] = base
        return out

    def history(self, pump: int, t0: float, t1: float, step_s: float) -> Iterator[tuple[float, dict[str, float]]]:
        ts = t0
        while ts <= t1:
            yield ts, self.values_at(pump, ts)
            ts += step_s
