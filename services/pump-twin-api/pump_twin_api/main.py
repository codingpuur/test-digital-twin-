from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings
from .routes import health, meta, pumps, whatif
from .runtime import Runtime


def create_app(settings: Settings | None = None, runtime: Runtime | None = None) -> FastAPI:
    """`runtime` is for tests; the service builds its own from the environment."""
    settings = settings or Settings.from_env()
    rt = runtime or Runtime(settings)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if runtime is None:
            rt.start()
        yield

    app = FastAPI(title="Pump twin API", version="1.0.0", lifespan=lifespan)
    app.state.runtime = rt
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware, allow_origins=list(settings.cors_origins),
            allow_methods=["GET", "POST", "PUT"], allow_headers=["content-type", "x-api-key"],
        )
    for module in (health, meta, pumps, whatif):
        app.include_router(module.router)
    return app


app = create_app()
