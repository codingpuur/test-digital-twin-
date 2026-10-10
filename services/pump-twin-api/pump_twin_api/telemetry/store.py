"""Time-series store for readings. SQLite here; the same four methods can sit on Postgres or Timescale."""

from __future__ import annotations

import sqlite3
import threading
from pathlib import Path


class TelemetryStore:
    def __init__(self, path: str = ":memory:") -> None:
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(path, check_same_thread=False)
        self._lock = threading.Lock()
        with self._lock:
            self._db.execute(
                "CREATE TABLE IF NOT EXISTS readings ("
                "pump INTEGER NOT NULL, channel TEXT NOT NULL, ts REAL NOT NULL, value REAL NOT NULL, "
                "PRIMARY KEY (pump, channel, ts))"
            )
            self._db.commit()

    def append(self, pump: int, ts: float, values: dict[str, float]) -> None:
        """Stores one reading (a set of channels at one time). Same pump, channel and time replaces."""
        self.append_many(pump, [(ts, values)])

    def append_many(self, pump: int, rows: list[tuple[float, dict[str, float]]]) -> None:
        records = [(pump, channel, ts, value) for ts, values in rows for channel, value in values.items()]
        with self._lock:
            self._db.executemany("INSERT OR REPLACE INTO readings VALUES (?, ?, ?, ?)", records)
            self._db.commit()

    def latest(self, pump: int) -> tuple[float, dict[str, float]] | None:
        with self._lock:
            row = self._db.execute("SELECT MAX(ts) FROM readings WHERE pump = ?", (pump,)).fetchone()
            if not row or row[0] is None:
                return None
            ts = row[0]
            values = dict(self._db.execute("SELECT channel, value FROM readings WHERE pump = ? AND ts = ?", (pump, ts)).fetchall())
        return ts, values

    def history(self, pump: int, channels: list[str], t0: float, t1: float, step_s: float) -> dict[str, list[tuple[float, float]]]:
        """Mean value per `step_s` bucket, oldest first, for each channel."""
        step_s = max(float(step_s), 1.0)
        out: dict[str, list[tuple[float, float]]] = {}
        with self._lock:
            for channel in channels:
                rows = self._db.execute(
                    "SELECT CAST(ts / ? AS INTEGER) * ? AS bucket, AVG(value) FROM readings "
                    "WHERE pump = ? AND channel = ? AND ts BETWEEN ? AND ? GROUP BY bucket ORDER BY bucket",
                    (step_s, step_s, pump, channel, t0, t1),
                ).fetchall()
                out[channel] = [(float(ts), float(value)) for ts, value in rows]
        return out

    def count(self) -> int:
        with self._lock:
            return self._db.execute("SELECT COUNT(*) FROM readings").fetchone()[0]

    def span(self, pump: int) -> tuple[float, float] | None:
        with self._lock:
            row = self._db.execute("SELECT MIN(ts), MAX(ts) FROM readings WHERE pump = ?", (pump,)).fetchone()
        return (row[0], row[1]) if row and row[0] is not None else None
