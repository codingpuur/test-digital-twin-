from __future__ import annotations

import importlib
import sys
import threading
import time
from typing import Any

from .config import Settings
from .demo_feed import demo_rows
from .telemetry.demo import DemoSource
from .telemetry.rows import parse_ts, row_values, to_row
from .telemetry.store import TelemetryStore


class Runtime:
    """The twin, its live readings and the telemetry store. The twin is built by a background thread
    so the API can answer /health while the (slow) 3-D model is prepared."""

    def __init__(self, settings: Settings, store: TelemetryStore | None = None) -> None:
        self.settings = settings
        self.state = "starting"  # starting | building | ready | error
        self.error: str | None = None
        self.p3: Any = None  # pump_3d_twin
        self.ptb: Any = None  # pump_twin_bwssb
        self.feed: Any = None
        self.demo: DemoSource | None = None
        self.store = store or TelemetryStore(settings.db_path)
        self.twins: dict[int, Any] = {}
        self.raw: dict[int, dict] = {}  # the reading each pump's what-if starts from
        self.raw_at: dict[int, float] = {}
        self.poll: dict[int, dict] = {}  # last poll per pump: {"ts": ..., "error": ...}
        self.summary: dict[int, tuple[float, dict]] = {}
        self.baseline: dict[int, tuple[int, dict]] = {}
        self.mesh_json: str | None = None
        # The last twin run of each pump, kept for its 3-D layers: (pump, "baseline" | "scenario").
        self.life: Any = None  # the twin's LifeTracker; only with a source that has history
        self.life_cache: dict[int, tuple[tuple, dict]] = {}
        self.fmea: dict[int, dict] = {}
        self.fmea_running: set[int] = set()
        self.runs: dict[tuple[int, str], Any] = {}
        self.built_s = 0.0
        # The twin mutates shared state while processing (e.g. ambient temperature), as its own
        # server does under a lock, so one scenario runs at a time.
        self.lock = threading.RLock()
        self._stop = threading.Event()

    # --- start-up ---------------------------------------------------------------------------------

    def start(self) -> None:
        threading.Thread(target=self._build, name="twin-build", daemon=True).start()

    def stop(self) -> None:
        self._stop.set()

    def _build(self) -> None:
        cfg = self.settings
        try:
            self.state = "building"
            started = time.time()
            if not cfg.twin_dir.is_dir():
                raise RuntimeError(f"PUMP_TWIN_DIR {cfg.twin_dir} not found")
            sys.path.insert(0, str(cfg.twin_dir))
            self.p3 = p3 = importlib.import_module("pump_3d_twin")
            self.ptb = ptb = importlib.import_module("pump_twin_bwssb")
            count = int(ptb.SYSTEM_CURVES.get(cfg.station, {}).get("pumps_installed", 8))
            pumps = list(range(1, count + 1))

            if cfg.source != "demo":
                self.feed = p3.make_feed(cfg.source, cfg.station, pumps)
                pumps = [p for p in pumps if p in self.feed.pumps] or pumps
            step = p3.site_model_step(cfg.station, p3.HERE, rebuild=False) or str(cfg.twin_dir / "assembly.step")
            base = p3.Pump3DTwin(step, cfg.station, pumps[0], settings={})
            self.twins = {p: base if p == base.pump else p3.twin_for_pump(base, p) for p in pumps}

            if cfg.source == "demo":
                self.demo = DemoSource(demo_rows(p3, ptb, base, cfg.station, pumps))
            now = time.time()
            for pump in pumps:  # the first reading, and some history behind it
                self.backfill(pump, now)
                self.pull_live(pump)
            from . import life as life_service  # imported here: it imports this module

            life_service.start(self, pumps)
            self.built_s = round(time.time() - started, 1)
            self.state = "ready"
            threading.Thread(target=self._poll_loop, name="telemetry-poll", daemon=True).start()
        except Exception as exc:  # reported by /health instead of crashing the process
            self.state = "error"
            self.error = f"{type(exc).__name__}: {exc}"

    # --- telemetry --------------------------------------------------------------------------------

    def apply_reading(self, pump: int, row: dict, ts: float | None = None) -> float:
        """Stores a reading and makes it what the pump's what-if starts from."""
        ts = parse_ts(row.get("timestamp")) if ts is None else ts
        values = row_values(row)
        self.store.append(pump, ts, values)
        with self.lock:
            self.raw[pump], self.raw_at[pump] = to_row(ts, values), ts
            self.summary.pop(pump, None)
        return ts

    def pull_live(self, pump: int) -> None:
        """Reads the pump's current values from the source (demo, iPumpNet or CSV) into the store."""
        try:
            if self.demo is not None:
                now = time.time()
                row = to_row(now, self.demo.values_at(pump, now))
            elif getattr(self.feed, "kind", "") == "api":
                row = self.feed.latest_row(pump, force=True)
            else:
                row = self.feed.latest_row(pump, "last")
            ts = self.apply_reading(pump, row)
            self.poll[pump] = {"ts": ts, "error": None}
        except Exception as exc:  # a broken source must not stop the service
            self.poll[pump] = {"ts": self.poll.get(pump, {}).get("ts"), "error": f"{type(exc).__name__}: {exc}"}

    def backfill(self, pump: int, now: float) -> None:
        hours = self.settings.backfill_hours
        if hours <= 0:
            return
        try:
            if self.demo is not None:
                rows = list(self.demo.history(pump, now - hours * 3600, now, 60.0))
            else:
                rows = self._history_rows(pump, now - hours * 3600)
            self.store.append_many(pump, rows)
        except Exception as exc:
            self.poll[pump] = {"ts": None, "error": f"history: {type(exc).__name__}: {exc}"}

    def _history_rows(self, pump: int, since: float) -> list[tuple[float, dict[str, float]]]:
        """History from iPumpNet or the CSV export (not exercised without a login or a CSV)."""
        frame = self.p3.history_frame(self.feed, self.settings.station, pump, days=max(1, int(self.settings.backfill_hours // 24) + 1))
        rows = []
        for record in frame.to_dict("records"):
            ts = parse_ts(record.get("timestamp"))
            if ts >= since:
                rows.append((ts, row_values(record)))
        return rows

    def _poll_loop(self) -> None:
        while not self._stop.wait(self.settings.poll_interval_s):
            for pump in list(self.twins):
                self.pull_live(pump)
