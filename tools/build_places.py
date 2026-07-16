#!/usr/bin/env python3
"""Merge geocoded coords + hand-authored categories into site/places.js"""
import json, re

import os
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# name -> category: cafe | bakery | sweets | food | bar
CATS = {
 "Contrada":"food","Harbord Bakery":"bakery","Sleepy Pete's":"cafe","DaiLo":"food",
 "Little Sister Dutch Indonesian":"food","Kiin":"food","The Morning After":"food",
 "Banh Mi Nguyen Huong":"food","Homemade Ramen":"food","Machida Shoten (College St)":"food",
 "Konia Kitchen and Bar":"food","Aura":"food","Black Camel":"food","Krave Coffee":"cafe",
 "Maven Toronto":"cafe","Tre Mari Bakery":"bakery","Flora Lounge":"bar","Fahrenheit Coffee":"cafe",
 "The Local":"bar","MACHINO DONUTS":"sweets","Cocktail Bar":"bar","Soul Chocolate":"sweets",
 "Kasa Moto":"food","Signatures Restaurant":"food","Black wolf coffee":"cafe","Baker and Scone":"bakery",
 "Ethica Coffee Roasters":"cafe","Alder":"food","Renaissance Detroit Style Pizza":"food",
 "Convivium Dining Community":"food","El Pocho Antojitos Bar":"food",
 "The Black Canary Espresso Bar (Sherbourne)":"cafe","Monte Bianco Italian Cuisine and Pizzeria":"food",
 "The Wren":"bar","Forno Cultura":"bakery","Sugo":"food","Carmelitas Restaurant":"food",
 "Souper Hot Pot":"food","Casa Madera":"food","Get Well":"bar","Pizzeria Defina":"food",
 "Boxcar Social Laneway":"cafe","Bar Pompette":"bar","Quanto Basta Restaurant":"food",
 "The Maker Bean Cafe":"cafe","BKookies Cafe":"sweets","Issho Bakery":"bakery","Nabulu Coffee":"cafe",
 "Le Gourmand":"cafe","Som Tum Jinda":"food","Savor Thai Toronto":"food","Pho Linh":"food",
 "Tiny Market Co":"bakery","gram's pizza":"food","Cafe Polonez":"food","Writers Room Bar":"bar",
 "ALMA+GIL":"cafe","FIKA Cafe":"cafe","La Salumeria":"food","PROJECT GIGGLEWATER":"bar",
 "Bar Vendetta":"bar","Grey Tiger":"bar","R&D":"food","Aera":"food","Moments":"cafe",
 "Hastings Snack Bar":"food","Viet Chay Vegan Cuisine":"food","Bloom Cafe":"cafe",
 "NEW RETRO - BASEMENT BAR":"bar","Cabin Fever":"bar","Noctua Bakery":"bakery","Pukka":"food",
 "Hey Noodles":"food","Comal y Canela":"food","Death In Venice Gelato":"sweets",
 "Bricolage Bakery":"bakery","Balam Toronto":"cafe","Viaggio":"food",
 "Lokum Eats - Food by Tradition":"food","Barbershop Patisserie":"bakery","Schmaltz Appetizing":"bakery",
 "Chilliy Pepper TACOS":"food","Mattachioni":"food","Pizzeria Badiali":"food","Casamiento":"food",
 "Bar Poet":"bar","Buvette Pacey":"bar","The Epicure Shop":"food","Tabule Middle Eastern Cuisine":"food",
 "SUPERNOVA Coffee":"cafe","Miznon":"food","Avelo Restaurant":"food","The Mugshot Tavern":"bar",
 "Acute Pizzeria":"food","Koh Lipe Thai Kitchen":"food","Raku":"food","Bar Reyna":"bar",
 "Purple Penguin Cafe":"cafe","Anh Dao Restaurant":"food","Vit Beo":"food","Enoteca Sociale":"food",
 "Kream Dessert":"sweets","Tenon Vegan Sushi":"food","Rorschach Brewing Co.":"bar",
 "Fleur du Jour":"cafe","416 Snack Bar":"food","Bar Isabel":"food","Buk Chang Dong Soon Tofu":"food",
 "Richmond Station":"food","Moss Park Espresso":"cafe","Liu Loqum Atelier":"sweets",
 "Buno Coffee":"cafe","ICHA TEA":"cafe","Soos":"food","Thairoom College":"food",
 "Gonzo Izakaya":"food","Ruru Baked":"sweets",
 "The Nutrition Bar...protein shakes, smoothies, Juices":"cafe","Short Turn":"bar",
 "El Rey Mezcal Bar":"bar","Harry and Heels California Donuts":"sweets","Bad Attitude Bread":"bakery",
 "Kyouka Ramen":"food","Left Field Brewery":"bar","Saigon Lotus":"food",
 "Gushi (Gerrard E x Parliament)":"food","Elm Street Italian Deli":"food","Bevy":"bar",
 "The Bagel House":"bakery","Lait Night":"sweets","Forget Me Not Cafe":"cafe","Momo Ghar":"food",
 "Descendant Detroit Style Pizza":"food","Civil Liberties":"bar","Wasted Youth Bar":"bar",
 "Tsuchi Cafe":"cafe","Old School":"food","Tochal":"sweets",
}
DISPLAY = {
 "The Nutrition Bar...protein shakes, smoothies, Juices":"The Nutrition Bar",
 "Machida Shoten (College St)":"Machida Shoten",
 "The Black Canary Espresso Bar (Sherbourne)":"The Black Canary Espresso Bar",
 "Gushi (Gerrard E x Parliament)":"Gushi",
 "Lokum Eats - Food by Tradition":"Lokum Eats",
 "NEW RETRO - BASEMENT BAR":"New Retro Basement Bar",
 "Monte Bianco Italian Cuisine and Pizzeria":"Monte Bianco",
}
APPROX = {"Signatures Restaurant","Moments","Aura","Gushi (Gerrard E x Parliament)",
          "Lokum Eats - Food by Tradition","Raku","Convivium Dining Community"}
