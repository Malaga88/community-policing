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

const previewCard     = document.getElementById("preview-card");
const previewBadge    = document.getElementById("preview-badge");
const previewBody     = document.getElementById("preview-body");
const previewLocation = document.getElementById("preview-location");
const previewIdentity = document.getElementById("preview-identity");

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
    location: locationInput.value.trim(),
    description: descriptionInput.value.trim(),
    isAnonymous,
    reporterName: isAnonymous ? undefined : reporterNameInput.value.trim(),
    lat: latValue.value || undefined,
    lng: lngValue.value || undefined,
  };

  try {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  updateCategoryUI();
  updateTextPreview();
  reportSection.hidden = false;
  successSection.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---- init ----
updateCategoryUI();
updateTextPreview();
