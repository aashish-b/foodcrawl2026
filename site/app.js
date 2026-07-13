/* ── The Toronto Crawl · July 19, 2026 ─────────────────────────────
   Vanilla JS. State in localStorage. Map: Leaflet + Carto Voyager.  */
"use strict";

/* ---------- itinerary ---------- */
const CRAWL = [
  { leg: 1, label: "first light · brunch", when: "11:00 am", locked: true, options: [{
      id: "old-school",
      note: "All-day brunch HQ — Blueberry Hill pancakes, chicken & waffles, big sunny diner energy.",
      hours: "sun 9 am – 5 pm",
      reso: { level: "consider", text: "bookable on OpenTable — smart for 4" },
    }]},
  { leg: 2, label: "a little detour · persian treat", when: "~12:45 pm", locked: true, options: [{
      id: "tochal",
      note: "Persian juice & ice-cream bar — saffron soft-serve, rosewater, fresh juice. A quick sweet detour.",
      hours: "sun 11 am – 9 pm",
      reso: { level: "walkin", text: "walk right in" },
    }]},
  { leg: 3, label: "the official lunch", when: "~1:30 pm", options: [
    { id: "sugo",
      note: "Riotous red-sauce Italian-American — the eggplant parm of legend. Cash or debit only!",
      hours: "sun 11:30 am – 9 pm",
      reso: { level: "walkin", text: "no reservations — go early-ish" } },
    { id: "saigon-lotus",
      note: "Michelin Bib Gourmand vegan Vietnamese tucked into Kensington — lotus rolls, vegan phở.",
      hours: "sun 11 am – 10 pm",
      reso: { level: "walkin", text: "walk-in" } },
  ]},
  { leg: 4, label: "golden afternoon · something sweet", when: "~3:30 pm", options: [
    { id: "death-in-venice-gelato",
      note: "Mad-genius gelato lab — olive oil & sea salt, truffle maple sage — plus proper espresso.",
      hours: "sun 9 am – 9 pm",
      reso: { level: "walkin", text: "walk-in" } },
    { id: "bricolage-bakery",
      note: "Korean-French bakes — the double-baked almond croissant is the one.",
      hours: "sun 8:30 am – 3 pm",
      reso: { level: "walkin", text: "walk-in" },
      warn: "closes 3 pm — visit before, or swap" },
  ]},
  { leg: 5, label: "blue hour · a proper drink", when: "~6:00 pm", options: [
    { id: "civil-liberties",
      note: "No menu at all — name a mood and they build your cocktail. Top-50 bar in North America.",
      hours: "sun 6 pm – 2 am",
      reso: { level: "walkin", text: "walk-in only" } },
    { id: "bar-pompette",
      note: "French cocktail royalty (World's 50 Best) — and live jazz on Sunday nights.",
      hours: "sun 6 pm – midnight",
      reso: { level: "walkin", text: "walk-in only" } },
  ]},
  { leg: 6, label: "lantern light · dinner", when: "~7:30 pm", options: [
    { id: "bar-isabel",
      note: "Candlelit Spanish tavern — pan con tomate, wild mushrooms, the good vermouth.",
      hours: "sun 5 pm – 11 pm",
      reso: { level: "reserve", text: "reserve ahead ✎ barisabel.com" } },
    { id: "dailo",
      note: "Nick Liu's French-Asian — Big Mac bao, fried watermelon, dan dan everything.",
      hours: "sun 5 pm – 11 pm",
      reso: { level: "reserve", text: "reserve ahead ✎ OpenTable / 647-341-8882" } },
  ]},
];

const CAT_ICON = { cafe: "☕", bakery: "🥐", sweets: "🍧", food: "🍜", bar: "🍸" };
const CAT_NAME = { cafe: "café", bakery: "bakery", sweets: "sweets", food: "restaurant", bar: "bar" };

/* ---------- state ---------- */
const KEY = "crawl-2026-07-19";
const byId = Object.fromEntries(PLACES.map(p => [p.id, p]));
let state = { visited: {}, picks: {}, history: [] };
try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
const save = () => localStorage.setItem(KEY, JSON.stringify(state));

const pickOf = leg => state.picks[leg.leg] || leg.options[0].id;
const legDone = leg => !!state.visited[pickOf(leg)];
const plannedStops = () => CRAWL.map(l => byId[pickOf(l)]);
const nextLeg = () => CRAWL.find(l => !legDone(l)) || null;

