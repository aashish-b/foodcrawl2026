#!/usr/bin/env python3
"""Emit tools/curator-sheet.tsv — the full collection organized into reveal phases."""
import json, os, re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(f"{BASE}/site/places.js").read()
places = json.loads(re.search(r"const PLACES = (\[.*\]);", src, re.S).group(1))

# cafes/bakeries/sweets/bars read as golden-hour treats; food defaults to lunch
CAT_PHASE = {"cafe": "predinner", "bakery": "predinner", "sweets": "predinner",
             "bar": "predinner", "food": "lunch"}
DINNER = {
 "contrada","dailo","little-sister-dutch-indonesian","kiin","konia-kitchen-and-bar","aura",
 "kasa-moto","signatures-restaurant","alder","convivium-dining-community",
 "el-pocho-antojitos-bar","monte-bianco","carmelitas-restaurant","souper-hot-pot",
 "casa-madera","quanto-basta-restaurant","r-d","aera","viaggio","casamiento",
 "tabule-middle-eastern-cuisine","avelo-restaurant","koh-lipe-thai-kitchen","raku","vit-beo",
 "enoteca-sociale","tenon-vegan-sushi","416-snack-bar","bar-isabel","richmond-station",
 "soos","thairoom-college","gonzo-izakaya","descendant-detroit-style-pizza","bar-vendetta",
}
LUNCH_OVERRIDE = {"sleepy-pete-s", "schmaltz-appetizing", "the-bagel-house"}
SKIP = {"old-school", "tochal"}  # locked stops, not curatable

DEFAULT_YES = {
 "sugo","pizzeria-badiali","harry-s-charbroiled","saigon-lotus","machida-shoten","miznon",
 "banh-mi-nguyen-huong",
 "death-in-venice-gelato","icha-tea","ruru-baked","civil-liberties","bar-pompette",
 "el-rey-mezcal-bar","project-gigglewater",
 "bar-vendetta",
}

def phase_of(p):
    if p["id"] in DINNER: return "dinner"
    if p["id"] in LUNCH_OVERRIDE: return "lunch"
    return CAT_PHASE[p["cat"]]

rows = []
for ph in ("lunch", "predinner", "dinner"):
    block = [p for p in places if p["id"] not in SKIP and phase_of(p) == ph]
    block.sort(key=lambda p: (p["id"] not in DEFAULT_YES, p["name"].lower()))
    rows += [(ph, p["id"], p["name"], "yes" if p["id"] in DEFAULT_YES else "no") for p in block]

with open(f"{BASE}/tools/curator-sheet.tsv", "w") as f:
    f.write("phase\tid\tname\tshow\n")
    for r in rows:
        f.write("\t".join(r) + "\n")

counts = {ph: sum(1 for r in rows if r[0] == ph) for ph in ("lunch", "predinner", "dinner")}
print(f"wrote {len(rows)} rows -> tools/curator-sheet.tsv  {counts}")
