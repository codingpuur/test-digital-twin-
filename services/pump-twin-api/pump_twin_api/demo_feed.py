from __future__ import annotations

import time
from typing import Any

# Demo pumps run near the best-efficiency point, each a little different.
FLOW_FRACTION = {1: 0.95, 2: 1.0, 3: 1.02, 4: 0.9, 5: 1.05, 6: 0.98, 7: 1.0, 8: 0.93}


def demo_rows(p3: Any, ptb: Any, base: Any, station: str, pumps: list[int]) -> dict[int, dict]:
    """Synthetic readings at the OEM best-efficiency point: for trying the service without data."""
    spec = ptb.SPECS[station]
    q_bep, h_bep, eta = base.curve.Q_bep_m3h, base.curve.H_bep_m, base.curve.eta_bep
    temp, p_suction, volts = 26.0, 1.2, 6600.0
    rho = float(ptb.water_density(temp))
    _, ids = ptb.pipe_area(spec["suction_od_mm"], spec["wall_mm"])
    _, idd = ptb.pipe_area(spec["discharge_od_mm"], spec["wall_mm"])
    dz = (spec["z_discharge_mm"] - spec["z_suction_mm"]) / 1000.0

    lo, hi = 1.0, 40.0
    for _ in range(60):  # discharge pressure that gives the target head under the twin's own formula
        mid = (lo + hi) / 2
        head = float(
            ptb.total_dynamic_head(
                p_suction * 1e5, mid * 1e5, q_bep / 3600, rho, ids, idd, dz,
                spec.get("k_friction_suction", 0.0), spec.get("k_friction_discharge", 0.0),
            )
        )
        lo, hi = (mid, hi) if head < h_bep else (lo, mid)

    p_el = rho * 9.80665 * (q_bep / 3600) * h_bep / eta / 0.96
    amps = p_el / (3**0.5 * volts * 0.88)
    row: dict[str, Any] = dict(
        timestamp=time.strftime("%Y-%m-%d %H:%M:%S"), suction_pressure=p_suction,
        discharge_pressure=round(mid, 3), suction_temperature=temp, discharge_temperature=temp + 0.4,
        flow_rate=q_bep / 3.6, voltage_r=volts, voltage_y=volts + 10, voltage_b=volts - 10,
        frequency=50.0, motor_rpm=float(spec["rpm"]), power=p_el, current_r=amps,
        current_y=amps * 1.005, current_b=amps * 0.995, power_factor_r=0.88, power_factor_y=0.88,
        power_factor_b=0.88, pump_de_vibration=1.8, pump_nde_vibration=1.6, motor_de_vibration=1.1,
        motor_nde_vibration=1.0, pump_de_bearing_temperature=58.0, pump_nde_bearing_temperature=55.0,
        motor_de_bearing_temperature=62.0, motor_nde_bearing_temperature=60.0,
        pump_bde_oil_temperature=52.0, pump_nbde_oil_temperature=50.0,
    )
    for pole in (11, 12, 21, 22, 31, 32):
        row[f"motor_winding_temp_pole_{pole}"] = 86.0 + (pole % 5)

    rows = {}
    for pump in pumps:
        flow = q_bep * FLOW_FRACTION.get(pump, 1.0)
        shifted, _, _ = p3.whatif_row(base, row, {"flow_m3h": flow}, "consistent", "flow_m3h")
        rows[pump] = shifted
    return rows
