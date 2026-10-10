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
    fmea_ttl_s: float = 600.0
    api_key: str = ""
    cors_origins: tuple[str, ...] = ()
    life_dir: Path = Path("data/state_life")  # the degradation record the twin keeps per pump
    db_path: str = "data/telemetry.sqlite3"  # ":memory:" for tests
    poll_interval_s: float = 30.0  # how often the live source is read into the store
    backfill_hours: float = 6.0  # history made or fetched at start-up

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
            fmea_ttl_s=float(env.get("PUMPTWIN_FMEA_TTL_S", "600")),
            api_key=env.get("PUMPTWIN_API_KEY", ""),
            cors_origins=tuple(o.strip() for o in env.get("PUMPTWIN_CORS", "").split(",") if o.strip()),
            life_dir=Path(env.get("PUMPTWIN_LIFE_DIR", "data/state_life")),
            db_path=env.get("PUMPTWIN_DB", "data/telemetry.sqlite3"),
            poll_interval_s=float(env.get("PUMPTWIN_POLL_S", "30")),
            backfill_hours=float(env.get("PUMPTWIN_BACKFILL_H", "6")),
        )
