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
print("all checks passed")
