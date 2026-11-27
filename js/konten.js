(() => {
  const office = document.querySelector("[data-office]");
  const lock = document.querySelector("[data-lock]");
  const liste = document.querySelector("[data-konten]");
  const offen = window.BauRominia?.istDev?.() === true;
  if (office) office.hidden = !offen;
  if (lock) lock.hidden = offen;
  if (!liste || !offen) return;

  const lesen = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]") ?? [];
    } catch {
      return [];
    }
  };

  const konten = lesen("bau-rominia-konten");
  const anfragen = lesen("bau-rominia-anfragen");
  const kalkulationen = lesen("bau-rominia-kalkulationen");
  const rollen = {
    auftrag: "Auftraggeber",
    fachkraft: "Fachkraft",
    besitzer: "Besitzer",
    dev: "Entwicklung",
  };
  const wann = (wert) => {
    if (!wert) return "kein Datum";
    const date = new Date(wert);
    if (Number.isNaN(date.getTime())) return "kein Datum";
    return date.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
  };

  const zahl = (menge, einer, viele) => (menge === 1 ? `1 ${einer}` : `${menge} ${viele}`);
  const kopf = document.querySelector("[data-ueberblick]");
  if (kopf) {
    kopf.textContent = `${zahl(konten.length, "Konto", "Konten")}, ${zahl(anfragen.length, "Anfrage", "Anfragen")}, ${zahl(kalkulationen.length, "gespeicherte Kalkulation", "gespeicherte Kalkulationen")} in diesem Browser.`;
  }

  if (!konten.length) {
    const leer = document.createElement("p");
    leer.textContent = "In diesem Browser hat sich noch niemand ein Konto angelegt.";
    liste.append(leer);
    return;
  }

  konten
    .slice()
    .reverse()
    .forEach((konto) => {
      const eigene = anfragen.filter(
        (eintrag) => eintrag.konto === konto.email || eintrag.email === konto.email
      );
      const letzte = eigene
        .map((eintrag) => eintrag.zeit)
        .filter(Boolean)
        .sort()
        .at(-1);
      const card = document.createElement("article");
      card.className = "block anfrage-card";
      const title = document.createElement("h2");
      title.textContent = konto.name || "Ohne Name";
      const dl = document.createElement("dl");
      const feld = (label, inhalt) => {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        if (typeof inhalt === "string") dd.textContent = inhalt;
        else dd.append(inhalt);
        dl.append(dt, dd);
      };
      const mail = document.createElement("div");
      mail.className = "mail-zeile";
      const mailText = document.createElement("span");
      mailText.textContent = konto.email || "";
      const hilfe = document.createElement("button");
      hilfe.type = "button";
      hilfe.className = "btn btn-line";
      hilfe.textContent = "Hilfe";
      mail.append(mailText, hilfe);
      feld("E-Mail", mail);
      feld("Rolle", rollen[konto.rolle] || "Auftraggeber");
      feld("Firma", konto.firma || "keine");
      feld("Konto seit", wann(konto.seit));
      feld("Anfragen", String(eigene.length));
      feld("Letzte Anfrage", eigene.length ? wann(letzte) : "keine");

      const form = document.createElement("form");
      form.className = "hilfe-form";
      form.hidden = true;
      form.noValidate = true;
      const passwortFeld = (name, label) => {
        const wrap = document.createElement("label");
        wrap.append(document.createTextNode(label));
        const input = document.createElement("input");
        input.name = name;
        input.type = "password";
        input.required = true;
        input.minLength = 8;
        input.autocomplete = "new-password";
        wrap.append(input);
        return wrap;
      };
      const status = document.createElement("p");
      status.className = "form-status";
      status.setAttribute("role", "status");
      const speichern = document.createElement("button");
      speichern.className = "btn btn-solid";
      speichern.type = "submit";
      speichern.textContent = "Passwort speichern";
      const codeWrap = document.createElement("label");
      codeWrap.append(document.createTextNode("Code aus der App dieses Kontos"));
      const codeInput = document.createElement("input");
      codeInput.name = "code";
      codeInput.required = true;
      codeInput.autocomplete = "one-time-code";
      codeWrap.append(codeInput);
      form.append(
        codeWrap,
        passwortFeld("password", "Neues Passwort"),
        passwortFeld("password2", "Passwort wiederholen"),
        speichern,
        status
      );
      const oeffnen = () => {
        form.hidden = false;
        form.querySelector("input")?.focus();
      };
      hilfe.addEventListener("click", oeffnen);
      const resetKnopf = document.createElement("button");
      resetKnopf.type = "button";
      resetKnopf.className = "btn btn-solid";
      resetKnopf.textContent = "Passwort zurücksetzen";
      resetKnopf.addEventListener("click", oeffnen);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        if (data.password !== data.password2) {
          status.textContent = "Die beiden Passwörter sind nicht gleich.";
          status.classList.add("is-error");
          return;
        }
        try {
          await window.BauRominia.passwortSetzen({
            email: konto.email,
            password: data.password,
            code: data.code,
          });
          form.reset();
          status.textContent = "Neues Passwort ist gespeichert. Der Code aus der App hat gepasst.";
          status.classList.remove("is-error");
        } catch (error) {
          status.textContent = error.message;
          status.classList.add("is-error");
        }
      });
      card.append(title, dl, resetKnopf, form);
      liste.append(card);
    });
})();
