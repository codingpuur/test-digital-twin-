"""The pump's 3-D model as served to the screen: parts with their health component, and the geometry."""

from __future__ import annotations

import base64
import json
from typing import Any

import numpy as np

from . import catalog


def parts(rt: Any) -> list[dict]:
    twin = next(iter(rt.twins.values()))
    out = []
    for p in twin.rparts:
        component = catalog.component_of_role(p.role)
        out.append({
            "name": p.name, "role": p.role, "sub": p.sub or None, "component": component,
            "focus": component is not None and catalog.FOCUS_PART.get(component) == p.name,
        })
    return out


def mesh_json(rt: Any) -> str:
    """Positions (float32) and faces (uint32) per part, base64. Z is up; the shaft runs along X."""
    twin = next(iter(rt.twins.values()))
    payload = []
    for p, meta in zip(twin.rparts, parts(rt)):
        payload.append({
            **meta,
            "vertices": base64.b64encode(np.ascontiguousarray(p.V, dtype=np.float32).tobytes()).decode(),
            "faces": base64.b64encode(np.ascontiguousarray(p.F, dtype=np.uint32).tobytes()).decode(),
        })
    return json.dumps({"up": "z", "axis": "x", "unit": "m", "parts": payload}, separators=(",", ":"))
