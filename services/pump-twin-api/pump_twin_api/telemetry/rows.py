"""Converting between a reading row (iPumpNet field names, as the twin reads it) and stored values."""

from __future__ import annotations

import math
import time
from datetime import datetime, timezone
from typing import Any


def parse_ts(value: Any, default: float | None = None) -> float:
    """Epoch seconds from an epoch number or an ISO-like string. A time without a zone is read as UTC."""
    if value in (None, ""):
        return time.time() if default is None else default
    if isinstance(value, (int, float)):
        return float(value) / 1000 if value > 1e11 else float(value)
    text = str(value).strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        import pandas as pd  # the twin already needs it; handles other date formats

        parsed = pd.to_datetime(text, utc=True).to_pydatetime()
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.timestamp()


def row_values(row: dict[str, Any]) -> dict[str, float]:
    """The numeric fields of a row. Missing, text and non-finite values are dropped."""
    out: dict[str, float] = {}
    for key, value in row.items():
        if key == "timestamp" or isinstance(value, bool):
            continue
        try:
            number = float(value)
        except (TypeError, ValueError):
            continue
        if math.isfinite(number):
            out[key] = number
    return out


def to_row(ts: float, values: dict[str, float]) -> dict[str, Any]:
    return {"timestamp": datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d %H:%M:%S"), **values}
