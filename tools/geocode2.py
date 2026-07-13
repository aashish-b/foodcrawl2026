#!/usr/bin/env python3
"""Second pass: fix misses/bad matches via known addresses (Nominatim) + fuzzy Photon."""
import json, time, urllib.parse, urllib.request

import os
BASE = os.path.dirname(os.path.abspath(__file__))
UA = "foodcrawl2026-personal-project/1.0"

# Known street addresses (from research/knowledge) — geocode these directly.
ADDRESSES = {
    "DaiLo": "503 College Street, Toronto",
    "Bar Isabel": "797 College Street, Toronto",
    "Enoteca Sociale": "1288 Dundas Street West, Toronto",
    "Tabule Middle Eastern Cuisine": "2009 Yonge Street, Toronto",
    "Little Sister Dutch Indonesian": "2031 Yonge Street, Toronto",
    "Kasa Moto": "115 Yorkville Avenue, Toronto",
    "Casa Madera": "550 Wellington Street West, Toronto",
    "Bar Poet": "1090 Queen Street West, Toronto",
    "Bar Reyna": "158 Cumberland Street, Toronto",
    "Rorschach Brewing Co.": "1001 Eastern Avenue, Toronto",
    "Descendant Detroit Style Pizza": "1168 Queen Street East, Toronto",
    "El Rey Mezcal Bar": "2A Kensington Avenue, Toronto",
    "Writers Room Bar": "106 Broadview Avenue, Toronto",
    "Gushi (Gerrard E x Parliament)": "Gerrard Street East at Parliament Street, Toronto",
    # corrections of wrong first-pass matches
    "Kiin": "326 Adelaide Street West, Toronto",
    "Alder": "51 Camden Street, Toronto",
    "Forno Cultura": "609 King Street West, Toronto",
    "Cocktail Bar": "923 Dundas Street West, Toronto",
    "416 Snack Bar": "181 Bathurst Street, Toronto",
}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)

def nominatim(q):
    url = ("https://nominatim.openstreetmap.org/search?format=json&limit=1&q="
           + urllib.parse.quote(q))
    rows = fetch(url)
    if rows:
        return float(rows[0]["lat"]), float(rows[0]["lon"]), rows[0].get("display_name", "")
    return None

def photon(q):
    # bias to downtown Toronto
    url = ("https://photon.komoot.io/api/?limit=1&lat=43.655&lon=-79.41&q="
           + urllib.parse.quote(q + " Toronto"))
    rows = fetch(url).get("features", [])
    if rows:
        f = rows[0]
        lon, lat = f["geometry"]["coordinates"]
        p = f.get("properties", {})
        # reject results far outside the GTA
        if not (43.4 < lat < 44.0 and -80.0 < lon < -78.9):
            return None
        label = ", ".join(str(p.get(k)) for k in ("name", "housenumber", "street", "city") if p.get(k))
        return lat, lon, label
    return None

data = json.load(open(f"{BASE}/geocoded.json"))
for r in data:
    name = r["name"]
    if name in ADDRESSES:
        try:
            hit = nominatim(ADDRESSES[name])
            time.sleep(1.1)
        except Exception as e:
            print("ERR", name, e); hit = None
        if hit:
            r["lat"], r["lng"], r["matched"] = hit[0], hit[1], "ADDR: " + hit[2]
            print(f"ADDR ok   {name} -> {hit[2][:70]}")
        else:
            print(f"ADDR MISS {name}")
    elif r["lat"] is None:
        try:
            hit = photon(name.split("...")[0].replace("(", "").replace(")", ""))
            time.sleep(0.4)
        except Exception as e:
            print("ERR", name, e); hit = None
        if hit:
            r["lat"], r["lng"], r["matched"] = hit[0], hit[1], "PHOTON: " + hit[2]
            print(f"PHOT ok   {name} -> {hit[2][:70]}")
        else:
            print(f"STILL MISS {name}")

json.dump(data, open(f"{BASE}/geocoded2.json", "w"), indent=1, ensure_ascii=False)
misses = [r["name"] for r in data if r["lat"] is None]
print(f"\n{len(data)-len(misses)}/{len(data)} resolved. Still missing: {json.dumps(misses)}")
