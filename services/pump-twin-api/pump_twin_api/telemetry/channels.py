"""The signals a pump reports, with labels, units and alarm limits. Status is decided here, not in the screen."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Channel:
    key: str  # the iPumpNet / CSV field name the twin reads
    label: str
    unit: str
    decimals: int
    group: str
    scale: float = 1.0  # stored value * scale = shown value
    limit_key: str | None = None  # key into the twin's HEALTH_LIMITS


CHANNELS: tuple[Channel, ...] = (
    Channel("flow_rate", "Flow (estimated)", "l/s", 0, "Hydraulics"),
    Channel("suction_pressure", "Suction pressure", "bar g", 2, "Hydraulics"),
    Channel("discharge_pressure", "Discharge pressure", "bar g", 2, "Hydraulics"),
    Channel("suction_temperature", "Water temperature", "°C", 1, "Hydraulics"),
    Channel("power", "Motor power", "kW", 0, "Electrical", scale=0.001),
    Channel("frequency", "Supply frequency", "Hz", 2, "Electrical"),
    Channel("motor_rpm", "Motor speed", "rpm", 0, "Electrical"),
    Channel("voltage_r", "Voltage R", "V", 0, "Electrical"),
    Channel("voltage_y", "Voltage Y", "V", 0, "Electrical"),
    Channel("voltage_b", "Voltage B", "V", 0, "Electrical"),
    Channel("current_r", "Current R", "A", 1, "Electrical"),
    Channel("current_y", "Current Y", "A", 1, "Electrical"),
    Channel("current_b", "Current B", "A", 1, "Electrical"),
    Channel("pump_de_vibration", "Pump DE vibration", "mm/s", 2, "Vibration", limit_key="pump_vib"),
    Channel("pump_nde_vibration", "Pump NDE vibration", "mm/s", 2, "Vibration", limit_key="pump_vib"),
    Channel("motor_de_vibration", "Motor DE vibration", "mm/s", 2, "Vibration", limit_key="motor_vib"),
    Channel("motor_nde_vibration", "Motor NDE vibration", "mm/s", 2, "Vibration", limit_key="motor_vib"),
    Channel("pump_de_bearing_temperature", "Pump DE bearing", "°C", 1, "Temperatures", limit_key="pump_brg_alarm"),
    Channel("pump_nde_bearing_temperature", "Pump NDE bearing", "°C", 1, "Temperatures", limit_key="pump_brg_alarm"),
    Channel("motor_de_bearing_temperature", "Motor DE bearing", "°C", 1, "Temperatures", limit_key="motor_brg_alarm"),
    Channel("motor_nde_bearing_temperature", "Motor NDE bearing", "°C", 1, "Temperatures", limit_key="motor_brg_alarm"),
    *[Channel(f"motor_winding_temp_pole_{p}", f"Winding pole {p}", "°C", 1, "Temperatures", limit_key="winding_alarm")
      for p in (11, 12, 21, 22, 31, 32)],
)
CHANNEL_BY_KEY = {c.key: c for c in CHANNELS}


def display_value(channel: Channel, stored: float) -> float:
    return stored * channel.scale


def status_of(channel: Channel, stored: float, limits: dict[str, float]) -> str | None:
    """"act" at or over the alarm limit, "ok" below it, None when the channel has no limit."""
    if channel.limit_key is None or channel.limit_key not in limits:
        return None
    return "act" if display_value(channel, stored) >= limits[channel.limit_key] else "ok"


def limit_of(channel: Channel, limits: dict[str, float]) -> float | None:
    return limits.get(channel.limit_key) if channel.limit_key else None


def catalog(limits: dict[str, float]) -> list[dict]:
    return [
        {"key": c.key, "label": c.label, "unit": c.unit, "decimals": c.decimals, "group": c.group,
         "limit": limit_of(c, limits)}
        for c in CHANNELS
    ]
