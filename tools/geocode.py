#!/usr/bin/env python3
"""Geocode the Sunday-open places list via Nominatim (1 req/sec)."""
import json, re, sys, time, urllib.parse, urllib.request

import os
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sunday-open-places.txt")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "geocoded.json")
UA = "foodcrawl2026-personal-project/1.0"
# Toronto bounding box (lon1,lat1,lon2,lat2)
VIEWBOX = "-79.65,43.55,-79.15,43.85"

def clean(name):
    name = re.sub(r"\.\.\..*$", "", name)          # drop trailing "...blah"
    name = re.sub(r"\s*\(([^)]*)\)", r" \1", name)  # unwrap parentheses as hint
    return name.strip()

def query(q):
    url = ("https://nominatim.openstreetmap.org/search?format=json&limit=1"
           "&bounded=1&viewbox=" + VIEWBOX +
           "&q=" + urllib.parse.quote(q))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)

names = []
for line in open(SRC):
    line = line.strip()
    if not line:
        continue
    parts = line.split("\t", 1) if "\t" in line else line.split(None, 1)
    if len(parts) == 2 and parts[0].isdigit():
        line = parts[1].strip()
    if line:
        names.append(line)

results = []
for i, name in enumerate(names):
    q = clean(name) + ", Toronto, Ontario, Canada"
    hit = None
    try:
        rows = query(q)
        if rows:
            r0 = rows[0]
            hit = {"lat": float(r0["lat"]), "lng": float(r0["lon"]),
                   "matched": r0.get("display_name", "")}
    except Exception as e:
        hit = None
        print(f"ERR {name}: {e}", file=sys.stderr)
    results.append({"name": name, **(hit or {"lat": None, "lng": None, "matched": None})})
    status = "ok " if hit else "MISS"
    print(f"[{i+1}/{len(names)}] {status} {name}", flush=True)
    time.sleep(1.1)

json.dump(results, open(OUT, "w"), indent=1, ensure_ascii=False)
misses = [r["name"] for r in results if r["lat"] is None]
print(f"\nDone. {len(results)-len(misses)}/{len(results)} geocoded. Misses: {json.dumps(misses)}")
