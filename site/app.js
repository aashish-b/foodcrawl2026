/* ── The Toronto Crawl · July 19, 2026 ─────────────────────────────
   Progressive-reveal quest. Vanilla JS, state in localStorage.
   Phases unlock by stamping; stamps unlock by Toronto (EDT) clock.
   Add ?rehearsal to the URL to bypass the clock for a dry run.     */
"use strict";

/* ---------- clocks & gates ---------- */
const GATES = {
  start:   Date.parse("2026-07-19T11:00:00-04:00"),
  lunch:   Date.parse("2026-07-19T14:00:00-04:00"),
  evening: Date.parse("2026-07-19T19:00:00-04:00"),
};
const REHEARSAL = new URLSearchParams(location.search).has("rehearsal");
const canStampAt = t => REHEARSAL || Date.now() >= t;

/* ---------- phases ---------- */
const PHASES = [
  { key: "one", num: 1, label: "stop one · first light · brunch", when: "11:00 am",
    stampAfter: GATES.start, gateLabel: "11:00 am", plan: true, options: [{
      id: "old-school",
      note: "All-day brunch HQ — Blueberry Hill pancakes, chicken & waffles, big sunny diner energy.",
      hours: "sun 9 am – 5 pm",
      reso: { level: "consider", text: "bookable on OpenTable — smart for 4" },
    }]},
  { key: "two", num: 2, label: "stop two · a little detour · persian treat", when: "~12:45 pm",
    stampAfter: GATES.start, gateLabel: "11:00 am", plan: true, options: [{
      id: "tochal",
      note: "Persian juice & ice-cream bar — saffron soft-serve, rosewater, fresh juice. A quick sweet detour.",
      hours: "sun 11 am – 9 pm",
      reso: { level: "walkin", text: "walk right in" },
    }]},
  { key: "lunch", num: 3, label: "stop three · the lunch reveal", when: "from 2:00 pm",
    stampAfter: GATES.lunch, gateLabel: "2:00 pm",
    teaser: "sealed ✉ — stamp your first stop to reveal the lunch spots",
    options: [
      { id: "sugo", note: "Riotous red-sauce Italian-American — the eggplant parm of legend. Cash or debit only!",
        hours: "sun 11:30 am – 9 pm", reso: { level: "walkin", text: "no reservations" } },
      { id: "pizzeria-badiali", note: "Perfect New-York-style slices — worth every minute of the line.",
        hours: "sun 12 – 9 pm", reso: { level: "walkin", text: "counter service" } },
      { id: "harry-s-charbroiled", note: "Smash-burger royalty, now inside the Waterworks Food Hall on Brant St.",
        hours: "sun 11:30 am – 10 pm", reso: { level: "walkin", text: "food-hall counter" } },
      { id: "saigon-lotus", note: "Michelin Bib Gourmand vegan Vietnamese tucked into Kensington — lotus rolls, vegan phở.",
        hours: "sun 11 am – 10 pm", reso: { level: "walkin", text: "walk-in" } },
      { id: "machida-shoten", note: "Canada's first Yokohama iekei ramen — rich, garlicky, gone in minutes.",
        hours: "sun 11 am – 10 pm", reso: { level: "walkin", text: "walk-in" } },
      { id: "miznon", note: "Eyal Shani's whole roasted cauliflower and pillowy pita, up in Yorkville.",
        hours: "sun 11 am – 8 pm", reso: { level: "walkin", text: "counter service" } },
      { id: "banh-mi-nguyen-huong", note: "Chinatown bánh mì institution — cheap, fast, perfect.",
        reso: { level: "walkin", text: "walk-in" } },
    ]},
  { key: "predinner", num: 4, label: "stop four · the golden-hour reveal", when: "evening",
    stampAfter: GATES.evening, gateLabel: "7:00 pm",
    teaser: "sealed ✉ — stamp a lunch spot to reveal the golden-hour treats",
    options: [
      { id: "death-in-venice-gelato", note: "Mad-genius gelato lab — olive oil & sea salt, truffle maple sage — plus espresso.",
        hours: "sun 9 am – 9 pm", reso: { level: "walkin", text: "walk-in" } },
      { id: "icha-tea", note: "Hand-brewed jasmine and oolong that broke the internet — Chinatown tea magic.",
        reso: { level: "walkin", text: "walk-in" } },
      { id: "ruru-baked", note: "Dreamy small-batch ice cream on Lansdowne — ube, hojicha, honeycomb moods.",
        reso: { level: "walkin", text: "walk-in" } },
      { id: "civil-liberties", note: "No menu at all — name a mood and they build your cocktail. Top-50 in North America.",
        hours: "sun 6 pm – 2 am", reso: { level: "walkin", text: "walk-in only" } },
      { id: "bar-pompette", note: "French cocktail royalty (World's 50 Best) — live jazz on Sunday nights.",
        hours: "sun 6 pm – midnight", reso: { level: "walkin", text: "walk-in only" } },
      { id: "el-rey-mezcal-bar", note: "Smoky mezcal hideout in a Kensington alley — snacks to match.",
        reso: { level: "walkin", text: "walk-in" } },
      { id: "project-gigglewater", note: "Your friendly neighbourhood cocktail bar on Dundas West — zero pretension.",
        reso: { level: "walkin", text: "walk-in" } },
    ]},
  { key: "dinner", num: 5, label: "stop five · lantern light · dinner", when: "~7:30 pm",
    stampAfter: GATES.evening, gateLabel: "7:00 pm",
    teaser: "sealed ✉ — stamp a golden-hour treat to reveal dinner",
    options: [
      { id: "bar-vendetta", note: "Jen Agg's 1970s pasta-and-wine room — handmade rigatoni, retro glamour, killer wine.",
        hours: "sun 5 pm – 10:30 pm", reso: { level: "reserve", text: "reserved ✎ — this is the one" } },
      { id: "bar-isabel", note: "Candlelit Spanish tavern — pan con tomate, wild mushrooms, the good vermouth.",
        hours: "sun 5 pm – 11 pm", reso: { level: "reserve", text: "reserve ahead ✎ barisabel.com" } },
      { id: "dailo", note: "Nick Liu's French-Asian — Big Mac bao, fried watermelon, dan dan everything.",
        hours: "sun 5 pm – 11 pm", reso: { level: "reserve", text: "reserve ahead ✎ OpenTable / 647-341-8882" } },
    ]},
];

