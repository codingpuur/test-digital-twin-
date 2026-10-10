from __future__ import annotations

import hmac
from typing import Any

from fastapi import Header, HTTPException, Request, Response

from .runtime import Runtime
from .serialize import dumps


def get_runtime(request: Request) -> Runtime:
    return request.app.state.runtime


def require_key(request: Request, x_api_key: str | None = Header(default=None)) -> None:
    expected = get_runtime(request).settings.api_key
    if expected and not hmac.compare_digest(x_api_key or "", expected):
        raise HTTPException(status_code=401, detail="Invalid API key")


def require_ready(request: Request) -> None:
    rt = get_runtime(request)
    if rt.state != "ready":
        raise HTTPException(status_code=503, detail=f"Twin is {rt.state}" + (f": {rt.error}" if rt.error else ""))


def get_pump(pump: int, request: Request) -> int:
    require_ready(request)
    twins = get_runtime(request).twins
    if pump not in twins:
        raise HTTPException(status_code=404, detail=f"Pump {pump} not found; have {sorted(twins)}")
    return pump


def json_response(payload: Any, status: int = 200) -> Response:
    return Response(dumps(payload), status_code=status, media_type="application/json")
