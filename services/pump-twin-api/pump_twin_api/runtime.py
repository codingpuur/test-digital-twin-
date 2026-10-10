from __future__ import annotations

import importlib
import sys
import threading
import time
from typing import Any

from .config import Settings
from .demo_feed import demo_rows


class Runtime:
    """The twin and the readings it works on. Built by a background thread so the API can answer
    /health while the (slow) 3-D model is prepared."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.state = "starting"  # starting | building | ready | error
        self.error: str | None = None
        self.p3: Any = None  # pump_3d_twin
        self.ptb: Any = None  # pump_twin_bwssb
        self.feed: Any = None
        self.twins: dict[int, Any] = {}
        self.raw: dict[int, dict] = {}
        self.raw_at: dict[int, float] = {}
        self.pinned: set[int] = set()
        self.summary: dict[int, tuple[float, dict]] = {}
        self.baseline: dict[int, tuple[int, dict]] = {}
        self.built_s = 0.0
        # The twin mutates shared state while processing (e.g. ambient temperature), as its own
        # server does under a lock, so one scenario runs at a time.
        self.lock = threading.RLock()

    def start(self) -> None:
        threading.Thread(target=self._build, name="twin-build", daemon=True).start()

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
                self.raw = demo_rows(p3, ptb, base, cfg.station, pumps)
            else:
                for pump in pumps:
                    self.raw[pump] = self.feed.latest_row(pump)
            self.raw_at = {p: time.time() for p in self.raw}
            self.built_s = round(time.time() - started, 1)
            self.state = "ready"
        except Exception as exc:  # reported by /health instead of crashing the process
            self.state = "error"
            self.error = f"{type(exc).__name__}: {exc}"

    def refresh(self, pump: int, force: bool = False) -> None:
        """Re-reads the live row from the source (never for a demo or a pinned reading)."""
        if self.settings.source == "demo" or pump in self.pinned or self.feed is None:
            return
        if force or time.time() - self.raw_at.get(pump, 0) > self.settings.summary_ttl_s:
            if getattr(self.feed, "kind", "") == "api":
                row = self.feed.latest_row(pump, force=True)
            else:
                row = self.feed.latest_row(pump, "last")
            self.raw[pump], self.raw_at[pump] = row, time.time()

    def pin(self, pump: int, row: dict) -> None:
        """Uses `row` (iPumpNet field names) as the pump's current state until the service restarts."""
        with self.lock:
            self.raw[pump], self.raw_at[pump] = row, time.time()
            self.pinned.add(pump)
            self.summary.pop(pump, None)
            self.baseline.pop(pump, None)
