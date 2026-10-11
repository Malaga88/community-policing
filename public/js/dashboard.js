// ============================================================
// dashboard.js — renders the shared incident dashboard.
//
// Tries the live API first (GET /api/reports). If the backend
// isn't reachable — e.g. these files were opened directly as
// static HTML, or the server just isn't running — it falls back
// to a small set of demo reports so the page still has something
// to show, and displays a banner saying so.
// ============================================================

// Reference point: ATBU Library, Gubi (Main) Campus, along Kano/Ningi Road,
// Bauchi — 10.4689°N, 9.8303°E.
const CAMPUS_CENTER = [10.4689, 9.8303];
const API_BASE = "https://community-policing.onrender.com/api/reports";

const FALLBACK_REPORTS = [
  {
    id: "GW-1042", severity: "medium", category: "suspicious", location: "Behind Hostel C",
    description: "Man in a black jacket loitering near the girls' hostel gate, side lane. Not a student — no ID visible.",
    minutesAgo: 4, anonymous: true, lat: 10.4696, lng: 9.8295,
  },
  {
    id: "GW-1041", severity: "high", category: "theft", location: "New Male Hostel, Block B",
    description: "My phone was taken from my table while I stepped out to the bathroom around 9pm. Room door was unlocked for less than 5 minutes.",
    minutesAgo: 38, anonymous: false, reporterName: "Amina B.", lat: 10.4702, lng: 9.8310,
  },
  {
    id: "GW-1040", severity: "medium", category: "hazard", location: "Pathway between SICT and the Library",
    description: "Streetlight has been out for about a week now. Very dark by 7pm, hard to see the potholes.",
    minutesAgo: 95, anonymous: false, reporterName: "Ibrahim T.", lat: 10.4688, lng: 9.8300,
  },
  {
    id: "GW-1039", severity: "high", category: "harassment", location: "Junction near the Faculty of Computing",
    description: "A group of guys have been catcalling girls walking past that junction every evening this week.",
    minutesAgo: 140, anonymous: true, lat: 10.4680, lng: 9.8315,
  },
  {
    id: "GW-1038", severity: "medium", category: "theft", location: "Basketball court, evening",
    description: "Bag left on the bench for two minutes and a wallet went missing from it.",
    minutesAgo: 210, anonymous: true, lat: 10.4693, lng: 9.8288,
  },
  {
    id: "GW-1037", severity: "low", category: "suspicious", location: "Around the generator house, Female Hostel",
    description: "Same unfamiliar face seen twice this week, just standing around after dark.",
    minutesAgo: 340, anonymous: false, reporterName: "Chiamaka O.", lat: 10.4705, lng: 9.8299,
  },
  {
    id: "GW-1036", severity: "medium", category: "hazard", location: "Stairs, old Engineering block",
    description: "Handrail on the second floor stairs is loose — wobbles badly if you lean on it.",
    minutesAgo: 480, anonymous: false, reporterName: "Yusuf A.", lat: 10.4675, lng: 9.8292,
  },
  {
    id: "GW-1035", severity: "high", category: "harassment", location: "Off-campus shuttle stop",
    description: "Okada rider following and pestering a group of female students after they declined a ride.",
    minutesAgo: 610, anonymous: true, lat: 10.4670, lng: 9.8320,
  },
];

const CATEGORY_META = {
  theft:      { label: "Theft",               icon: "👜" },
  harassment: { label: "Harassment",          icon: "🗣️" },
  hazard:     { label: "Safety hazard",       icon: "⚠️" },
  suspicious: { label: "Suspicious activity", icon: "👁️" },
};

// Severity drives the pin colour. Reports saved before severity existed
// (no value from the API) are treated as "medium".
const SEVERITY_META = {
  low:    { label: "Low",    color: "#2E9E5B" },
  medium: { label: "Medium", color: "#E8A33D" },
  high:   { label: "High",   color: "#D43B35" },
};
const SEVERITY_RANK = { low: 0, medium: 1, high: 2 }; // higher-severity pins draw on top
function severityOf(report) {
  return SEVERITY_META[report.severity] ? report.severity : "medium";
}

const feedEl         = document.getElementById("feed");
const emptyStateEl   = document.getElementById("empty-state");
const filterBar      = document.getElementById("filter-bar");
const statTotal      = document.getElementById("stat-total");
const statTopCat     = document.getElementById("stat-top-category");
const statAnon       = document.getElementById("stat-anon-share");
const viewToggle     = document.getElementById("view-toggle");
const mapPanel       = document.getElementById("map-panel");
const dataBannerEl   = document.getElementById("data-source-banner");

let REPORTS = [];
let activeFilter = "all";
let activeSeverity = "all";
let activeView   = "map";

