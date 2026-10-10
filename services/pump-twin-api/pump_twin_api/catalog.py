"""Business rules that used to live in the screens: which KPI is better when higher, what counts as
healthy, which CAD part belongs to which health component. The frontend only formats what it gets."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

COMPONENTS = ("impeller", "volute", "shaft", "bearings", "seal", "motor")

# CAD role (as named by the twin's render parts) -> health component. None = not in the health model.
COMPONENT_OF_ROLE: dict[str, str | None] = {
    "IMPELLER": "impeller",
    "VOLUTE": "volute", "SUCTION_PIPE": "volute", "DISCHARGE_PIPE": "volute",
    "SHAFT": "shaft", "COUPLING": "shaft",
    "BEARING": "bearings", "BEARING_FRAME": "bearings",
    "SEAL": "seal", "OTHER": "seal",
    "MOTOR": "motor",
    "BASE": None, "GUARD": None,
}

# The part the screen selects when a component is the one to look at.
FOCUS_PART: dict[str, str] = {
    "impeller": "Impeller hub + centre disc + blades (double suction)",
    "volute": "Casing lower half FC300 (double volute, nozzles, feet)",
    "shaft": "Pump shaft SUS420J2",
    "bearings": "Bearing 6324 DE",
    "seal": "Gland packing DE (5 rings 19 mm)",
    "motor": "Motor BHEL 1LA7710-4 1100 kW",
}

# Finding area (as written by the twin's insights) -> component it is about.
AREA_COMPONENT: dict[str, str] = {
    "Hydraulics": "impeller", "Suction": "impeller", "Rotor": "shaft", "Pump bearings": "bearings",
    "Gland packing": "seal", "Motor": "motor",
}

STATUS_LABELS = {"ok": "Healthy", "watch": "Needs attention", "act": "Critical"}


@dataclass(frozen=True)
class Kpi:
    key: str
    label: str
    unit: str
    decimals: int
    better: str | None  # "higher", "lower", or None when neither direction is good or bad


KPIS: tuple[Kpi, ...] = (
    Kpi("flow_m3h", "Flow", "m³/h", 0, None),
    Kpi("head_m", "Head", "m", 1, None),
    Kpi("power_kw", "Power", "kW", 0, "lower"),
    Kpi("pump_eff_pct", "Efficiency", "%", 1, "higher"),
    Kpi("power_vs_oem_pct", "Power vs OEM", "%", 1, "lower"),
    Kpi("npsh_margin_ratio", "NPSHa / NPSHr", "", 2, "higher"),
    Kpi("vib_pump_de", "Pump vibration", "mm/s", 2, "lower"),
    Kpi("vib_motor_de", "Motor vibration", "mm/s", 2, "lower"),
    Kpi("brg_T_de", "Pump bearing", "°C", 1, "lower"),
    Kpi("winding_T_model", "Winding (model)", "°C", 1, "lower"),
    Kpi("seal_defl_um", "Seal deflection", "µm", 1, "lower"),
    Kpi("sec_kwh_per_ml", "Energy", "kWh/ML", 0, "lower"),
    Kpi("q_over_qbep", "Flow / BEP", "", 2, None),
)
KPI_BY_KEY = {k.key: k for k in KPIS}


def bands(p3: Any) -> dict[str, float]:
    """Status thresholds on the 0-100 scale: at or above `ok` is healthy, below `act` is critical."""
    b = p3.health_bands()
    return {"ok": round(b["ok"] * 100), "act": round(b["act"] * 100)}


def health_status(index: float, thresholds: dict[str, float]) -> str:
    if index >= thresholds["ok"]:
        return "ok"
    return "watch" if index >= thresholds["act"] else "act"


def component_of_role(role: str) -> str | None:
    return COMPONENT_OF_ROLE.get(role)


def meta(p3: Any) -> dict:
    return {
        "kpis": [k.__dict__ for k in KPIS],
        "bands": bands(p3),
        "status_labels": STATUS_LABELS,
        "components": list(COMPONENTS),
        "focus_part": FOCUS_PART,
    }