FIXUPS = {"Lokum Eats - Food by Tradition": (43.6656, -79.4692),
          # "416 Snack Bar" lost its prefix in pass 1 and matched the wrong POI — 181 Bathurst St
          "416 Snack Bar": (43.64789, -79.40412),
          # first pass matched the wrong POI; verified home is 181 Dovercourt Rd
          "Pizzeria Badiali": (43.64612, -79.42334)}
RENAMES = {"Snack Bar": "416 Snack Bar"}
# not in the original collection — added for the crawl reveal phases
EXTRA = [
    {"name": "Harry's Charbroiled (Waterworks)", "lat": 43.64673, "lng": -79.39923, "cat": "food"},
    # King West location (Sun 11-6); the Distillery one is far east of the route
    {"name": "SOMA Chocolatemaker", "lat": 43.64517, "lng": -79.39571, "cat": "sweets"},
    # 93A Ossington Ave, Sun 12-11 — ice cream sandwiches
    {"name": "Bang Bang Ice Cream", "lat": 43.64634, "lng": -79.41937, "cat": "sweets"},
    # 759 Dovercourt Rd, Sun 12-11
    {"name": "Mac's Pizza", "lat": 43.66166, "lng": -79.42947, "cat": "food"},
]

def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40]

data = json.load(open(f"{BASE}/tools/geocoded-final.json"))
data += [{"name": e["name"], "lat": e["lat"], "lng": e["lng"], "matched": "EXTRA"} for e in EXTRA]
CATS.update({e["name"]: e["cat"] for e in EXTRA})
DISPLAY["Harry's Charbroiled (Waterworks)"] = "Harry's Charbroiled"
out, seen = [], set()
for r in data:
    name = RENAMES.get(r["name"], r["name"])
    if name in FIXUPS:
        r["lat"], r["lng"] = FIXUPS[name]
    if r.get("lat") is None:
        print("SKIP (no coords):", name); continue
    if name not in CATS:
        print("WARN no category:", name)
    entry = {
        "id": slug(DISPLAY.get(name, name)),
        "name": DISPLAY.get(name, name),
        "lat": round(r["lat"], 5),
        "lng": round(r["lng"], 5),
        "cat": CATS.get(name, "food"),
    }
    if name in APPROX:
        entry["approx"] = True
    if entry["id"] in seen:
        print("DUP id:", entry["id"]); continue
    seen.add(entry["id"])
    out.append(entry)

js = "// generated by tools/build_places.py — all Sunday-open spots + crawl anchors\n"
js += "const PLACES = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n"
open(f"{BASE}/site/places.js", "w").write(js)
print(f"wrote {len(out)} places to site/places.js")
