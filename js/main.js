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

const currentSession = window.BauRominia?.session();
if (currentSession && form) {
  setAudience(currentSession.rolle === "fachkraft" ? "fachkraft" : "auftrag");
  const name = form.querySelector("[name='name']");
  const email = form.querySelector("[name='email']");
  if (name && !name.value) name.value = currentSession.name;
  if (email && !email.value) email.value = currentSession.email;
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const status = form.querySelector("[data-status]");
  if (!form.checkValidity()) {
    form.reportValidity();
    status.textContent = "Bitte die markierten Felder ausfüllen.";
    status.classList.add("is-error");
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  const active = window.BauRominia?.session();
  if (active) data.konto = active.email;
  const saved = JSON.parse(localStorage.getItem("bau-rominia-anfragen") || "[]");
  saved.push({ ...data, zeit: new Date().toISOString() });
  localStorage.setItem("bau-rominia-anfragen", JSON.stringify(saved));

  form.reset();
  setAudience("auftrag");
  status.classList.remove("is-error");
  status.textContent = "Gemerkt. Die Anfrage liegt lokal in diesem Browser.";
});
