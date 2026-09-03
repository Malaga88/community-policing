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
    id: "GW-1042", category: "suspicious", location: "Behind Hostel C",
    description: "Man in a black jacket loitering near the girls' hostel gate, side lane. Not a student — no ID visible.",
    minutesAgo: 4, anonymous: true, lat: 10.4696, lng: 9.8295,
  },
  {
    id: "GW-1041", category: "theft", location: "New Male Hostel, Block B",
    description: "My phone was taken from my table while I stepped out to the bathroom around 9pm. Room door was unlocked for less than 5 minutes.",
    minutesAgo: 38, anonymous: false, reporterName: "Amina B.", lat: 10.4702, lng: 9.8310,
  },
  {
    id: "GW-1040", category: "hazard", location: "Pathway between SICT and the Library",
    description: "Streetlight has been out for about a week now. Very dark by 7pm, hard to see the potholes.",
    minutesAgo: 95, anonymous: false, reporterName: "Ibrahim T.", lat: 10.4688, lng: 9.8300,
  },
  {
    id: "GW-1039", category: "harassment", location: "Junction near the Faculty of Computing",
    description: "A group of guys have been catcalling girls walking past that junction every evening this week.",
    minutesAgo: 140, anonymous: true, lat: 10.4680, lng: 9.8315,
  },
  {
    id: "GW-1038", category: "theft", location: "Basketball court, evening",
    description: "Bag left on the bench for two minutes and a wallet went missing from it.",
    minutesAgo: 210, anonymous: true, lat: 10.4693, lng: 9.8288,
  },
  {
    id: "GW-1037", category: "suspicious", location: "Around the generator house, Female Hostel",
    description: "Same unfamiliar face seen twice this week, just standing around after dark.",
    minutesAgo: 340, anonymous: false, reporterName: "Chiamaka O.", lat: 10.4705, lng: 9.8299,
  },
  {
    id: "GW-1036", category: "hazard", location: "Stairs, old Engineering block",
    description: "Handrail on the second floor stairs is loose — wobbles badly if you lean on it.",
    minutesAgo: 480, anonymous: false, reporterName: "Yusuf A.", lat: 10.4675, lng: 9.8292,
  },
  {
    id: "GW-1035", category: "harassment", location: "Off-campus shuttle stop",
    description: "Okada rider following and pestering a group of female students after they declined a ride.",
    minutesAgo: 610, anonymous: true, lat: 10.4670, lng: 9.8320,
  },
];

const CATEGORY_META = {
  theft:      { label: "Theft" },
  harassment: { label: "Harassment" },
  hazard:     { label: "Safety hazard" },
  suspicious: { label: "Suspicious activity" },
};

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

function visibleReports() {
  return activeFilter === "all"
    ? REPORTS
    : REPORTS.filter((r) => r.category === activeFilter);
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
    : "Reported by " + report.reporterName;

  return `
    <article class="report-card cat-border-${report.category}" data-category="${report.category}">
      <div class="report-card-head">
        <span class="cat-badge cat-${report.category}"><span class="dot"></span>${meta.label}</span>
        <span class="report-card-time">${timeAgoLabel(report.minutesAgo)}</span>
      </div>
      <p class="report-card-body">${report.description}</p>
      <div class="report-card-foot">
        <span>📍 ${report.location}</span>
        <span class="report-card-identity">${identityLabel}</span>
      </div>
      <span class="report-card-id">${report.id}</span>
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

function categoryColor(category) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--cat-" + category)
    .trim();
}

function pinDivIcon(category) {
  return L.divIcon({
    className: "",
    html: `<span class="marker-pin" style="background:${categoryColor(category)};"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 15],
    popupAnchor: [0, -16],
  });
}

function initMap() {
  if (campusMap) return;

  campusMap = L.map("campus-map", { scrollWheelZoom: false }).setView(CAMPUS_CENTER, 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(campusMap);

  markerLayer = L.layerGroup().addTo(campusMap);
}

function renderMapMarkers() {
  if (!markerLayer) return;
  markerLayer.clearLayers();

  visibleReports().forEach((report) => {
    if (typeof report.lat !== "number" || typeof report.lng !== "number") return;

    const meta = CATEGORY_META[report.category];
    const identityLabel = report.anonymous
      ? "Reported anonymously"
      : "Reported by " + report.reporterName;

    const popupHTML = `
      <div class="map-popup-head">
        <span class="cat-badge cat-${report.category}"><span class="dot"></span>${meta.label}</span>
        <span class="map-popup-time">${timeAgoLabel(report.minutesAgo)}</span>
      </div>
      <p class="map-popup-body">${report.description}</p>
      <div class="map-popup-foot">
        <span>📍 ${report.location}</span>
        <span>${identityLabel} · ${report.id}</span>
      </div>
    `;

    L.marker([report.lat, report.lng], { icon: pinDivIcon(report.category) })
      .bindPopup(popupHTML)
      .addTo(markerLayer);
  });
}

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
