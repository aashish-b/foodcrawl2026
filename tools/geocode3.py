#!/usr/bin/env python3
"""Final pass: apply web-verified addresses, add Old School + Tochal, emit final JSON."""
import json, time, urllib.parse, urllib.request

import os
BASE = os.path.dirname(os.path.abspath(__file__))
UA = "foodcrawl2026-personal-project/1.0"

VERIFIED = {
    "Machida Shoten (College St)": "326 College Street, Toronto",
    "Soul Chocolate": "20 Wagstaff Drive, Toronto",
    "Ruru Baked": "659 Lansdowne Avenue, Toronto",
    "Tsuchi Cafe": "688 College Street, Toronto",
    "ALMA+GIL": "1543 Dupont Street, Toronto",
    "Renaissance Detroit Style Pizza": "809 Dundas Street West, Toronto",
    "Monte Bianco Italian Cuisine and Pizzeria": "1201 Bloor Street West, Toronto",
    "NEW RETRO - BASEMENT BAR": "193 Carlton Street, Toronto",
    "Lokum Eats - Food by Tradition": "23 St Johns Road, Toronto",
    "Harry and Heels California Donuts": "832 Dundas Street West, Toronto",
    "Wasted Youth Bar": "1185 Dundas Street West, Toronto",
    "Flora Lounge": "550 Wellington Street West, Toronto",
    "Savor Thai Toronto": "1226 St Clair Avenue West, Toronto",
    "Tiny Market Co": "938 Bathurst Street, Toronto",
    "PROJECT GIGGLEWATER": "1369 Dundas Street West, Toronto",
    "Aera": "8 Spadina Avenue, Toronto",
    "Koh Lipe Thai Kitchen": "35 Baldwin Street, Toronto",
    "Buno Coffee": "1048 Queen Street West, Toronto",
    "Short Turn": "576 Queen Street West, Toronto",
    "Lait Night": "81 Huron Street, Toronto",
    "Kream Dessert": "526 Yonge Street, Toronto",
    "Miznon": "1235 Bay Street, Toronto",
}
NEW_PLACES = {
    "Old School": "800 Dundas Street West, Toronto",
    "Tochal": "1269 Dundas Street West, Toronto",
}
HARDCODED = {
    # Gerrard St E x Parliament St intersection (user-supplied cross-street)
    "Gushi (Gerrard E x Parliament)": (43.6633, -79.3656, "HARD: Gerrard x Parliament"),
}

def nominatim(q):
    url = ("https://nominatim.openstreetmap.org/search?format=json&limit=1&q="
           + urllib.parse.quote(q))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        rows = json.load(r)
    if rows:
        return float(rows[0]["lat"]), float(rows[0]["lon"]), rows[0].get("display_name", "")
    return None

data = json.load(open(f"{BASE}/geocoded2.json"))
byname = {r["name"]: r for r in data}

for name, addr in {**VERIFIED, **NEW_PLACES}.items():
    try:
        hit = nominatim(addr)
    except Exception as e:
        print("ERR", name, e); hit = None
    time.sleep(1.1)
    if not hit:
        print(f"MISS {name} ({addr})")
        continue
    r = byname.get(name)
    if r is None:
        r = {"name": name}
        data.append(r)
        byname[name] = r
    r["lat"], r["lng"], r["matched"] = hit[0], hit[1], "VERIFIED: " + addr
    print(f"ok {name} -> {hit[0]:.5f},{hit[1]:.5f}")

for name, (lat, lng, note) in HARDCODED.items():
    r = byname[name]
    r["lat"], r["lng"], r["matched"] = lat, lng, note
    print(f"ok {name} (hardcoded)")

json.dump(data, open(f"{BASE}/geocoded-final.json", "w"), indent=1, ensure_ascii=False)
missing = [r["name"] for r in data if r.get("lat") is None]
print(f"\n{len(data)-len(missing)}/{len(data)} final. Missing: {missing}")