/* ---------- curator sheet (remote control) ----------
   A link-readable Google Sheet, fetched as CSV, columns: phase, id, name, show.
   Rows with show=yes make that place visible in its reveal; a phase with
   zero yes-rows (or an unreachable sheet) falls back to the built-in pool.
   URL lightly obscured so the plan isn't one view-source away.            */
const SHEET_CSV_URL = atob("aHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vc3ByZWFkc2hlZXRzL2QvMXRRTTVUVWlBeTh2OVFweWpKWm5Lc1NjcndWN1FlYXk3MnhvUDVkM0dFeVUvZ3Zpei90cT90cXg9b3V0OmNzdiZnaWQ9MA==");
let sheetConfig = null;
async function pollSheet() {
  if (!SHEET_CSV_URL) return;
  try {
    const txt = await (await fetch(SHEET_CSV_URL, { cache: "no-store" })).text();
    const cfg = {};
    txt.split(/\r?\n/).forEach(line => {
      const cells = line.split(",").map(s => s.replace(/^"|"$/g, "").trim().toLowerCase());
      if (cells.length < 3) return;
      const [phase, id] = cells, show = cells[cells.length - 1];
      if (!["lunch", "predinner", "dinner"].includes(phase)) return;
      cfg[phase] = cfg[phase] || new Set();
      if (["yes", "y", "true"].includes(show)) cfg[phase].add(id);
    });
    const changed = JSON.stringify(dumpCfg(cfg)) !== JSON.stringify(dumpCfg(sheetConfig));
    sheetConfig = cfg;
    if (changed) refresh({ keepScroll: true });
  } catch (e) { /* offline or sheet hiccup — keep last known config */ }
}
const dumpCfg = c => c ? Object.fromEntries(Object.entries(c).map(([k, v]) => [k, [...v].sort()])) : null;
function activeOptions(ph) {
  const chosen = sheetConfig && sheetConfig[ph.key];
  if (!chosen || !chosen.size) return ph.options;
  const known = new Map(ph.options.map(o => [o.id, o]));
  // sheet order wins; ids outside the built-in pool become simple walk-in cards
  const kept = [...chosen].filter(id => byId[id]).map(id => known.get(id) || {
    id, note: "A hand-picked detour from the collection — trust the curator ✧",
    reso: { level: "walkin", text: "walk-in" },
  });
  return kept.length ? kept : ph.options;
}

