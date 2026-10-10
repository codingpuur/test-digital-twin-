from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

SOURCES = ("demo", "api", "csv")


@dataclass(frozen=True)
class Settings:
    twin_dir: Path
    station: str = "Tataguni"
    source: str = "demo"
    summary_ttl_s: float = 30.0
    api_key: str = ""
    cors_origins: tuple[str, ...] = ()

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> Settings:
        env = os.environ if env is None else env
        source = env.get("PUMPTWIN_SOURCE", "demo")
        if source not in SOURCES:
            raise ValueError(f"PUMPTWIN_SOURCE must be one of {', '.join(SOURCES)}, got {source!r}")
        default_dir = Path(__file__).resolve().parent.parent / "twin"
        return cls(
            twin_dir=Path(env.get("PUMP_TWIN_DIR", default_dir)).resolve(),
            station=env.get("PUMPTWIN_STATION", "Tataguni"),
            source=source,
            summary_ttl_s=float(env.get("PUMPTWIN_SUMMARY_TTL_S", "30")),
            api_key=env.get("PUMPTWIN_API_KEY", ""),
            cors_origins=tuple(o.strip() for o in env.get("PUMPTWIN_CORS", "").split(",") if o.strip()),
        )