/* ---------- helpers ---------- */
const $ = sel => document.querySelector(sel);
function dist(a, b) { // haversine, metres
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const fmtDist = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
const gmaps = p => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`;
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* ---------- header: crew + stamps ---------- */
const CREW_COLORS = ["#f2b28c", "#a8cfe0", "#b9d4a7", "#d8b4d0"];
$("#crew").innerHTML = CREW_COLORS.map(c => `
  <svg viewBox="0 0 40 40"><circle cx="20" cy="22" r="15" fill="${c}" stroke="#4a3f35" stroke-width="2"/>
  <circle cx="14.5" cy="20" r="1.8" fill="#4a3f35"/><circle cx="25.5" cy="20" r="1.8" fill="#4a3f35"/>
  <path d="M16 26 q4 3.4 8 0" stroke="#4a3f35" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>`).join("");

function renderHeader() {
  const done = CRAWL.filter(legDone).length;
  $("#stamps").innerHTML = CRAWL.map(l =>
    `<span class="stamp-dot ${legDone(l) ? "done" : ""}">☀</span>`).join("");
  $("#stamps-label").textContent =
    done === 0 ? "the adventure awaits…" :
    done === CRAWL.length ? "all six stamps — what a day ☀" :
    `${done} of ${CRAWL.length} stamps collected`;
}

/* ---------- itinerary ---------- */
function renderItinerary() {
  const planned = plannedStops();
  $("#itinerary").innerHTML = CRAWL.map((leg, i) => {
    const pickedId = pickOf(leg);
    const fromPrev = i > 0
      ? fmtDist(dist(planned[i - 1], planned[i])) + " from last stop" : "";
    const cards = leg.options.map(opt => {
      const p = byId[opt.id];
      const isPick = opt.id === pickedId;
      const isVisited = !!state.visited[opt.id];
      const resoBadge = opt.reso.level === "reserve"
        ? `<span class="badge b-reso">${esc(opt.reso.text)}</span>`
        : `<span class="badge b-walkin">${esc(opt.reso.text)}</span>`;
      return `
      <div class="card ${isPick ? "" : "alt"} ${isVisited ? "visited" : ""}" data-id="${opt.id}">
        ${isPick && leg.locked && !isVisited ? `<div class="pick-flag">the plan ☀</div>` : ""}
        ${isVisited ? `<div class="visited-stamp">visited! ☀</div>` : ""}
        <h3>${esc(p.name)}</h3>
        <p class="note">${esc(opt.note)}</p>
        <div class="badges">
          <span class="badge b-hours">${esc(opt.hours)}</span>
          ${resoBadge}
          ${opt.warn ? `<span class="badge b-warn">⚠ ${esc(opt.warn)}</span>` : ""}
          ${isPick && fromPrev ? `<span class="badge b-dist">${fromPrev}</span>` : ""}
        </div>
        <div class="card-actions">
          <button class="btn btn-stamp" data-visit="${opt.id}">
            ${isVisited ? "↺ un-stamp" : "☀ stamp it — we were here!"}</button>
          <a class="btn btn-maps" target="_blank" rel="noopener" href="${gmaps(p)}">⛯ take me there</a>
          ${!isPick && !leg.locked ? `<button class="btn btn-pick" data-pick="${leg.leg}:${opt.id}">make this the plan</button>` : ""}
        </div>
      </div>`;
    }).join("");
    return `
    <div class="stop-label"><span>stop ${["one","two","three","four","five","six"][i]} · ${esc(leg.label)}</span>
      <span class="when">${leg.when}</span></div>
    ${cards}`;
  }).join("");
}

function sparkle(card) {
  for (let i = 0; i < 6; i++) {
    const s = document.createElement("span");
    s.className = "sparkle-burst";
    s.textContent = "✦";
    s.style.left = 20 + Math.random() * 60 + "%";
    s.style.top = "40%";
    s.style.setProperty("--dx", (Math.random() * 90 - 45) + "px");
    s.style.setProperty("--dy", (-30 - Math.random() * 50) + "px");
    card.appendChild(s);
    setTimeout(() => s.remove(), 850);
  }
}

$("#itinerary").addEventListener("click", e => {
  const visitBtn = e.target.closest("[data-visit]");
  const pickBtn = e.target.closest("[data-pick]");
  if (visitBtn) {
    const id = visitBtn.dataset.visit;
    const nowVisited = !state.visited[id];
    if (nowVisited) {
      state.visited[id] = true;
      state.history = state.history.filter(h => h !== id).concat(id);
      sparkle(visitBtn.closest(".card"));
      const crew = $("#crew");
      crew.classList.remove("cheer"); void crew.offsetWidth; crew.classList.add("cheer");
    } else {
      delete state.visited[id];
      state.history = state.history.filter(h => h !== id);
    }
    save(); refresh({ keepScroll: true });
  } else if (pickBtn) {
    const [legNo, id] = pickBtn.dataset.pick.split(":");
    state.picks[legNo] = id;
    save(); refresh({ keepScroll: true });
  }
});

/* ---------- map ---------- */
const map = L.map("map", { zoomControl: true, attributionControl: true, tap: false });
L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  maxZoom: 19,
}).addTo(map);
map.fitBounds(L.latLngBounds(plannedStops().map(p => [p.lat, p.lng])).pad(0.18));

const routeLayer = L.layerGroup().addTo(map);
const collectionLayer = L.layerGroup().addTo(map);

function popupHtml(p, extra) {
  return `<b>${esc(p.name)}</b><br>
    <span style="color:#a08c72">${CAT_ICON[p.cat]} ${CAT_NAME[p.cat]}${p.approx ? " · location approx." : ""}${extra || ""}</span><br>
    <a href="${gmaps(p)}" target="_blank" rel="noopener">⛯ take me there</a>`;
}

function drawCollection() {
  collectionLayer.clearLayers();
  const crawlIds = new Set(CRAWL.flatMap(l => l.options.map(o => o.id)));
  PLACES.forEach(p => {
    if (crawlIds.has(p.id)) return;
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: "", html: `<div class="pin dot"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] }),
      keyboard: false,
    }).bindPopup(popupHtml(p)).addTo(collectionLayer);
  });
}

