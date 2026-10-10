import json

import numpy as np

from pump_twin_api.serialize import dumps


def test_numpy_values_and_non_finite_numbers_become_plain_json():
    text = dumps({"a": np.float64(1.5), "b": np.array([1, 2]), "c": float("nan"), "d": np.bool_(True), "e": (1, 2)})
    assert json.loads(text) == {"a": 1.5, "b": [1, 2], "c": None, "d": True, "e": [1, 2]}
