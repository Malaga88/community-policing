// ============================================================
// auth-page.js — login.html: log-in and create-account forms.
//   login.html                  -> log in tab
//   login.html?mode=register    -> create-account tab
//   login.html?next=report.html -> go there after success
// ============================================================
(function () {
  const params   = new URLSearchParams(window.location.search);
  const formsEl  = document.getElementById("auth-forms");
  const alreadyEl = document.getElementById("already-in");
  const errorEl  = document.getElementById("auth-error");

  const tabLogin    = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const loginForm   = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  // Only allow redirects to another page of this site (e.g. "report.html"),
  // never to an arbitrary URL passed in the query string.
  function safeNext() {
    const n = params.get("next") || "";
    return /^[a-z0-9_-]+\.html$/i.test(n) ? n : "index.html";
  }

  // ---- Already logged in ----
  const user = GWAuth.getUser();
  if (user) {
    formsEl.hidden = true;
    alreadyEl.hidden = false;
    document.getElementById("already-in-text").textContent =
      "You're signed in as " + user.fullName + " (" + user.email + ").";
    document.getElementById("already-logout").addEventListener("click", () => {
      GWAuth.logout();
      window.location.href = "login.html";
    });
    return;
  }

  // ---- Tabs ----
  function showTab(mode) {
    const isRegister = mode === "register";
    tabLogin.classList.toggle("is-active", !isRegister);
    tabRegister.classList.toggle("is-active", isRegister);
    tabLogin.setAttribute("aria-selected", String(!isRegister));
    tabRegister.setAttribute("aria-selected", String(isRegister));
    loginForm.hidden = isRegister;
    registerForm.hidden = !isRegister;
    errorEl.hidden = true;
    document.title = (isRegister ? "Create account" : "Log in") + " — GubiWatch";
  }
  tabLogin.addEventListener("click", () => showTab("login"));
  tabRegister.addEventListener("click", () => showTab("register"));
  document.getElementById("to-register").addEventListener("click", (e) => { e.preventDefault(); showTab("register"); });
  document.getElementById("to-login").addEventListener("click", (e) => { e.preventDefault(); showTab("login"); });
  showTab(params.get("mode") === "register" ? "register" : "login");

  // ---- Show / hide password ----
  document.querySelectorAll(".show-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      btn.textContent = reveal ? "Hide" : "Show";
      btn.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    });
  });

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    errorEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Runs the request with the submit button disabled, then redirects on success.
  async function submit(form, path, body) {
    const btn = form.querySelector('button[type="submit"]');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Please wait…";
    errorEl.hidden = true;
    try {
      const data = await GWAuth.request(path, body);
      GWAuth.save(data.token, data.user);
      window.location.href = safeNext();
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!loginForm.checkValidity()) { loginForm.reportValidity(); return; }
    submit(loginForm, "/login", {
      email: document.getElementById("login-email").value.trim(),
      password: document.getElementById("login-password").value,
    });
  });

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!registerForm.checkValidity()) { registerForm.reportValidity(); return; }

    const password = document.getElementById("reg-password").value;
    if (password !== document.getElementById("reg-confirm").value) {
      showError("The two passwords don't match.");
      return;
    }
    const matric = document.getElementById("reg-matric").value.trim();
    submit(registerForm, "/register", {
      fullName: document.getElementById("reg-name").value.trim(),
      email: document.getElementById("reg-email").value.trim(),
      password,
      matricNumber: matric || undefined,
    });
  });
})();
