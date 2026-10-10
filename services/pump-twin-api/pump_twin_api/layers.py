"""The twin's 3-D result layers (cavitation, stress, thermal ...), one layer per call.

A layer is a value per mesh vertex for each part, quantised to one byte between `lo` and `hi`, so a
layer is a few hundred KB. The values belong to one run of the twin, so they are read from the last
run kept for the pump rather than solved again.
"""

from __future__ import annotations

import base64
from typing import Any

import numpy as np


def _b64(array: Any, dtype: Any) -> str:
    return base64.b64encode(np.ascontiguousarray(np.asarray(array).astype(dtype)).tobytes()).decode()


def index(p3: Any, run: Any) -> list[dict]:
    out = []
    for key in p3.LAYER_ORDER:
        layer = run.layers.get(key)
        if not layer:
            continue
        out.append({
            "key": key, "title": layer["title"], "unit": layer["unit"], "about": layer["about"],
            "lo": float(layer["cmin"]), "hi": float(layer["cmax"]),
            "scale": p3._cs(layer["colorscale"]),
        })
    return out


def detail(p3: Any, run: Any, key: str) -> dict | None:
    layer = run.layers.get(key)
    if not layer:
        return None
    lo, hi = layer["cmin"], layer["cmax"]
    extras = []
    for extra in layer.get("extras", []):
        if extra["kind"] == "mesh":
            extras.append({
                "kind": "mesh", "name": extra["name"],
                "vertices": _b64(extra["V"].ravel(), np.float32), "faces": _b64(extra["F"].ravel(), np.uint32),
                "values": _b64(p3._q8(extra["val"], lo, hi), np.uint8),
            })
        else:
            extras.append({
                "kind": "lines", "name": extra["name"],
                "lines": [{"vertices": _b64(line["V"].ravel(), np.float32), "values": _b64(p3._q8(line["c"], lo, hi), np.uint8)}
                          for line in extra["lines"]],
            })
    return {
        **next(item for item in index(p3, run) if item["key"] == key),
        "values": {str(i): _b64(p3._q8(v, lo, hi), np.uint8) for i, v in layer["values"].items()},
        "opacity": {str(i): float(o) for i, o in layer.get("opacity", {}).items() if o != 1.0},
        "extras": extras,
    }
