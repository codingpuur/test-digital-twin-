from __future__ import annotations

import json
import math
from typing import Any


def to_jsonable(value: Any) -> Any:
    """Plain Python for JSON: numpy values become numbers or lists, NaN and infinity become null."""
    if isinstance(value, dict):
        return {str(k): to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_jsonable(v) for v in value]
    if hasattr(value, "tolist"):  # numpy array or scalar
        return to_jsonable(value.tolist())
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if value is None or isinstance(value, (bool, int, str)):
        return value
    return str(value)


def dumps(value: Any) -> str:
    return json.dumps(to_jsonable(value), allow_nan=False)
