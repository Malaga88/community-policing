// ============================================================
// auth.js — shared login state for every page.
//
//  * Stores the JWT + basic user info in localStorage (wrapped in
//    try/catch, so private-browsing modes that block storage just
//    behave as "logged out").
//  * Treats an expired token as logged out (reads the `exp` claim).
//  * Adds a "Log in" link (or "Hi, <name> · Log out") to the nav.
//
// Load this BEFORE page scripts that need it (report.js, auth-page.js).
// ============================================================

// Same backend the dashboard and report form already talk to.
const GW_AUTH_API = "https://community-policing.onrender.com/api/auth";
const GW_AUTH_KEY = "gubiwatch_auth";

const GWAuth = (function () {
  function read() {
    try {
      const raw = localStorage.getItem(GW_AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clear() {
    try { localStorage.removeItem(GW_AUTH_KEY); } catch (e) { /* storage blocked */ }
  }

  function isExpired(token) {
    try {
      const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(b64));
      return !!payload.exp && payload.exp * 1000 <= Date.now();
    } catch (e) { return true; } // unreadable token: don't trust it
  }

  function session() {
    const s = read();
    if (!s || !s.token || !s.user) return null;
    if (isExpired(s.token)) { clear(); return null; }
    return s;
  }

  return {
    getUser()    { const s = session(); return s ? s.user : null; },
    getToken()   { const s = session(); return s ? s.token : null; },
    isLoggedIn() { return session() !== null; },

    save(token, user) {
      try { localStorage.setItem(GW_AUTH_KEY, JSON.stringify({ token, user })); } catch (e) { /* ignore */ }
    },

    logout() { clear(); },

    // POST to /api/auth/<path>; resolves with { token, user } or throws Error(message).
    async request(path, body) {
      let res;
      try {
        res = await fetch(GW_AUTH_API + path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (e) {
        throw new Error("Couldn't reach the GubiWatch server. Check your connection and try again.");
      }
      let data = {};
      try { data = await res.json(); } catch (e) { /* non-JSON error body */ }
      if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
      return data;
    },
  };
})();

// ---- Nav: show Log in / Log out on every page ----
(function renderNavAuth() {
  const list = document.querySelector(".nav-links");
  if (!list) return;

  const user = GWAuth.getUser();
  const li = document.createElement("li");
  li.className = "nav-auth";

  if (user) {
    const first = String(user.fullName || "").trim().split(/\s+/)[0] || "you";
    const hi = document.createElement("span");
    hi.className = "nav-user";
    hi.textContent = "Hi, " + first;
    const out = document.createElement("button");
    out.type = "button";
    out.className = "nav-logout";
    out.textContent = "Log out";
    out.addEventListener("click", () => { GWAuth.logout(); window.location.reload(); });
    li.append(hi, out);
  } else {
    const a = document.createElement("a");
    a.href = "login.html";
    a.textContent = "Log in";
    if (/login\.html$/.test(window.location.pathname)) a.className = "current";
    li.appendChild(a);
  }

  // sit just before the "Report an incident" button (the last item)
  list.insertBefore(li, list.lastElementChild);
})();