// ------------------------------------------------------------
// Data loading — live API with a demo-data fallback
// ------------------------------------------------------------
async function loadReports() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Request failed: " + res.status);

    const docs = await res.json();
    REPORTS = docs.map((doc) => ({
      id: "GW-" + String(doc._id).slice(-6).toUpperCase(),
      category: doc.category,
      severity: doc.severity,
      location: doc.location,
      description: doc.description,
      minutesAgo: Math.max(0, Math.round((Date.now() - new Date(doc.createdAt)) / 60000)),
      anonymous: doc.isAnonymous,
      reporterName: doc.reporterName,
      lat: doc.lat,
      lng: doc.lng,
    }));

    dataBannerEl.hidden = true;
  } catch (err) {
    console.warn("Could not reach the API, showing demo data instead:", err.message);
    REPORTS = FALLBACK_REPORTS;
    dataBannerEl.hidden = false;
  }

  renderStats();
  renderFeed();
  renderMapMarkers();
}

// One predicate for every view, so the list, the pins and the hotspots always agree.
function matchesFilters(report) {
  return (activeFilter === "all" || report.category === activeFilter) &&
         (activeSeverity === "all" || severityOf(report) === activeSeverity);
}

function visibleReports() {
  return REPORTS.filter(matchesFilters);
}

