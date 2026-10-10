"""Turns a raw scenario (twin output) into what a screen shows: deltas, statuses, alarms."""

from __future__ import annotations

from typing import Any

from . import catalog


def kpi_deltas(base: dict, scen: dict) -> list[dict]:
    rows = []
    for spec in catalog.KPIS:
        b, s = base.get(spec.key), scen.get(spec.key)
        if not isinstance(b, (int, float)) or not isinstance(s, (int, float)):
            continue
        change = s - b
        if abs(change) < 10 ** -spec.decimals / 2:
            direction = "same"
        elif spec.better is None:
            direction = "changed"
        else:
            improved = change > 0 if spec.better == "higher" else change < 0
            direction = "improved" if improved else "worse"
        rows.append({
            "key": spec.key, "label": spec.label, "unit": spec.unit, "decimals": spec.decimals,
            "base": b, "value": s, "delta": change, "direction": direction,
        })
    return rows


def component_rows(health_index: dict, why: dict, thresholds: dict) -> list[dict]:
    values = health_index.get("components", {})
    return [
        {
            "key": key, "label": key.capitalize(), "value": values[key],
            "status": catalog.health_status(values[key], thresholds), "why": why.get(key, ""),
        }
        for key in catalog.COMPONENTS if key in values
    ]


def alarm_rows(insights: dict[str, list[dict]], limit: int = 6) -> list[dict]:
    """Findings the operator must see, worst first. The same finding appears under several tabs."""
    seen: set[str] = set()
    rows = []
    for area_findings in insights.values():
        for item in area_findings:
            if item["level"] not in ("act", "watch") or item["finding"] in seen:
                continue
            seen.add(item["finding"])
            rows.append({
                "severity": item["level"], "area": item["area"], "text": item["finding"],
                "recommendation": item["recommendation"],
                "component": catalog.AREA_COMPONENT.get(item["area"]),
            })
    rows.sort(key=lambda r: 0 if r["severity"] == "act" else 1)
    return rows[:limit]


def scenario_view(p3: Any, base: dict, scen: dict) -> dict:
    thresholds = catalog.bands(p3)
    index = scen["health_index"]["index"]
    components = component_rows(scen["health_index"], {k: v["text"] for k, v in scen.get("health_detail", {}).items()}, thresholds)
    worst = min(components, key=lambda c: c["value"])["key"] if components else None
    status = catalog.health_status(index, thresholds)
    return {
        "health": {"index": index, "status": status, "label": catalog.STATUS_LABELS[status],
                   "baseline_index": base["health_index"]["index"]},
        "components": components,
        "worst_component": worst,
        "focus_part": catalog.FOCUS_PART.get(worst) if worst else None,
        "deltas": kpi_deltas(base["kpi"], scen["kpi"]),
        "alarms": alarm_rows(scen.get("insights", {})),
    }
