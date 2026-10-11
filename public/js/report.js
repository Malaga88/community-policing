// ============================================================
// report.js — interactivity for report.html, including the
// real submission to POST /api/reports (see bottom of file)
// ============================================================

const CATEGORY_META = {
  theft:      { label: "Theft",               class: "cat-theft" },
  harassment: { label: "Harassment",           class: "cat-harassment" },
  hazard:     { label: "Safety hazard",        class: "cat-hazard" },
  suspicious: { label: "Suspicious activity",  class: "cat-suspicious" },
};

const form            = document.getElementById("report-form");
const categoryInputs  = form.querySelectorAll('input[name="category"]');
const locationInput   = document.getElementById("location");
const descriptionInput = document.getElementById("description");
const identityToggle  = document.getElementById("identity-toggle");
const identityValue   = document.getElementById("identity-value");
const nameFieldGroup  = document.getElementById("name-field-group");
const reporterNameInput = document.getElementById("reporter-name");

const useLocationBtn  = document.getElementById("use-location-btn");
const locationStatus  = document.getElementById("location-status");
const latValue        = document.getElementById("lat-value");
const lngValue        = document.getElementById("lng-value");
const campusPlaceSelect = document.getElementById("campus-place");

const previewCard     = document.getElementById("preview-card");
const previewBadge    = document.getElementById("preview-badge");
const previewBody     = document.getElementById("preview-body");
const previewLocation = document.getElementById("preview-location");
const previewIdentity = document.getElementById("preview-identity");
const previewSeverity = document.getElementById("preview-severity");
const severityInputs  = form.querySelectorAll('input[name="severity"]');

// ---- Severity selection: keep the preview badge in sync ----
function updateSeverityUI() {
  const checked = form.querySelector('input[name="severity"]:checked');
  const value = checked ? checked.value : "medium";
  previewSeverity.className = "sev-badge sev-" + value;
  previewSeverity.textContent = value.charAt(0).toUpperCase() + value.slice(1);
}
severityInputs.forEach((input) => input.addEventListener("change", updateSeverityUI));

const reportSection   = document.querySelector(".report-section");
const successSection  = document.getElementById("report-success");
const reportAnotherBtn = document.getElementById("report-another");

// ---- Category selection: keep the picker's visual state and
//      the preview card in sync with whichever radio is checked ----
function updateCategoryUI() {
  const checked = form.querySelector('input[name="category"]:checked');

  categoryInputs.forEach((input) => {
    input.closest(".category-option").classList.toggle("is-checked", input.checked);
  });

  if (!checked) return;
  const meta = CATEGORY_META[checked.value];

  previewBadge.className = "cat-badge " + meta.class;
  previewBadge.innerHTML = '<span class="dot"></span>' + meta.label;
  previewCard.style.borderLeftColor = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVarForCategory(checked.value));
}

function cssVarForCategory(value) {
  switch (value) {
    case "theft": return "--cat-theft";
    case "harassment": return "--cat-harassment";
    case "hazard": return "--cat-hazard";
    case "suspicious": return "--cat-suspicious";
    default: return "--cat-theft";
  }
}

categoryInputs.forEach((input) => input.addEventListener("change", updateCategoryUI));

// ---- Live text preview ----
function updateTextPreview() {
  previewBody.textContent = descriptionInput.value.trim()
    ? descriptionInput.value.trim()
    : "Your description will appear here as you type…";

  previewLocation.textContent = locationInput.value.trim()
    ? "📍 " + locationInput.value.trim()
    : "📍 Location will appear here";
}
locationInput.addEventListener("input", updateTextPreview);
descriptionInput.addEventListener("input", updateTextPreview);

// ---- Identity toggle (named vs anonymous) ----
identityToggle.addEventListener("click", (event) => {
  const btn = event.target.closest(".identity-option");
  if (!btn) return;

  identityToggle.querySelectorAll(".identity-option").forEach((opt) => {
    opt.classList.remove("is-active");
    opt.setAttribute("aria-pressed", "false");
  });
  btn.classList.add("is-active");
  btn.setAttribute("aria-pressed", "true");

  const value = btn.dataset.value; // "named" | "anonymous"
  identityValue.value = value;

  const isAnonymous = value === "anonymous";
  nameFieldGroup.classList.toggle("is-hidden", isAnonymous);
  reporterNameInput.required = !isAnonymous;

  previewIdentity.textContent = isAnonymous ? "Reported anonymously" : "Reported as myself";
});

// ---- Account: if logged in, report as the account holder ----
// The name is filled from the account and locked, so a named report can't be
// attributed to someone else. Anonymous reports are never linked to the account.
const authNote = document.getElementById("auth-note");

