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
      [
        ["E-Mail", konto.email || ""],
        ["Rolle", rollen[konto.rolle] || "Auftraggeber"],
        ["Firma", konto.firma || "keine"],
        ["Konto seit", wann(konto.seit)],
        ["Anfragen", String(eigene.length)],
        ["Letzte Anfrage", eigene.length ? wann(letzte) : "keine"],
      ].forEach(([label, wert]) => {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = wert;
        dl.append(dt, dd);
      });
      card.append(title, dl);
      liste.append(card);
    });
})();