// Escapes user-supplied text before it is placed into HTML, so a report
// containing markup (e.g. a <script> tag) is shown as plain text instead of running.
function escapeHTML(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function timeAgoLabel(minutes) {
  if (minutes < 60) return minutes + " min ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
  const days = Math.floor(hours / 24);
  return days + (days === 1 ? " day ago" : " days ago");
}

// ------------------------------------------------------------
// List view
// ------------------------------------------------------------
function reportCardHTML(report) {
  const meta = CATEGORY_META[report.category];
  const identityLabel = report.anonymous
    ? "Reported anonymously"
    : "Reported by " + escapeHTML(report.reporterName);

  return `
    <article class="report-card cat-border-${report.category}" data-category="${report.category}">
      <div class="report-card-head">
        <span class="cat-badge cat-${report.category}"><span class="dot"></span>${meta.label}</span>
        <span class="sev-badge sev-${severityOf(report)}">${SEVERITY_META[severityOf(report)].label}</span>
        <span class="report-card-time">${timeAgoLabel(report.minutesAgo)}</span>
      </div>
      <p class="report-card-body">${escapeHTML(report.description)}</p>
      <div class="report-card-foot">
        <span>📍 ${escapeHTML(report.location)}</span>
        <span class="report-card-identity">${identityLabel}</span>
      </div>
      <span class="report-card-id">${escapeHTML(report.id)}</span>
    </article>
  `;
}

function renderFeed() {
  const visible = visibleReports();
  feedEl.innerHTML = visible.map(reportCardHTML).join("");
  if (activeView === "list") emptyStateEl.hidden = visible.length !== 0;
}

function renderStats() {
  if (REPORTS.length === 0) {
    statTotal.textContent = "0";
    statTopCat.textContent = "–";
    statAnon.textContent = "0%";
    return;
  }

  statTotal.textContent = REPORTS.length;

  const counts = {};
  REPORTS.forEach((r) => { counts[r.category] = (counts[r.category] || 0) + 1; });
  const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  statTopCat.textContent = CATEGORY_META[topCategory].label;

  const anonCount = REPORTS.filter((r) => r.anonymous).length;
  statAnon.textContent = Math.round((anonCount / REPORTS.length) * 100) + "%";
}

// ------------------------------------------------------------
// Map view (Leaflet + OpenStreetMap tiles)
// ------------------------------------------------------------
let campusMap = null;
let markerLayer = null;
let landmarkLayer = null;
let hotspotLayer = null;
const landmarkToggle = document.getElementById("landmark-toggle");

// Pin colour = severity; the glyph inside = incident category.
function pinDivIcon(report) {
  const sev = severityOf(report);
  const glyph = (CATEGORY_META[report.category] || {}).icon || "📍";
  return L.divIcon({
    className: "",
    html: `<span class="marker-pin sev-${sev}"><span class="marker-pin-icon">${glyph}</span></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
}

function initMap() {
  if (campusMap) return;

  campusMap = L.map("campus-map", { scrollWheelZoom: false }).setView(CAMPUS_CENTER, 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(campusMap);

  landmarkLayer = L.layerGroup().addTo(campusMap); // added first so report pins sit on top
  hotspotLayer  = L.layerGroup().addTo(campusMap); // translucent circles, under the pins
  markerLayer = L.layerGroup().addTo(campusMap);
}

// ---- Campus landmarks (popular points from campus-locations.js) ----
function distanceMetres(aLat, aLng, bLat, bLng) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function normaliseText(t) {
  return String(t || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

// Finds the landmark a typed location refers to (longest matching name/alias wins).
function findLandmarkByText(text) {
  const haystack = normaliseText(text);
  if (!haystack) return null;
  let best = null, bestLen = 0;
  CAMPUS_LOCATIONS.forEach((lm) => {
    [lm.name].concat(lm.aliases || []).forEach((label) => {
      const needle = normaliseText(label);
      if (needle.length >= 3 && haystack.includes(needle) && needle.length > bestLen) {
        best = lm; bestLen = needle.length;
      }
    });
  });
  return best;
}

// Works out where each report goes on the map:
//   1. its own GPS coordinates, if the student shared them;
//   2. otherwise the landmark named in its location text (approximate);
//   3. otherwise it is not plotted (it still shows in the list view).
// Pins that would sit on top of each other (or on a landmark) are spread
// slightly so every one stays visible and clickable.
function computeReportPositions(list) {
  const placed = [];
  list.forEach((report) => {
    let lat = report.lat, lng = report.lng, landmark = null;
    const hasGps = typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng);
    if (!hasGps) {
      landmark = findLandmarkByText(report.location);
      if (!landmark) return;
      lat = landmark.lat; lng = landmark.lng;
    }
    placed.push({ report, lat, lng, origLat: lat, origLng: lng, landmark });
  });

  const key = (la, ln) => la.toFixed(5) + "," + ln.toFixed(5);
  const landmarkKeys = new Set(CAMPUS_LOCATIONS.map((l) => key(l.lat, l.lng)));
  const groups = {};
  placed.forEach((p) => { (groups[key(p.lat, p.lng)] = groups[key(p.lat, p.lng)] || []).push(p); });

  Object.keys(groups).forEach((k) => {
    const g = groups[k];
    if (g.length === 1 && !landmarkKeys.has(k)) return;
    const radius = g.length > 6 ? 0.00018 : 0.00009; // roughly 10 to 20 metres
    g.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / g.length + Math.PI / 4;
      p.lat += radius * Math.sin(angle);
      p.lng += radius * Math.cos(angle);
    });
  });
  return placed;
}

function landmarkIcon(type) {
  const meta = LANDMARK_TYPE_META[type] || LANDMARK_TYPE_META.other;
  return L.divIcon({
    className: "",
    html: `<span class="landmark-pin">${meta.icon}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function renderLandmarks(placed) {
  landmarkLayer.clearLayers();
  if (landmarkToggle && !landmarkToggle.checked) return;

  CAMPUS_LOCATIONS.forEach((lm) => {
    const meta = LANDMARK_TYPE_META[lm.type] || LANDMARK_TYPE_META.other;
    const nearby = placed.filter((p) => distanceMetres(lm.lat, lm.lng, p.origLat, p.origLng) <= 75).length;
    const countLabel = nearby === 0
      ? "No reports here yet"
      : nearby + (nearby === 1 ? " report here" : " reports here");

    L.marker([lm.lat, lm.lng], { icon: landmarkIcon(lm.type), zIndexOffset: -500 })
      .bindTooltip(escapeHTML(lm.name), { direction: "top", offset: [0, -12] })
      .bindPopup(`
        <div class="map-popup-head"><strong>${escapeHTML(lm.name)}</strong></div>
        <div class="map-popup-foot">
          <span>${meta.icon} ${escapeHTML(meta.label)} landmark</span>
          <span>${countLabel}</span>
        </div>`)
      .addTo(landmarkLayer);
  });
}

// ---- Hotspots: areas where several reports cluster together ----
// Reports within HOTSPOT_RADIUS_M of each other (chained) form one cluster.
// A cluster of 2+ reports is drawn as a translucent circle. Each report is
// weighted by severity (low 1, medium 2, high 3) and the colour follows the
// total, so three high-severity reports read hotter than five low ones.
const HOTSPOT_RADIUS_M = 100; // metres; tweak to make hotspots tighter or looser
const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3 };
const hotspotToggle = document.getElementById("hotspot-toggle");

function clusterReports(placed) {
  const clusters = [];
  const seen = new Set();
  placed.forEach((start, i) => {
    if (seen.has(i)) return;
    const members = [start];
    seen.add(i);
    for (let q = 0; q < members.length; q++) { // grow the cluster outward
      placed.forEach((other, j) => {
        if (seen.has(j)) return;
        if (distanceMetres(members[q].origLat, members[q].origLng, other.origLat, other.origLng) <= HOTSPOT_RADIUS_M) {
          seen.add(j);
          members.push(other);
        }
      });
    }
    clusters.push(members);
  });
  return clusters;
}

function renderHotspots(placed) {
  hotspotLayer.clearLayers();
  if (hotspotToggle && !hotspotToggle.checked) return;

  clusterReports(placed).filter((c) => c.length >= 2).forEach((members) => {
    const score = members.reduce((sum, p) => sum + SEVERITY_WEIGHT[severityOf(p.report)], 0);
    const highCount = members.filter((p) => severityOf(p.report) === "high").length;
    const color = score >= 7 ? SEVERITY_META.high.color
                : score >= 4 ? SEVERITY_META.medium.color
                :              SEVERITY_META.low.color;

    // centre on the average position; radius grows with the spread and size of the cluster
    const lat = members.reduce((a, p) => a + p.origLat, 0) / members.length;
    const lng = members.reduce((a, p) => a + p.origLng, 0) / members.length;
    const spread = Math.max(...members.map((p) => distanceMetres(lat, lng, p.origLat, p.origLng)));
    const radius = Math.min(150, Math.max(35, spread + 25) + members.length * 4);

    L.circle([lat, lng], {
      radius, color, weight: 1.5, dashArray: "4 4",
      fillColor: color, fillOpacity: Math.min(0.45, 0.14 + score * 0.03),
      interactive: false, // never block clicks on the pins underneath
    }).addTo(hotspotLayer);
  });
}

function renderMapMarkers() {
  if (!markerLayer) return;
  markerLayer.clearLayers();

  const placed = computeReportPositions(REPORTS);
  renderLandmarks(placed);

  // hotspots and pins both respect the active category + severity filters
  const shown = placed.filter((p) => matchesFilters(p.report));
  renderHotspots(shown);

  shown.forEach((p) => {
      const report = p.report;
      const meta = CATEGORY_META[report.category];
      const identityLabel = report.anonymous
        ? "Reported anonymously"
        : "Reported by " + escapeHTML(report.reporterName);
      const placedNote = p.landmark
        ? `<span>📌 Shown near ${escapeHTML(p.landmark.name)} (approximate)</span>`
        : "";

      const sev = severityOf(report);
      const popupHTML = `
        <div class="map-popup-head">
          <span class="cat-badge cat-${report.category}"><span class="dot"></span>${meta.label}</span>
          <span class="sev-badge sev-${sev}">${SEVERITY_META[sev].label}</span>
        </div>
        <div class="map-popup-time" style="margin-bottom:8px;">${timeAgoLabel(report.minutesAgo)}</div>
        <p class="map-popup-body">${escapeHTML(report.description)}</p>
        <div class="map-popup-foot">
          <span>📍 ${escapeHTML(report.location)}</span>
          ${placedNote}
          <span>${identityLabel} · ${escapeHTML(report.id)}</span>
        </div>
      `;

      L.marker([p.lat, p.lng], { icon: pinDivIcon(report), zIndexOffset: 1000 + SEVERITY_RANK[severityOf(report)] * 100 })
        .bindPopup(popupHTML)
        .addTo(markerLayer);
    });
}

if (landmarkToggle) landmarkToggle.addEventListener("change", renderMapMarkers);
if (hotspotToggle) hotspotToggle.addEventListener("change", renderMapMarkers);

// ---- Severity filter chips ----
const severityBar = document.getElementById("severity-bar");
severityBar.addEventListener("click", (event) => {
  const chip = event.target.closest(".filter-chip");
  if (!chip) return;
  severityBar.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("is-active"));
  chip.classList.add("is-active");
  activeSeverity = chip.dataset.severity;
  renderFeed();
  renderMapMarkers();
});

// ------------------------------------------------------------
// Filters (drives both the map markers and the list feed)
// ------------------------------------------------------------
filterBar.addEventListener("click", (event) => {
  const chip = event.target.closest(".filter-chip");
  if (!chip) return;

  filterBar.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("is-active"));
  chip.classList.add("is-active");

  activeFilter = chip.dataset.category;
  renderFeed();
  renderMapMarkers();
});

// ------------------------------------------------------------
// View toggle (map <-> list)
// ------------------------------------------------------------
viewToggle.addEventListener("click", (event) => {
  const btn = event.target.closest(".view-toggle-btn");
  if (!btn) return;

  viewToggle.querySelectorAll(".view-toggle-btn").forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");

  activeView = btn.dataset.view; // "map" | "list"
  const showMap = activeView === "map";

  mapPanel.hidden = !showMap;
  feedEl.hidden = showMap;

  if (showMap) {
    emptyStateEl.hidden = true;
    initMap();
    renderMapMarkers();
    setTimeout(() => campusMap.invalidateSize(), 50); // Leaflet sizing quirk after unhide
  } else {
    renderFeed(); // recompute empty-state for the list view
  }
});

// ---- init ----
initMap();
loadReports();