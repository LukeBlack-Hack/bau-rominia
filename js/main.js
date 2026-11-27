const header = document.querySelector("[data-header]");
const toggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const form = document.querySelector("[data-form]");

const onScroll = () => {
  header?.classList.toggle("is-stuck", window.scrollY > 8);
};

onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

toggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "Schließen" : "Menü";
});

document.querySelectorAll(".auth-panel").forEach((panel) => {
  const tabs = [...panel.querySelectorAll("[data-auth-tab]")];
  const showAuth = (name) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.authTab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    panel.querySelectorAll("[data-auth-pane]").forEach((pane) => {
      pane.hidden = pane.dataset.authPane !== name;
    });
    const app = panel.querySelector("[data-app]");
    if (app) app.hidden = true;
    const schalter = panel.querySelector(".switch");
    if (schalter) schalter.hidden = false;
  };
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => showAuth(tab.dataset.authTab));
  });
});

document.querySelectorAll("[data-reset]").forEach((resetForm) => {
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = resetForm.querySelector("[data-status]");
    const show = (text, isError) => {
      status.textContent = text;
      status.classList.toggle("is-error", Boolean(isError));
    };
    if (!resetForm.checkValidity()) {
      resetForm.reportValidity();
      return;
    }
    const data = Object.fromEntries(new FormData(resetForm).entries());
    if (data.password !== data.password2) {
      show("Die beiden Passwörter sind nicht gleich.", true);
      return;
    }
    try {
      await window.BauRominia.resetPassword(data);
      resetForm.reset();
      show("Neues Passwort ist gespeichert. Du kannst dich jetzt anmelden.", false);
    } catch (error) {
      show(error.message, true);
    }
  });
});

nav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    nav.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
    if (toggle) toggle.textContent = "Menü";
  }
});

const artInput = form?.querySelector("[data-art]");
const tabs = form ? [...form.querySelectorAll("[data-tab]")] : [];
const gated = form ? [...form.querySelectorAll("[data-only]")] : [];

const setAudience = (art) => {
  if (!form) return;
  artInput.value = art;
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === art;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  gated.forEach((field) => {
    const show = field.dataset.only === art;
    field.hidden = !show;
    field.querySelectorAll("input, select, textarea").forEach((input) => {
      input.disabled = !show;
    });
  });
  const message = form.querySelector("[name='nachricht']");
  if (message) {
    message.placeholder =
      art === "fachkraft"
        ? "Gewünschte Baustellen, Führerschein, ab wann du kannst."
        : "Zugang, Werkzeug, Unterkunft, besondere Absprachen.";
  }
  const einsatz = form.querySelector("[data-einsatz]");
  const anmerkung = form.querySelector("[data-anmerkung]");
  if (einsatz) einsatz.textContent = art === "fachkraft" ? "02 Einsatz" : "04 Einsatz";
  if (anmerkung) anmerkung.textContent = art === "fachkraft" ? "03 Anmerkung" : "05 Anmerkung";
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setAudience(tab.dataset.tab));
});

document.querySelectorAll("[data-audience]").forEach((link) => {
  link.addEventListener("click", () => setAudience(link.dataset.audience));
});

const anfrageGate = document.querySelector("[data-anfrage-gate]");
const anfrageLogin = document.querySelector("[data-anfrage-login]");
const anfrageRegister = document.querySelector("[data-anfrage-register]");
const anfrageWer = document.querySelector("[data-anfrage-wer]");

const syncInquiry = (current) => {
  if (!form || !anfrageGate) return;
  const loggedIn = Boolean(current);
  anfrageGate.hidden = loggedIn;
  form.hidden = !loggedIn;
  if (!loggedIn) return;
  setAudience(current.rolle === "fachkraft" ? "fachkraft" : "auftrag");
  const name = form.querySelector("[name='name']");
  const email = form.querySelector("[name='email']");
  if (name) name.value = current.name;
  if (email) {
    email.value = current.email;
    email.readOnly = true;
  }
  if (anfrageWer) anfrageWer.textContent = `Angemeldet als ${current.name} · ${current.email}`;
};

const authStatus = (target, text, isError) => {
  const status = target.querySelector("[data-status]");
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("is-error", Boolean(isError));
};

anfrageRegister?.querySelectorAll("[data-anfrage-rolle]").forEach((input) => {
  input.addEventListener("change", () => {
    const firma = anfrageRegister.querySelector("[data-anfrage-firma]");
    const show = anfrageRegister.querySelector("[data-anfrage-rolle]:checked").value === "auftrag";
    firma.hidden = !show;
    firma.querySelector("input").disabled = !show;
  });
});

anfrageLogin?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!anfrageLogin.checkValidity()) {
    anfrageLogin.reportValidity();
    return;
  }
  try {
    const ergebnis = await window.BauRominia.login(Object.fromEntries(new FormData(anfrageLogin).entries()));
    await window.BauEinrichten.weiter(ergebnis, {
      panel: anfrageLogin.closest(".auth-panel"),
      status: (text, isError) => authStatus(anfrageLogin, text, isError),
      onFertig: (user) => {
        window.BauRominia.paintAccount();
        anfrageLogin.reset();
        const codeFeld = anfrageLogin.querySelector("[data-code-feld]");
        if (codeFeld) {
          codeFeld.hidden = true;
          codeFeld.querySelector("input").disabled = true;
        }
        authStatus(anfrageLogin, "", false);
        syncInquiry(user);
      },
    });
  } catch (error) {
    authStatus(anfrageLogin, error.message, true);
  }
});

anfrageRegister?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!anfrageRegister.checkValidity()) {
    anfrageRegister.reportValidity();
    return;
  }
  const data = Object.fromEntries(new FormData(anfrageRegister).entries());
  data.rolle = data.rolle === "fachkraft" ? "fachkraft" : "auftrag";
  if (data.password.length < 8) {
    authStatus(anfrageRegister, "Das Passwort braucht mindestens 8 Zeichen.", true);
    return;
  }
  if (data.password !== data.password2) {
    authStatus(anfrageRegister, "Die beiden Passwörter sind nicht gleich.", true);
    return;
  }
  try {
    const ergebnis = await window.BauRominia.register(data);
    await window.BauEinrichten.weiter(ergebnis, {
      panel: anfrageRegister.closest(".auth-panel"),
      status: (text, isError) => authStatus(anfrageRegister, text, isError),
      onFertig: (user) => {
        window.BauRominia.paintAccount();
        anfrageRegister.reset();
        authStatus(anfrageRegister, "", false);
        syncInquiry(user);
      },
    });
  } catch (error) {
    authStatus(anfrageRegister, error.message, true);
  }
});

syncInquiry(window.BauRominia?.session());

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const status = form.querySelector("[data-status]");
  const active = window.BauRominia?.session();
  if (!active) {
    syncInquiry(null);
    return;
  }
  if (!form.checkValidity()) {
    form.reportValidity();
    status.textContent = "Bitte die markierten Felder ausfüllen.";
    status.classList.add("is-error");
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  data.konto = active.email;
  data.email = active.email;
  const saved = JSON.parse(localStorage.getItem("bau-rominia-anfragen") || "[]");
  saved.push({ ...data, zeit: new Date().toISOString() });
  localStorage.setItem("bau-rominia-anfragen", JSON.stringify(saved));

  form.reset();
  syncInquiry(active);
  status.classList.remove("is-error");
  status.textContent = "Gemerkt. Die Anfrage liegt lokal in diesem Browser.";
});