const CAT_ICON = { cafe: "☕", bakery: "🥐", sweets: "🍧", food: "🍜", bar: "🍸" };
const CAT_NAME = { cafe: "café", bakery: "bakery", sweets: "sweets", food: "restaurant", bar: "bar" };

/* ---------- state ---------- */
// rehearsal keeps its own store so dry runs never bleed into the real day
const KEY = REHEARSAL ? "crawl-2026-07-19-rehearsal" : "crawl-2026-07-19";
const byId = Object.fromEntries(PLACES.map(p => [p.id, p]));
let state = { visited: {}, history: [] };
try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
// stamps are clock-gated, so real-mode stamps before the opening gate can only
// be leftovers from old dry runs — start clean (?reset also wipes by hand)
if ((!REHEARSAL && Date.now() < GATES.start && Object.keys(state.visited).length) ||
    new URLSearchParams(location.search).has("reset")) {
  state = { visited: {}, history: [] };
  localStorage.setItem(KEY, JSON.stringify(state));
}
const save = () => localStorage.setItem(KEY, JSON.stringify(state));

const phaseDone = ph => ph.options.some(o => state.visited[o.id]);
function phaseRevealed(ph) {
  switch (ph.key) {
    case "one": case "two": return true;
    case "lunch":     return !!(state.visited["old-school"] || state.visited["tochal"]);
    case "predinner": return phaseDone(PHASES[2]);
    case "dinner":    return phaseDone(PHASES[3]);
  }
}
const currentPhase = () => PHASES.find(ph => phaseRevealed(ph) && !phaseDone(ph)) || null;
const ALL_OPTION_IDS = new Set(PHASES.flatMap(ph => ph.options.map(o => o.id)));

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
  const done = PHASES.filter(phaseDone).length;
  $("#stamps").innerHTML = PHASES.map(ph =>
    `<span class="stamp-dot ${phaseDone(ph) ? "done" : ""}">☀</span>`).join("");
  $("#stamps-label").textContent =
    done === 0 ? "the adventure awaits…" :
    done === PHASES.length ? "all five stamps — what a day ☀" :
    `${done} of ${PHASES.length} stamps collected`;
}

/* ---------- itinerary ---------- */
function optionCard(ph, opt, revealedNow) {
  const p = byId[opt.id];
  const isVisited = !!state.visited[opt.id];
  const stampOpen = canStampAt(ph.stampAfter);
  const resoBadge = opt.reso.level === "reserve"
    ? `<span class="badge b-reso">${esc(opt.reso.text)}</span>`
    : `<span class="badge b-walkin">${esc(opt.reso.text)}</span>`;
  const stampBtn = isVisited
    ? `<button class="btn btn-stamp" data-visit="${opt.id}">↺ un-stamp</button>`
    : stampOpen
      ? `<button class="btn btn-stamp" data-visit="${opt.id}">☀ stamp it — we were here!</button>`
      : `<button class="btn btn-stamp locked" disabled>⏳ stamps open at ${ph.gateLabel}</button>`;
  return `
  <div class="card ${revealedNow ? "rec" : ""} ${isVisited ? "visited" : ""}" data-id="${opt.id}">
    ${ph.plan && !isVisited ? `<div class="pick-flag">the plan ☀</div>` : ""}
    ${isVisited ? `<div class="visited-stamp">visited! ☀</div>` : ""}
    <h3>${esc(p.name)}</h3>
    <p class="note">${esc(opt.note)}</p>
    <div class="badges">
      ${opt.hours ? `<span class="badge b-hours">${esc(opt.hours)}</span>` : ""}
      ${resoBadge}
    </div>
    <div class="card-actions">
      ${stampBtn}
      <a class="btn btn-maps" target="_blank" rel="noopener" href="${gmaps(p)}">⛯ take me there</a>
    </div>
  </div>`;
}

