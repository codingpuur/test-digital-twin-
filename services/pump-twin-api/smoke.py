"""Calls a running service and checks the main endpoints. Usage: python smoke_test.py [base_url]"""

import sys
import time

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8100"
KEY = {"x-api-key": sys.argv[2]} if len(sys.argv) > 2 else {}


def check(name: str, ok: bool, detail: str = "") -> None:
    print(("PASS " if ok else "FAIL ") + name + (f"  {detail}" if detail else ""))
    if not ok:
        raise SystemExit(1)


with httpx.Client(base_url=BASE, timeout=60, headers=KEY) as client:
    for _ in range(120):  # the twin takes about 100 s to build
        health = client.get("/health").json()
        if health["state"] in ("ready", "error"):
            break
        time.sleep(3)
    check("health ready", health["state"] == "ready", str(health))

    meta = client.get("/v1/meta").json()
    check("meta fields and faults", len(meta["fields"]) >= 8 and len(meta["faults"]) == 14)

    pumps = client.get("/v1/pumps").json()["pumps"]
    check("8 pumps listed", len(pumps) == 8, str([p["pump"] for p in pumps]))

    defaults = client.get("/v1/pumps/6/whatif/defaults").json()
    check("defaults", "flow_m3h" in defaults["defaults"] and "head_m" in defaults["ranges"])

    base = {"mode": "consistent", "driver": "head_m", "over": {"head_m": 120.0}, "faults": {}}
    ok = client.post("/v1/pumps/6/whatif", json=base)
    body = ok.json()
    check("whatif solves flow from head", ok.status_code == 200 and body["solved"]["head_m"] == 120.0,
          f"flow {body['solved']['flow_m3h']:.0f} m3/h in {body['ms']} ms")
    check("reply is slim", len(ok.content) < 200_000, f"{len(ok.content) / 1024:.0f} KB")

    worn = client.post("/v1/pumps/6/whatif", json={**base, "faults": {"impeller_wear": 0.5}}).json()
    eff0, eff1 = body["scenario"]["kpi"]["pump_eff_pct"], worn["scenario"]["kpi"]["pump_eff_pct"]
    check("impeller wear lowers efficiency", eff1 < eff0, f"{eff0:.1f} % -> {eff1:.1f} %")

    out_of_range = client.post("/v1/pumps/6/whatif", json={**base, "over": {"head_m": 900.0}})
    check("out-of-range input is rejected", out_of_range.status_code == 422, out_of_range.text[:120])

    bad_fault = client.post("/v1/pumps/6/whatif", json={**base, "faults": {"nope": 1}})
    check("unknown fault is rejected", bad_fault.status_code == 422)

    missing = client.get("/v1/pumps/99/whatif/defaults")
    check("unknown pump is 404", missing.status_code == 404)

    meta2 = client.get("/v1/meta").json()
    check("business rules in meta", meta2["bands"] == {"ok": 70, "act": 35} and len(meta2["kpis"]) >= 10 and meta2["components"][0] == "impeller")

    mis = client.post("/v1/pumps/6/whatif", json={**base, "driver": "flow_m3h", "over": {}, "faults": {"misalignment": 1.0}}).json()
    view = mis["view"]
    check("what-if view: status, alarms, focus", view["health"]["status"] == "act" and view["alarms"] and view["focus_part"],
          f"index {view['health']['baseline_index']} -> {view['health']['index']}, worst {view['worst_component']}, focus {view['focus_part']}")
    check("what-if view: deltas say worse", any(d["direction"] == "worse" for d in view["deltas"]))

    parts = client.get("/v1/model/parts").json()["parts"]
    check("30 CAD parts with components", len(parts) == 30 and sum(1 for p in parts if p["component"]) >= 20, str(len(parts)))
    mesh = client.get("/v1/model/mesh")
    check("mesh served with ETag", mesh.status_code == 200 and len(mesh.json()["parts"]) == 30, f"{len(mesh.content) / 1e6:.1f} MB")
    check("mesh cached by ETag", client.get("/v1/model/mesh", headers={"if-none-match": mesh.headers["etag"]}).status_code == 304)

    latest = client.get("/v1/pumps/6/telemetry/latest").json()
    check("telemetry latest", len(latest["readings"]) >= 20 and latest["age_s"] < 120, f"{len(latest['readings'])} channels, {latest['age_s']} s old")
    power = next(r for r in latest["readings"] if r["channel"] == "power")
    check("power shown in kW", power["unit"] == "kW" and 500 < power["value"] < 1200, f"{power['value']:.0f} kW")
    hist = client.get("/v1/pumps/6/telemetry/history", params={"channel": ["pump_de_vibration", "power"], "from": time.time() - 3 * 3600, "step_s": 300}).json()
    points = hist["series"][0]["points"]
    check("telemetry history (backfilled)", len(points) >= 30 and hist["series"][0]["limit"] == 4.5, f"{len(points)} points")

    station = client.post("/v1/station/simulation/run", json={"scenario": "storm", "duration_s": 3600, "step_s": 10}).json()
    check("station simulation in the backend", len(station["series"]["t"]) == 361 and any("started" in e["text"] for e in station["events"]))

    before = client.get("/v1/pumps/6/telemetry/latest").json()["ts"]
    time.sleep(8)
    after = client.get("/v1/pumps/6/telemetry/latest").json()["ts"]
    check("poller keeps adding readings", after > before, f"{after - before:.0f} s later")
print("all checks passed")