function applySessionToForm() {
  const user = GWAuth.getUser();
  authNote.hidden = false;
  authNote.textContent = "";

  if (user) {
    reporterNameInput.value = user.fullName;
    reporterNameInput.readOnly = true;
    authNote.textContent = "Logged in as " + user.fullName + ". A named report is linked to your account; an anonymous one is not.";
  } else {
    reporterNameInput.readOnly = false;
    authNote.append("Optional: ");
    const link = document.createElement("a");
    link.href = "login.html?next=report.html";
    link.textContent = "log in or create an account";
    authNote.append(link, " to link named reports to you.");
  }
}

// ---- Pick a popular campus spot: fills in the location and the map coordinates ----
let autoFilledLocation = "";

(function populateCampusPlaces() {
  const byType = {};
  CAMPUS_LOCATIONS.forEach((lm) => { (byType[lm.type] = byType[lm.type] || []).push(lm); });
  Object.keys(byType).forEach((type) => {
    const meta = LANDMARK_TYPE_META[type] || LANDMARK_TYPE_META.other;
    const group = document.createElement("optgroup");
    group.label = meta.label;
    byType[type].forEach((lm) => {
      const opt = document.createElement("option");
      opt.value = lm.id;
      opt.textContent = lm.name;
      group.appendChild(opt);
    });
    campusPlaceSelect.appendChild(group);
  });
})();

campusPlaceSelect.addEventListener("change", () => {
  const lm = CAMPUS_LOCATIONS.find((l) => l.id === campusPlaceSelect.value);
  if (!lm) {
    latValue.value = "";
    lngValue.value = "";
    locationStatus.hidden = true;
    return;
  }
  latValue.value = lm.lat;
  lngValue.value = lm.lng;
  // Fill the text box only if it is empty or still holds our earlier auto-fill,
  // so we never overwrite details the student typed themselves.
  if (!locationInput.value.trim() || locationInput.value === autoFilledLocation) {
    locationInput.value = lm.name;
    autoFilledLocation = lm.name;
    updateTextPreview();
  }
  showLocationStatus("Pinned near " + lm.name + " on the map. You can add more detail in the box above.", false);
});

// ---- Capture the reporter's GPS coordinates, so the incident can ----
// ---- eventually be plotted on the dashboard map at its real spot ----
useLocationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showLocationStatus("Location isn't supported on this device/browser.", true);
    return;
  }

  showLocationStatus("Finding your location…", false);

  navigator.geolocation.getCurrentPosition(
    (position) => {
      latValue.value = position.coords.latitude;
      lngValue.value = position.coords.longitude;
      campusPlaceSelect.value = ""; // GPS replaces any campus spot picked earlier
      showLocationStatus(
        "Location captured — this will help place your report accurately on the map.",
        false
      );
    },
    () => {
      showLocationStatus(
        "Couldn't get your location. You can still describe it in words above.",
        true
      );
    }
  );
});

function showLocationStatus(message, isError) {
  locationStatus.textContent = message;
  locationStatus.hidden = false;
  locationStatus.classList.toggle("is-error", isError);
}

// ---- Real submit flow: POST to the Express API ----
const errorBannerEl = document.getElementById("submit-error");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";
  errorBannerEl.hidden = true;

  const isAnonymous = identityValue.value === "anonymous";
  const payload = {
    category: form.querySelector('input[name="category"]:checked').value,
    severity: (form.querySelector('input[name="severity"]:checked') || {}).value || "medium",
    location: locationInput.value.trim(),
    description: descriptionInput.value.trim(),
    isAnonymous,
    reporterName: isAnonymous ? undefined : reporterNameInput.value.trim(),
    lat: latValue.value || undefined,
    lng: lngValue.value || undefined,
  };

  try {
    const headers = { "Content-Type": "application/json" };
    // Only identify ourselves for named reports; anonymous ones carry no token at all.
    const token = GWAuth.getToken();
    if (token && !isAnonymous) headers.Authorization = "Bearer " + token;

    const res = await fetch("https://community-policing.onrender.com/api/reports", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Could not submit report.");

    reportSection.hidden = true;
    successSection.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    errorBannerEl.textContent = "⚠️ " + err.message + " (Is the backend running? See /server/README.)";
    errorBannerEl.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit report";
  }
});

reportAnotherBtn.addEventListener("click", () => {
  form.reset();
  applySessionToForm(); // form.reset() clears the locked name field
  updateCategoryUI();
  updateSeverityUI();
  updateTextPreview();
  reportSection.hidden = false;
  successSection.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---- init ----
applySessionToForm();
updateCategoryUI();
updateSeverityUI();
updateTextPreview();