let lastRevealedKeys = new Set();
function renderItinerary() {
  const html = PHASES.map(ph => {
    const revealed = phaseRevealed(ph);
    const newlyRevealed = revealed && !lastRevealedKeys.has(ph.key);
    const head = `
      <div class="stop-label"><span>${revealed ? esc(ph.label) : `stop ${["one","two","three","four","five"][ph.num-1]} · ???`}</span>
        <span class="when">${revealed ? ph.when : ""}</span></div>`;
    if (!revealed) return head + `<div class="card sealed">🕯 ${esc(ph.teaser)}</div>`;
    return head + activeOptions(ph).map(o => optionCard(ph, o, newlyRevealed)).join("");
  }).join("");
  $("#itinerary").innerHTML = html;
  lastRevealedKeys = new Set(PHASES.filter(phaseRevealed).map(ph => ph.key));
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
  if (!visitBtn || visitBtn.disabled) return;
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
});

/* ---------- map ---------- */
const map = L.map("map", { zoomControl: true, attributionControl: true, tap: false });
L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  maxZoom: 19,
}).addTo(map);

const routeLayer = L.layerGroup().addTo(map);
const collectionLayer = L.layerGroup().addTo(map);

function popupHtml(p, extra) {
  return `<b>${esc(p.name)}</b><br>
    <span style="color:#a08c72">${CAT_ICON[p.cat]} ${CAT_NAME[p.cat]}${p.approx ? " · location approx." : ""}${extra || ""}</span><br>
    <a href="${gmaps(p)}" target="_blank" rel="noopener">⛯ take me there</a>`;
}

function drawCollection() {
  collectionLayer.clearLayers();
  PLACES.forEach(p => {
    if (ALL_OPTION_IDS.has(p.id)) return;
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: "", html: `<div class="pin dot"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] }),
      keyboard: false,
    }).bindPopup(popupHtml(p)).addTo(collectionLayer);
  });
}

function drawRoute() {
  routeLayer.clearLayers();
  const bounds = [];

  // the trail so far — solid sage through every stamped place, in order
  const trail = state.history.map(id => byId[id]).filter(Boolean);
  if (trail.length > 1)
    L.polyline(trail.map(p => [p.lat, p.lng]), { color: "#7da87b", weight: 3.5, opacity: .85 }).addTo(routeLayer);
  trail.forEach(p => bounds.push([p.lat, p.lng]));

  // animated peach fan: from where you are to each open choice of the current phase
  const cur = currentPhase();
  const last = trail.at(-1);
  if (cur && last) {
    activeOptions(cur).filter(o => !state.visited[o.id]).forEach(o => {
      const p = byId[o.id];
      L.polyline([[last.lat, last.lng], [p.lat, p.lng]],
        { color: "#c96f4a", weight: 4, opacity: .8, className: "route-path" }).addTo(routeLayer);
    });
  }

  // pins for revealed phases only — no spoilers
  PHASES.filter(phaseRevealed).forEach(ph => {
    activeOptions(ph).forEach(o => {
      const p = byId[o.id];
      const done = !!state.visited[o.id];
      bounds.push([p.lat, p.lng]);
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: "", html: `<div class="pin ${done ? "done" : ""}">${done ? "✓" : ph.num}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }),
        zIndexOffset: 500,
      }).bindPopup(popupHtml(p, ` · stop ${ph.num} · ${ph.when}`)).addTo(routeLayer);
    });
  });
  return bounds;
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
  const recs = PLACES
    .filter(p => p.id !== anchor.id && !ALL_OPTION_IDS.has(p.id) && !state.visited[p.id])
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
let fitted = false;
function refresh(opts = {}) {
  const y = opts.keepScroll ? window.scrollY : null;
  renderHeader();
  renderItinerary();
  const bounds = drawRoute();
  renderNearby();
  if (!fitted && bounds.length) {
    map.fitBounds(L.latLngBounds(bounds).pad(0.2));
    fitted = true;
  }
  if (y !== null) window.scrollTo(0, y);
}
drawCollection();
refresh();
pollSheet();
window.addEventListener("load", () => map.invalidateSize());
// re-check the clock gates and the curator sheet once a minute
setInterval(() => { refresh({ keepScroll: true }); pollSheet(); }, 60000);
