(() => {
  const office = document.querySelector("[data-office]");
  const lock = document.querySelector("[data-lock]");
  const liste = document.querySelector("[data-anfragen]");
  const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
  const offen = window.BauRominia?.istBesitzer?.() === true;
  if (office) office.hidden = !offen;
  if (lock) lock.hidden = offen;
  if (!liste || !offen) return;

  const felder = [
    ["name", "Name"],
    ["telefon", "Telefon"],
    ["email", "E-Mail"],
    ["firma", "Firma"],
    ["firmaStandort", "Standort der Firma"],
    ["baustelleStandort", "Standort der Baustelle"],
    ["gewerk", "Gewerk"],
    ["personen", "Helfer"],
    ["vorarbeiter", "Vorarbeiter"],
    ["stunden", "Stunden pro Tag"],
    ["funktion", "Funktion"],
    ["start", "Start"],
    ["ende", "Ende"],
    ["schicht", "Schicht"],
    ["unterkunft", "Unterkunft"],
    ["wohnort", "Wohnort"],
    ["erfahrung", "Erfahrung in Jahren"],
    ["verfuegbar", "Verfügbar ab"],
    ["fuehrerschein", "Führerschein"],
    ["deutsch", "Deutsch"],
    ["nachricht", "Anmerkung"],
  ];

  let anfragen = [];
  try {
    const roh = JSON.parse(localStorage.getItem("bau-rominia-anfragen") || "[]");
    anfragen = Array.isArray(roh) ? roh : [];
  } catch {
    anfragen = [];
  }

  if (!anfragen.length) {
    const leer = document.createElement("p");
    leer.textContent = "Noch keine Anfrage in diesem Browser.";
    liste.append(leer);
    return;
  }

  anfragen
    .slice()
    .reverse()
    .forEach((eintrag) => {
      const karte = document.createElement("article");
      karte.className = "block anfrage-card";

      const kicker = document.createElement("p");
      kicker.className = "kicker";
      const wann = eintrag.zeit
        ? new Date(eintrag.zeit).toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      const art = eintrag.art === "fachkraft" ? "Fachkraft" : "Auftraggeber";
      kicker.textContent = wann ? `${art} · ${wann}` : art;

      const titel = document.createElement("h2");
      titel.textContent = eintrag.baustelle || eintrag.name || "Anfrage";

      const daten = document.createElement("dl");
      felder.forEach(([key, label]) => {
        const wert = eintrag[key];
        if (wert == null || String(wert).trim() === "") return;
        const block = document.createElement("div");
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        if (key === "unterkunft") dd.textContent = wert === "ja" ? "Ja" : wert === "nein" ? "Nein" : String(wert);
        else dd.textContent = String(wert);
        block.append(dt, dd);
        daten.append(block);
      });

      karte.append(kicker, titel, daten);
      const angebot = eintrag.angebot;
      if (angebot && typeof angebot === "object") {
        const box = document.createElement("section");
        box.className = "angebot-block";
        const kopf = document.createElement("h3");
        kopf.textContent = "Angebot";
        box.append(kopf);
        const wann = angebot.zeit
          ? new Date(angebot.zeit).toLocaleString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
        const meta = document.createElement("p");
        meta.textContent = [angebot.baustelle, angebot.gewerk, wann]
          .map((teil) => String(teil || "").trim())
          .filter(Boolean)
          .join(" · ");
        if (meta.textContent) box.append(meta);
        const positionen = Array.isArray(angebot.positionen) ? angebot.positionen : [];
        if (positionen.length) {
          const listePos = document.createElement("div");
          listePos.className = "angebot-liste";
          positionen.forEach((pos) => {
            const zeile = document.createElement("p");
            zeile.className = "angebot-zeile";
            const name = document.createElement("span");
            name.textContent = String(pos?.name || "");
            const menge = document.createElement("span");
            menge.textContent = String(pos?.menge || "");
            const betrag = document.createElement("span");
            const wert = Number(pos?.betrag);
            betrag.textContent = Number.isFinite(wert) ? euro.format(wert) : "";
            zeile.append(name, menge, betrag);
            listePos.append(zeile);
          });
          box.append(listePos);
        }
        const netto = document.createElement("p");
        netto.className = "angebot-netto";
        const summe = Number(angebot.netto);
        netto.textContent = Number.isFinite(summe) ? `Angebot netto ${euro.format(summe)}` : "";
        if (netto.textContent) box.append(netto);
        karte.append(box);
      }
      if (eintrag.art !== "fachkraft") {
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "btn btn-solid";
        knopf.textContent = "Als Vorlage in die Kalkulation";
        knopf.addEventListener("click", () => {
          sessionStorage.setItem("bau-rominia-aus-anfrage", JSON.stringify(eintrag));
          window.location.href = "kalkulation.html";
        });
        karte.append(knopf);
      }
      liste.append(karte);
    });
})();