function drawRoute() {
  routeLayer.clearLayers();
  const planned = plannedStops();
  const nxt = nextLeg();
  const nextIdx = nxt ? CRAWL.indexOf(nxt) : CRAWL.length;

  // segments between consecutive planned stops
  for (let i = 0; i < planned.length - 1; i++) {
    const pts = [[planned[i].lat, planned[i].lng], [planned[i + 1].lat, planned[i + 1].lng]];
    let style;
    if (i + 1 < nextIdx)      style = { color: "#7da87b", weight: 3.5, opacity: .85 };                    // walked
    else if (i + 1 === nextIdx) style = { color: "#c96f4a", weight: 5, opacity: .95, className: "route-path" }; // next!
    else                      style = { color: "#b7a98c", weight: 3, opacity: .7, dashArray: "2 9" };     // later
    L.polyline(pts, style).addTo(routeLayer);
  }
  // alternates (dashed pins)
  CRAWL.forEach(leg => leg.options.forEach(opt => {
    if (opt.id === pickOf(leg)) return;
    const p = byId[opt.id];
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: "", html: `<div class="pin alt-pin">·</div>`, iconSize: [24, 24], iconAnchor: [12, 12] }),
    }).bindPopup(popupHtml(p, " · alternate")).addTo(routeLayer);
  }));
  // planned numbered pins
  CRAWL.forEach((leg, i) => {
    const p = planned[i];
    const done = legDone(leg);
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: "", html: `<div class="pin ${done ? "done" : ""}">${done ? "✓" : i + 1}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }),
      zIndexOffset: 500,
    }).bindPopup(popupHtml(p, ` · stop ${i + 1} · ${leg.when}`)).addTo(routeLayer);
  });
}

/* ---------- nearby treasures — two recs drift in after each stamp ---------- */
function anchorPlace() {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const p = byId[state.history[i]];
    if (p) return p;
  }
  return null;
}

function renderNearby() {
  const anchor = anchorPlace();
  const intro = $("#rec-intro");
  const box = $("#recs");
  if (!anchor) {
    intro.textContent = "Stamp your first stop and two little treasures nearby will drift in ✧";
    box.innerHTML = "";
    return;
  }
  intro.innerHTML = `Since you're at <b>${esc(anchor.name)}</b> — two treasures worth a peek:`;
  const crawlIds = new Set(CRAWL.flatMap(l => l.options.map(o => o.id)));
  const recs = PLACES
    .filter(p => p.id !== anchor.id && !crawlIds.has(p.id) && !state.visited[p.id])
    .map(p => ({ p, d: dist(anchor, p) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 2);
  box.innerHTML = recs.map(({ p, d }, i) => `
    <div class="card rec" style="animation-delay:${i * .18}s" data-id="${p.id}">
      <h3><span class="cat-ico">${CAT_ICON[p.cat]}</span>${esc(p.name)}</h3>
      <p class="note">${CAT_NAME[p.cat]}${p.approx ? " · location approx." : ""} — a ${fmtDist(d)} wander from here.</p>
      <div class="card-actions">
        <button class="btn btn-stamp" data-rec-visit="${p.id}">☀ stamped it!</button>
        <a class="btn btn-maps" target="_blank" rel="noopener" href="${gmaps(p)}">⛯ take me there</a>
      </div>
    </div>`).join("") ||
    `<p class="empty-note">every treasure nearby has been found — wander on ✧</p>`;
}

$("#recs").addEventListener("click", e => {
  const btn = e.target.closest("[data-rec-visit]");
  if (!btn) return;
  const id = btn.dataset.recVisit;
  state.visited[id] = true;
  state.history = state.history.filter(h => h !== id).concat(id);
  sparkle(btn.closest(".card"));
  save();
  setTimeout(() => refresh({ keepScroll: true }), 420);
});

/* ---------- refresh ---------- */
function refresh(opts = {}) {
  const y = opts.keepScroll ? window.scrollY : null;
  renderHeader();
  renderItinerary();
  drawRoute();
  renderNearby();
  if (y !== null) window.scrollTo(0, y);
}
renderHeader(); renderItinerary(); drawCollection(); drawRoute(); renderNearby();
window.addEventListener("load", () => map.invalidateSize());
