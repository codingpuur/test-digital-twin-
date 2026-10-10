from __future__ import annotations

import hashlib

from fastapi import APIRouter, Depends, Request, Response

from .. import model_parts
from ..deps import get_runtime, json_response, require_key, require_ready
from ..runtime import Runtime

router = APIRouter(prefix="/v1/model", dependencies=[Depends(require_key), Depends(require_ready)])


@router.get("/parts")
def parts(rt: Runtime = Depends(get_runtime)) -> Response:
    return json_response({"parts": model_parts.parts(rt)})


@router.get("/mesh")
def mesh(request: Request, rt: Runtime = Depends(get_runtime)) -> Response:
    """The geometry is large and never changes while the service runs, so it is cached by ETag."""
    if rt.mesh_json is None:
        rt.mesh_json = model_parts.mesh_json(rt)
    etag = '"' + hashlib.sha1(rt.mesh_json.encode()).hexdigest()[:16] + '"'
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag})
    return Response(rt.mesh_json, media_type="application/json", headers={"ETag": etag, "Cache-Control": "private, max-age=3600"})
