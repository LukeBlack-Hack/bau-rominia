const auth = window.BauRominia;
const gateOut = document.querySelector("[data-gate='out']");
const gateIn = document.querySelector("[data-gate='in']");
const loginForm = document.querySelector("[data-login]");
const registerForm = document.querySelector("[data-register]");

const setStatus = (form, text, isError) => {
  const status = form.querySelector("[data-status]");
  status.textContent = text;
  status.classList.toggle("is-error", Boolean(isError));
};

const showSession = () => {
  const current = auth.session();
  const loggedIn = Boolean(current);
  gateOut.hidden = loggedIn;
  gateIn.hidden = !loggedIn;
  if (!loggedIn) return;

  gateIn.querySelector("[data-hello]").textContent = current.name;
  const rollen = {
    fachkraft: "Fachkraft",
    besitzer: "Besitzer",
    dev: "Entwicklung",
    auftrag: "Auftraggeber",
  };
  const rolle = rollen[current.rolle] || "Auftraggeber";
  const intern = current.rolle === "besitzer" || current.rolle === "dev";
  gateIn.querySelector("[data-anfragen-titel]").textContent = intern
    ? "Anfragen mit diesem Konto"
    : "Deine Anfragen";
  const firma = current.firma ? ` · ${current.firma}` : "";
  gateIn.querySelector("[data-role]").textContent = `${rolle}${firma} · ${current.email}`;

  const list = gateIn.querySelector("[data-own]");
  const anfragen = JSON.parse(localStorage.getItem("bau-rominia-anfragen") || "[]").filter(
    (entry) => entry.konto === current.email || entry.email === current.email
  );
  list.replaceChildren();
  if (!anfragen.length) {
    const empty = document.createElement("li");
    empty.textContent = "Noch keine Anfrage mit diesem Konto.";
    list.append(empty);
    return;
  }
  anfragen
    .slice()
    .reverse()
    .forEach((entry) => {
      const item = document.createElement("li");
      const when = new Date(entry.zeit).toLocaleString("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const place = entry.baustelle || entry.wohnort || "ohne Ort";
      const people = entry.personen ? ` · ${entry.personen} Personen` : "";
      item.textContent = `${when} · ${entry.gewerk || "Gewerk offen"} · ${place}${people}`;
      list.append(item);
    });
};

registerForm.querySelectorAll("[data-rolle]").forEach((input) => {
  input.addEventListener("change", () => {
    const firma = registerForm.querySelector("[data-firma]");
    const show = registerForm.querySelector("[data-rolle]:checked").value === "auftrag";
    firma.hidden = !show;
    firma.querySelector("input").disabled = !show;
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!loginForm.checkValidity()) {
    loginForm.reportValidity();
    return;
  }
  const data = Object.fromEntries(new FormData(loginForm).entries());
  try {
    await auth.login(data);
    auth.paintAccount();
    loginForm.reset();
    setStatus(loginForm, "", false);
    showSession();
  } catch (error) {
    setStatus(loginForm, error.message, true);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!registerForm.checkValidity()) {
    registerForm.reportValidity();
    return;
  }
  const data = Object.fromEntries(new FormData(registerForm).entries());
  data.rolle = data.rolle === "fachkraft" ? "fachkraft" : "auftrag";
  if (data.password.length < 6) {
    setStatus(registerForm, "Das Passwort braucht mindestens 6 Zeichen.", true);
    return;
  }
  if (data.password !== data.password2) {
    setStatus(registerForm, "Die beiden Passwörter sind nicht gleich.", true);
    return;
  }
  try {
    await auth.register(data);
    auth.paintAccount();
    registerForm.reset();
    setStatus(registerForm, "", false);
    showSession();
  } catch (error) {
    setStatus(registerForm, error.message, true);
  }
});

gateIn.querySelector("[data-logout]").addEventListener("click", () => {
  auth.logout();
  showSession();
});

const besitzerForm = document.querySelector("[data-besitzer]");
const besitzerBox = document.querySelector("#besitzer");
if (besitzerBox && location.hash === "#besitzer") {
  besitzerBox.open = true;
}

besitzerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!besitzerForm.checkValidity()) {
    besitzerForm.reportValidity();
    return;
  }
  const data = Object.fromEntries(new FormData(besitzerForm).entries());
  if (data.password.length < 6) {
    setStatus(besitzerForm, "Das Passwort braucht mindestens 6 Zeichen.", true);
    return;
  }
  if (data.password !== data.password2) {
    setStatus(besitzerForm, "Die beiden Passwörter sind nicht gleich.", true);
    return;
  }
  try {
    await auth.register({ ...data, rolle: "besitzer", firma: "" });
    auth.paintAccount();
    besitzerForm.reset();
    setStatus(besitzerForm, "", false);
    showSession();
  } catch (error) {
    setStatus(besitzerForm, error.message, true);
  }
});

showSession();
