from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class WhatIfRequest(BaseModel):
    mode: Literal["consistent", "raw"] = "consistent"
    driver: Literal["head_m", "flow_m3h", "power_kw"] = "head_m"
    vfd: bool = False
    over: dict[str, float | None] = Field(default_factory=dict)
    faults: dict[str, float] = Field(default_factory=dict)
